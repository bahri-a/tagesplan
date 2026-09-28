/**
 * SPEICHER (IndexedDB)
 * ====================
 * Alle Daten liegen nur lokal in Chrome, in der Datenbank „IndexedDB“.
 * Diese Datei ist die einzige Stelle, die direkt mit der Datenbank spricht.
 * Wir nutzen dafür die winzige Bibliothek `idb`, die IndexedDB bequemer macht.
 *
 * Wenn sich das Datenmodell später ändert: DB_VERSION erhöhen und im
 * `upgrade`-Teil die Änderung beschreiben.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { settingsToV2, taskToV2 } from '../logic/migrations'
import type {
  Block,
  Day,
  LocalState,
  Note,
  Settings,
  Step,
  Task,
  TimerState,
} from '../model/types'

const DB_NAME = 'tagesplan'
const DB_VERSION = 2

/** Die Tabellen, die später synchronisiert werden könnten (und gesichert werden). */
export interface Tables {
  days: Day[]
  tasks: Task[]
  steps: Step[]
  blocks: Block[]
  settings: Settings[]
  notes: Note[]
}

export type TableName = keyof Tables

export const TABLE_NAMES: TableName[] = ['days', 'tasks', 'steps', 'blocks', 'settings', 'notes']

/** Alles, was beim Start geladen wird. */
export interface StoredData extends Tables {
  timer: TimerState | undefined
  local: LocalState | undefined
}

interface TagesplanDB extends DBSchema {
  days: { key: string; value: Day }
  tasks: { key: string; value: Task }
  steps: { key: string; value: Step }
  blocks: { key: string; value: Block }
  settings: { key: string; value: Settings }
  notes: { key: string; value: Note }
  /** Nur für dieses Gerät: Timer-Zustand und Kleinkram. */
  local: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<TagesplanDB>> | null = null

function db(): Promise<IDBPDatabase<TagesplanDB>> {
  dbPromise ??= openDB<TagesplanDB>(DB_NAME, DB_VERSION, {
    async upgrade(database, oldVersion, _newVersion, transaction) {
      // Version 1: alle Tabellen anlegen.
      if (oldVersion < 1) {
        for (const name of TABLE_NAMES) {
          database.createObjectStore(name, { keyPath: 'id' })
        }
        database.createObjectStore('local')
      }
      // Version 2: kurze Pause pro Aufgabe; neue Standardwerte 25/7 statt 15/5.
      // (Nur nötig, wenn schon Daten von Version 1 da sind.)
      if (oldVersion >= 1 && oldVersion < 2) {
        const now = Date.now()
        const tasks = transaction.objectStore('tasks')
        for (const task of await tasks.getAll()) await tasks.put(taskToV2(task))
        const settings = transaction.objectStore('settings')
        for (const s of await settings.getAll()) await settings.put(settingsToV2(s, now))
      }
      // Spätere Versionen: hier `if (oldVersion < 3) { … }` ergänzen.
    },
  })
  return dbPromise
}

/** Lädt alle Daten auf einmal (sie sind klein genug für den Arbeitsspeicher). */
export async function loadAll(): Promise<StoredData> {
  const database = await db()
  const [days, tasks, steps, blocks, settings, notes, timer, local] = await Promise.all([
    database.getAll('days'),
    database.getAll('tasks'),
    database.getAll('steps'),
    database.getAll('blocks'),
    database.getAll('settings'),
    database.getAll('notes'),
    database.get('local', 'timer') as Promise<TimerState | undefined>,
    database.get('local', 'local') as Promise<LocalState | undefined>,
  ])
  return { days, tasks, steps, blocks, settings, notes, timer, local }
}

/** Speichert (neue oder geänderte) Einträge in einer Tabelle. */
export async function putRecords<N extends TableName>(name: N, records: Tables[N]): Promise<void> {
  if (records.length === 0) return
  const database = await db()
  const tx = database.transaction(name, 'readwrite')
  // `as never`: TypeScript kann die Zuordnung Tabelle ↔ Typ hier nicht selbst herleiten.
  await Promise.all([...records.map((r) => tx.store.put(r as never)), tx.done])
}

/** Speichert den Timer-Zustand. */
export async function putTimer(timer: TimerState): Promise<void> {
  await (await db()).put('local', timer, 'timer')
}

/** Speichert die gerätebezogenen Werte. */
export async function putLocal(local: LocalState): Promise<void> {
  await (await db()).put('local', local, 'local')
}

/** Ersetzt ALLE Daten (für „Wiederherstellen“). */
export async function replaceAll(tables: Tables): Promise<void> {
  const database = await db()
  const tx = database.transaction([...TABLE_NAMES, 'local'], 'readwrite')
  for (const name of TABLE_NAMES) {
    const store = tx.objectStore(name)
    await store.clear()
    for (const record of tables[name]) await store.put(record as never)
  }
  await tx.objectStore('local').put({ phase: 'idle' } satisfies TimerState, 'timer')
  await tx.done
}

/** Nur für automatische Tests: Verbindung vergessen (für eine frische Datenbank). */
export function resetDatabaseForTests(): void {
  dbPromise = null
}

/**
 * Bittet Chrome, die Daten dauerhaft zu behalten (sonst dürfte Chrome sie
 * bei Speichermangel löschen). Gibt zurück, ob das geklappt hat.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
