/**
 * APP-ZUSTAND
 * ===========
 * Beim Start werden alle Daten einmal aus der Datenbank in den
 * Arbeitsspeicher geladen. Danach liest die Oberfläche nur noch von hier –
 * das ist sehr schnell.
 *
 * Jede Änderung läuft über `commit()`:
 *   1. Der Zustand im Arbeitsspeicher wird sofort aktualisiert
 *      (die Oberfläche zeichnet sich neu).
 *   2. Die geänderten Einträge werden im Hintergrund gespeichert.
 *   3. Andere offene Fenster erfahren davon (windowSync.ts) und übernehmen sie mit
 *      `applyExternal()` – nur, was dort nicht schon neuer ist.
 *
 * React-Komponenten lesen den Zustand mit `useAppSelector()` (nur ihren Ausschnitt) oder
 * `useAppState()` (alles).
 */

import { useRef, useSyncExternalStore } from 'react'
import { DEFAULT_SETTINGS } from '../config/defaults'
import * as database from '../db/database'
import { baseFields } from '../logic/records'
import type {
  Block,
  Day,
  ID,
  LocalState,
  Note,
  Settings,
  Step,
  Task,
  TimerState,
} from '../model/types'

export interface AppState {
  days: Record<ID, Day>
  tasks: Record<ID, Task>
  steps: Record<ID, Step>
  blocks: Record<ID, Block>
  settings: Settings
  note: Note
  timer: TimerState
  local: LocalState
}

/** Eine Sammlung geänderter oder neuer Einträge. */
export interface Changes {
  days?: Day[]
  tasks?: Task[]
  steps?: Step[]
  blocks?: Block[]
  settings?: Settings
  note?: Note
  timer?: TimerState
  local?: LocalState
}

let state: AppState | null = null
const listeners = new Set<() => void>()

/** Liefert den aktuellen Zustand (nur nach `initStore()` verfügbar). */
export function getState(): AppState {
  if (!state) throw new Error('Store ist noch nicht geladen.')
  return state
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * React-Hook: gibt den ganzen Zustand zurück und zeichnet bei JEDER Änderung neu.
 * Für Stellen, die oft neu zeichnen würden, lieber `useAppSelector`.
 */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

/**
 * React-Hook: liest nur einen Ausschnitt des Zustands. Die Komponente zeichnet nur neu, wenn sich
 * IHR Ausschnitt ändert (verglichen mit `equal`) – nicht bei jeder Änderung irgendwo in der App.
 * Liefert `select` jedes Mal ein neues Objekt oder eine neue Liste, `shallowEqual` mitgeben.
 */
export function useAppSelector<T>(select: (s: AppState) => T, equal: (a: T, b: T) => boolean = Object.is): T {
  const last = useRef<{ value: T } | null>(null)
  return useSyncExternalStore(subscribe, () => {
    const next = select(getState())
    if (last.current && equal(last.current.value, next)) return last.current.value
    last.current = { value: next }
    return next
  })
}

/** Gleich, wenn beide Listen (oder Objekte) dieselben Einträge haben – Eintrag für Eintrag mit `Object.is`. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  return keysA.every((key) => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}

/** Auch außerhalb von React auf Änderungen reagieren (z. B. für den Timer-Takt). */
export function subscribeToStore(listener: () => void): () => void {
  return subscribe(listener)
}

function indexById<T extends { id: ID }>(records: T[]): Record<ID, T> {
  return Object.fromEntries(records.map((r) => [r.id, r]))
}

function mergeRecords<T extends { id: ID }>(current: Record<ID, T>, changed?: T[]): Record<ID, T> {
  if (!changed || changed.length === 0) return current
  const next = { ...current }
  for (const record of changed) next[record.id] = record
  return next
}

/**
 * Ist zuletzt etwas nicht gespeichert worden (auch nach dem zweiten Versuch)? Dann zeigt die App
 * einen leisen Hinweis mit „Jetzt sichern“ (App.tsx) – damit nichts unbemerkt verloren geht.
 */
let saveFailedAt: number | null = null
const saveErrorListeners = new Set<() => void>()

function reportSaveError(error: unknown) {
  console.error('Speichern fehlgeschlagen:', error)
  saveFailedAt = Date.now()
  saveErrorListeners.forEach((l) => l())
}

/** React-Hook: Zeitpunkt des letzten fehlgeschlagenen Speicherns – oder `null`. */
export function useSaveFailedAt(): number | null {
  return useSyncExternalStore(
    (listener) => {
      saveErrorListeners.add(listener)
      return () => saveErrorListeners.delete(listener)
    },
    () => saveFailedAt,
  )
}

/**
 * Wer außerhalb dieses Fensters davon erfahren soll (windowSync.ts: die anderen offenen Fenster;
 * später der Abgleich zwischen Mac und iPhone).
 */
export type StoreEvent = { type: 'changes'; changes: Changes } | { type: 'reload' }
const outsideListeners = new Set<(event: StoreEvent) => void>()

export function subscribeToCommits(listener: (event: StoreEvent) => void): () => void {
  outsideListeners.add(listener)
  return () => outsideListeners.delete(listener)
}

/**
 * Übernimmt Änderungen in den Zustand, speichert sie und sagt sie weiter.
 * `updatedAt` wird automatisch gesetzt.
 */
export function commit(changes: Changes): void {
  const stamped = stamp(changes, Date.now())
  apply(stamped)
  save(stamped)
  outsideListeners.forEach((l) => l({ type: 'changes', changes: stamped }))
}

/**
 * Änderungen von außen (ein anderes Fenster, später der Abgleich): Ein Eintrag wird nur
 * übernommen, wenn er neuer ist als der hier bekannte (`updatedAt`). Gespeichert wird nicht noch
 * einmal – das hat das andere Fenster schon getan. Timer und Gerätewerte gelten für das ganze
 * Gerät und werden immer übernommen.
 */
export function applyExternal(changes: Changes): void {
  const current = getState()
  const newer = <T extends { id: ID; updatedAt: number }>(table: Record<ID, T>, records?: T[]) => {
    const kept = records?.filter((r) => r.updatedAt > (table[r.id]?.updatedAt ?? -Infinity))
    return kept && kept.length > 0 ? kept : undefined
  }
  const isNewer = <T extends { updatedAt: number }>(mine: T, theirs?: T) =>
    theirs && theirs.updatedAt > mine.updatedAt ? theirs : undefined
  const accepted: Changes = {
    days: newer(current.days, changes.days),
    tasks: newer(current.tasks, changes.tasks),
    steps: newer(current.steps, changes.steps),
    blocks: newer(current.blocks, changes.blocks),
    settings: isNewer(current.settings, changes.settings),
    note: isNewer(current.note, changes.note),
    timer: changes.timer,
    local: changes.local,
  }
  if (Object.values(accepted).some((value) => value !== undefined)) apply(accepted)
}

/** Setzt bei allen geänderten Einträgen `updatedAt` (Timer und Gerätewerte haben keins). */
function stamp(changes: Changes, now: number): Changes {
  const touch = <T extends { updatedAt: number }>(r: T): T => ({ ...r, updatedAt: now })
  return {
    days: changes.days?.map(touch),
    tasks: changes.tasks?.map(touch),
    steps: changes.steps?.map(touch),
    blocks: changes.blocks?.map(touch),
    settings: changes.settings && touch(changes.settings),
    note: changes.note && touch(changes.note),
    timer: changes.timer,
    local: changes.local,
  }
}

/** Ersetzt den Zustand im Arbeitsspeicher – die Oberfläche zeichnet sich neu. */
function apply(changes: Changes): void {
  const current = getState()
  state = {
    days: mergeRecords(current.days, changes.days),
    tasks: mergeRecords(current.tasks, changes.tasks),
    steps: mergeRecords(current.steps, changes.steps),
    blocks: mergeRecords(current.blocks, changes.blocks),
    settings: changes.settings ?? current.settings,
    note: changes.note ?? current.note,
    timer: changes.timer ?? current.timer,
    local: changes.local ?? current.local,
  }
  listeners.forEach((l) => l())
}

/**
 * Speichert die Änderungen im Hintergrund (IndexedDB): eine Änderung = ein Speichervorgang über
 * alle betroffenen Tabellen, strikt der Reihe nach. So kann ein später zweiter Versuch nie eine
 * neuere Änderung mit einer älteren überschreiben.
 */
function save(changes: Changes): void {
  const { days, tasks, steps, blocks, settings, note, timer, local } = changes
  const stored: database.StoredChanges = {
    tables: { days, tasks, steps, blocks, settings: settings && [settings], notes: note && [note] },
    timer,
    local,
  }
  pendingSaves = pendingSaves.then(() => database.putChanges(stored)).catch(reportSaveError)
}

let pendingSaves: Promise<void> = Promise.resolve()

/** Wartet, bis alle Speichervorgänge abgeschlossen sind (z. B. vor dem Sichern). */
export function flushSaves(): Promise<void> {
  return pendingSaves
}

let initPromise: Promise<void> | null = null
// Allererster Start auf diesem Gerät (noch gar keine Daten) – für die Beispielaufgabe.
let firstStart = false

/**
 * Lädt alle Daten aus der Datenbank. Beim allerersten Start werden
 * Einstellungen, Notizzettel und die Tage „heute“ und „morgen“ angelegt.
 * Mehrfache Aufrufe laden nur einmal.
 * Klappt das Laden nicht (iPhone: „Connection to Indexed Database server lost“), wird die
 * Verbindung neu geöffnet und ein zweites Mal geladen. Scheitert auch das, lehnt das Versprechen
 * ab (App.tsx zeigt dann „Neu laden“) – ein späterer Aufruf versucht es wieder von vorn.
 */
export function initStore(): Promise<void> {
  if (!initPromise) {
    const loading = loadFromDatabase().catch((error: unknown) => {
      console.warn('Laden fehlgeschlagen, zweiter Versuch:', error)
      database.forgetConnection()
      return loadFromDatabase()
    })
    loading.catch(() => {
      if (initPromise === loading) initPromise = null
    })
    initPromise = loading
  }
  return initPromise
}

/**
 * Liest (erneut) alles aus der Datenbank – z. B. nach dem Wiederherstellen. Die anderen offenen
 * Fenster lesen dann ebenfalls neu (außer `fromOutside`: Das Neuladen kam selbst von dort).
 */
export async function reloadStore({ fromOutside = false }: { fromOutside?: boolean } = {}): Promise<void> {
  await pendingSaves
  initPromise = loadFromDatabase()
  await initPromise
  if (!fromOutside) outsideListeners.forEach((l) => l({ type: 'reload' }))
}

async function loadFromDatabase(): Promise<void> {
  const data = await database.loadAll()
  const now = Date.now()

  state = {
    days: indexById(data.days),
    // Ältere Aufgaben kennen Startsignal und erste Schätzung noch nicht → `null` ergänzen.
    tasks: indexById(data.tasks.map((t) => ({ ...t, startCue: t.startCue ?? null, firstEstimatedBlocks: t.firstEstimatedBlocks ?? null }))),
    steps: indexById(data.steps),
    blocks: indexById(data.blocks),
    // Standardwerte zuerst: So bekommen ältere Daten neue Einstellungen (z. B. „Farbwelt“) automatisch.
    settings: data.settings[0]
      ? { ...DEFAULT_SETTINGS, ...data.settings[0] }
      : { ...baseFields(now), id: 'settings', ...DEFAULT_SETTINGS },
    note: data.notes[0] ?? { ...baseFields(now), id: 'note', text: '' },
    // Ältere Daten: ein Ruhezustand mit „ultra“ (Piepen nach dem letzten Block, gibt es nicht mehr) → schlicht ruhen.
    timer: !data.timer || data.timer.phase === 'idle' ? { phase: 'idle' } : data.timer,
    local: data.local ?? {},
  }

  firstStart = data.settings.length === 0 && data.tasks.length === 0

  const created: Changes = {}
  if (data.settings.length === 0) created.settings = state.settings
  if (data.notes.length === 0) created.note = state.note
  const missingDays = ensureActiveAndPlannedDay(Object.values(state.days), now)
  if (missingDays.length > 0) created.days = missingDays
  if (Object.keys(created).length > 0) commit(created)
  else listeners.forEach((l) => l())
}

/**
 * War das gerade der allererste Start (noch gar keine Daten)? Antwortet nur einmal mit `true` –
 * so kommt die Beispielaufgabe genau einmal, auch wenn danach neu geladen wird.
 */
export function takeFirstStart(): boolean {
  const result = firstStart
  firstStart = false
  return result
}

/**
 * Stellt sicher, dass es genau einen aktiven und einen geplanten Tag gibt.
 * Gibt die neu anzulegenden Tage zurück.
 */
function ensureActiveAndPlannedDay(days: Day[], now: number): Day[] {
  const alive = days.filter((d) => d.deletedAt === null)
  const created: Day[] = []
  if (!alive.some((d) => d.status === 'active')) {
    created.push({ ...baseFields(now), status: 'active', startedAt: now, endedAt: null, firstWorkAt: null })
  }
  if (!alive.some((d) => d.status === 'planned')) {
    created.push({ ...baseFields(now), status: 'planned', startedAt: null, endedAt: null, firstWorkAt: null })
  }
  return created
}

/** Nur für automatische Tests: Zustand zurücksetzen. */
export function resetStoreForTests(): void {
  state = null
  initPromise = null
  firstStart = false
  listeners.clear()
  outsideListeners.clear()
  pendingSaves = Promise.resolve()
  saveFailedAt = null
}
