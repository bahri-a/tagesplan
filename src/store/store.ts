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
 *
 * React-Komponenten lesen den Zustand mit dem Hook `useAppState()`.
 */

import { useSyncExternalStore } from 'react'
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

/** React-Hook: gibt den aktuellen Zustand zurück und zeichnet bei Änderungen neu. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
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

/** Merkt sich fehlgeschlagene Speichervorgänge (sollte praktisch nie passieren). */
function reportSaveError(error: unknown) {
  console.error('Speichern fehlgeschlagen:', error)
}

/**
 * Übernimmt Änderungen in den Zustand und speichert sie.
 * `updatedAt` wird automatisch gesetzt.
 */
export function commit(changes: Changes): void {
  const current = getState()
  const now = Date.now()
  const stamp = <T extends { updatedAt: number }>(r: T): T => ({ ...r, updatedAt: now })

  const days = changes.days?.map(stamp)
  const tasks = changes.tasks?.map(stamp)
  const steps = changes.steps?.map(stamp)
  const blocks = changes.blocks?.map(stamp)
  const settings = changes.settings && stamp(changes.settings)
  const note = changes.note && stamp(changes.note)

  state = {
    days: mergeRecords(current.days, days),
    tasks: mergeRecords(current.tasks, tasks),
    steps: mergeRecords(current.steps, steps),
    blocks: mergeRecords(current.blocks, blocks),
    settings: settings ?? current.settings,
    note: note ?? current.note,
    timer: changes.timer ?? current.timer,
    local: changes.local ?? current.local,
  }
  listeners.forEach((l) => l())

  // Im Hintergrund speichern.
  const saves: Promise<void>[] = []
  if (days) saves.push(database.putRecords('days', days))
  if (tasks) saves.push(database.putRecords('tasks', tasks))
  if (steps) saves.push(database.putRecords('steps', steps))
  if (blocks) saves.push(database.putRecords('blocks', blocks))
  if (settings) saves.push(database.putRecords('settings', [settings]))
  if (note) saves.push(database.putRecords('notes', [note]))
  if (changes.timer) saves.push(database.putTimer(changes.timer))
  if (changes.local) saves.push(database.putLocal(changes.local))
  pendingSaves = Promise.all([pendingSaves, ...saves]).then(() => undefined, reportSaveError)
}

let pendingSaves: Promise<void> = Promise.resolve()

/** Wartet, bis alle Speichervorgänge abgeschlossen sind (z. B. vor dem Sichern). */
export function flushSaves(): Promise<void> {
  return pendingSaves
}

let initPromise: Promise<void> | null = null

/**
 * Lädt alle Daten aus der Datenbank. Beim allerersten Start werden
 * Einstellungen, Notizzettel und die Tage „heute“ und „morgen“ angelegt.
 * Mehrfache Aufrufe laden nur einmal.
 */
export function initStore(): Promise<void> {
  initPromise ??= loadFromDatabase()
  return initPromise
}

/** Liest (erneut) alles aus der Datenbank – z. B. nach dem Wiederherstellen. */
export async function reloadStore(): Promise<void> {
  await pendingSaves
  initPromise = loadFromDatabase()
  await initPromise
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
    // Standardwerte zuerst: So bekommen ältere Daten neue Einstellungen (z. B. „Flächen“) automatisch.
    settings: data.settings[0]
      ? { ...DEFAULT_SETTINGS, ...data.settings[0] }
      : { ...baseFields(now), id: 'settings', ...DEFAULT_SETTINGS },
    note: data.notes[0] ?? { ...baseFields(now), id: 'note', text: '' },
    timer: data.timer ?? { phase: 'idle' },
    local: data.local ?? { endDayPromptDismissedOn: null },
  }

  const firstStart: Changes = {}
  if (data.settings.length === 0) firstStart.settings = state.settings
  if (data.notes.length === 0) firstStart.note = state.note
  const missingDays = ensureActiveAndPlannedDay(Object.values(state.days), now)
  if (missingDays.length > 0) firstStart.days = missingDays
  if (Object.keys(firstStart).length > 0) commit(firstStart)
  else listeners.forEach((l) => l())
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
  listeners.clear()
  pendingSaves = Promise.resolve()
}
