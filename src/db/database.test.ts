/**
 * Test für das Datenbank-Update: Eine Datenbank von Version 1 (wie in der
 * schon installierten App) wird beim Öffnen auf Version 2 gebracht.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import { getState, initStore, resetStoreForTests } from '../store/store'
import { resetDatabaseForTests, TABLE_NAMES } from './database'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseForTests()
  resetStoreForTests()
})

/** Legt eine Datenbank so an, wie Version 1 der App sie gespeichert hat. */
async function createVersion1Database(blockMinutes: number, shortBreakMinutes: number) {
  const db = await openDB('tagesplan', 1, {
    upgrade(database) {
      for (const name of TABLE_NAMES) database.createObjectStore(name, { keyPath: 'id' })
      database.createObjectStore('local')
    },
  })
  const base = { createdAt: 0, updatedAt: 0, deletedAt: null }
  await db.put('settings', {
    ...base,
    id: 'settings',
    blockMinutes,
    shortBreakMinutes,
    defaultBlocksPerTask: 3,
    maxTasksPerDay: 3,
    theme: 'system',
  })
  // Aufgabe ohne das Feld für die individuelle Pause (gab es in Version 1 noch nicht)
  await db.put('tasks', {
    ...base,
    id: 'task-1',
    dayId: 'day-1',
    title: 'Kapitel 3',
    position: 0,
    estimatedBlocks: 3,
    blockMinutesOverride: null,
    completedAt: null,
  })
  db.close()
}

describe('Datenbank-Update von Version 1', () => {
  it('stellt 15/5 auf 25/7 um und ergänzt die Pause bei den Aufgaben', async () => {
    await createVersion1Database(15, 5)
    await initStore()
    const s = getState()
    expect(s.settings.blockMinutes).toBe(25)
    expect(s.settings.shortBreakMinutes).toBe(7)
    expect(s.tasks['task-1'].title).toBe('Kapitel 3')
    expect(s.tasks['task-1'].shortBreakMinutesOverride).toBeNull()
  })

  it('behält selbst eingestellte Werte', async () => {
    await createVersion1Database(20, 10)
    await initStore()
    expect(getState().settings.blockMinutes).toBe(20)
    expect(getState().settings.shortBreakMinutes).toBe(10)
  })
})
