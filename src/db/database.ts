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

/** Verbindung vergessen – beim nächsten Zugriff wird sie neu geöffnet. */
export function forgetConnection(): void {
  dbPromise = null
}

function db(): Promise<IDBPDatabase<TagesplanDB>> {
  dbPromise ??= openDB<TagesplanDB>(DB_NAME, DB_VERSION, {
    // Eine neuere Version der App (z. B. in einem anderen Fenster) braucht die Datenbank:
    // Verbindung freigeben, beim nächsten Speichern wird neu geöffnet.
    blocking(_current, _blocked, event) {
      ;(event.target as IDBDatabase).close()
      forgetConnection()
    },
    // Safari/iPhone kappt die Verbindung manchmal im Hintergrund – dann neu öffnen.
    terminated: forgetConnection,
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
  // Klappt schon das Öffnen nicht, beim nächsten Mal neu versuchen (statt für immer zu scheitern).
  dbPromise.catch(forgetConnection)
  return dbPromise
}

/**
 * Speichern mit einem zweiten Versuch: Scheitert der erste (Verbindung gekappt, Fenster lag lange
 * im Hintergrund …), wird die Verbindung neu geöffnet und noch einmal gespeichert.
 */
async function withRetry(write: (database: IDBPDatabase<TagesplanDB>) => Promise<unknown>): Promise<void> {
  try {
    await write(await db())
  } catch {
    forgetConnection()
    await write(await db())
  }
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

/** Eine Änderung für die Datenbank: neue oder geänderte Einträge je Tabelle, dazu Timer und Gerätewerte. */
export interface StoredChanges {
  tables: Partial<Tables>
  timer?: TimerState
  local?: LocalState
}

/**
 * Speichert eine ganze Änderung in EINER Transaktion über alle betroffenen Tabellen: Entweder
 * kommt alles an oder nichts (z. B. „Tag abschließen“: neuer Tag aktiv UND Aufgaben dort).
 * Scheitert ein Eintrag, bleibt die Datenbank, wie sie war – der zweite Versuch schreibt alles neu.
 */
export async function putChanges({ tables, timer, local }: StoredChanges): Promise<void> {
  const names = TABLE_NAMES.filter((name) => (tables[name]?.length ?? 0) > 0)
  const touchesLocal = timer !== undefined || local !== undefined
  if (names.length === 0 && !touchesLocal) return
  const stores = touchesLocal ? [...names, 'local' as const] : names
  await withRetry(async (database) => {
    const tx = database.transaction(stores, 'readwrite')
    const writes: Promise<unknown>[] = []
    try {
      for (const name of names) {
        const store = tx.objectStore(name)
        // `as never`: TypeScript kann die Zuordnung Tabelle ↔ Typ hier nicht selbst herleiten.
        for (const record of tables[name]!) writes.push(store.put(record as never))
      }
      if (timer) writes.push(tx.objectStore('local').put(timer, 'timer'))
      if (local) writes.push(tx.objectStore('local').put(local, 'local'))
    } catch (error) {
      // Ein Eintrag ließ sich gar nicht erst schreiben: die schon geschriebenen auch nicht behalten.
      for (const write of [...writes, tx.done]) write.catch(() => undefined) // brechen jetzt alle ab
      tx.abort()
      throw error
    }
    // Scheitert ein put später, bricht die Transaktion ab und tx.done lehnt ab – nichts davon ist gespeichert.
    await Promise.all([...writes, tx.done])
  })
}

/** Speichert (neue oder geänderte) Einträge in einer Tabelle. */
export async function putRecords<N extends TableName>(name: N, records: Tables[N]): Promise<void> {
  await putChanges({ tables: { [name]: records } })
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
