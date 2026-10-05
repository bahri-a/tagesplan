import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import * as actions from '../store/actions'
import * as sel from '../store/selectors'
import { flushSaves, getState, initStore, resetStoreForTests } from '../store/store'
import { memoryStorage } from '../logic/deviceStorage'
import { DEFERRED_KEY, HIDDEN_KEY, LIMIT_KEY, PROJECTS_KEY } from '../logic/projectSuggestions'
import { createBackup, parseBackup, restoreBackup } from './backup'
import { resetDatabaseForTests } from './database'

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseForTests()
  resetStoreForTests()
  await initStore()
})

describe('Sichern und Wiederherstellen', () => {
  it('stellt alle Daten aus einer Sicherung wieder her', async () => {
    const dayId = sel.activeDay(getState()).id
    const task = actions.addTask(dayId, 'Kapitel 3')
    actions.addStep(task.id, 'PDF öffnen')
    actions.updateSettings({ blockMinutes: 30 })
    actions.updateNote('Idee für später')
    await flushSaves()

    const json = JSON.stringify(createBackup())

    // Daten verändern …
    actions.deleteTask(task.id)
    actions.updateSettings({ blockMinutes: 10 })
    actions.updateNote('')
    await flushSaves()

    // … und wiederherstellen
    const backup = parseBackup(json)
    expect(backup).not.toBeNull()
    await restoreBackup(backup!)

    const s = getState()
    expect(sel.tasksOfDay(s, dayId).map((t) => t.title)).toEqual(['Kapitel 3'])
    expect(sel.stepsOfTask(s, task.id).map((st) => st.text)).toEqual(['PDF öffnen'])
    expect(s.settings.blockMinutes).toBe(30)
    expect(s.note.text).toBe('Idee für später')
    expect(s.timer.phase).toBe('idle')
  })

  it('bringt eine ältere Sicherung (Version 1) auf den aktuellen Stand', async () => {
    const dayId = sel.activeDay(getState()).id
    const task = actions.addTask(dayId, 'Kapitel 3')
    await flushSaves()
    // So sah eine Sicherung aus Version 1 aus: alte Standardwerte, Aufgaben ohne individuelle Pause.
    const current = createBackup()
    const old = {
      ...current,
      schemaVersion: 1,
      data: {
        ...current.data,
        tasks: current.data.tasks.map((t) => {
          const oldTask: Partial<typeof t> = { ...t }
          delete oldTask.shortBreakMinutesOverride
          return oldTask
        }),
        settings: current.data.settings.map((st) => ({ ...st, blockMinutes: 15, shortBreakMinutes: 5 })),
      },
    }
    const backup = parseBackup(JSON.stringify(old))
    expect(backup).not.toBeNull()
    await restoreBackup(backup!)

    const s = getState()
    expect(s.tasks[task.id].shortBreakMinutesOverride).toBeNull()
    expect(s.settings.blockMinutes).toBe(25)
    expect(s.settings.shortBreakMinutes).toBe(7)
  })

  it('sichert die Vorschläge-Einstellungen aus dem Browser-Speicher mit, aber nicht die Daten von Projekte', async () => {
    const storage = memoryStorage({
      [HIDDEN_KEY]: JSON.stringify({ a: 1 }),
      [DEFERRED_KEY]: JSON.stringify({ b: 2 }),
      [LIMIT_KEY]: '7',
      [PROJECTS_KEY]: JSON.stringify({ items: [] }),
    })
    const json = JSON.stringify(createBackup(getState(), storage))
    expect(JSON.parse(json).deviceData).toEqual({ [HIDDEN_KEY]: { a: 1 }, [DEFERRED_KEY]: { b: 2 }, [LIMIT_KEY]: 7 })

    // Anderes Gerät: andere Werte, Projekte-Daten gehören Projekte und bleiben.
    const other = memoryStorage({ [HIDDEN_KEY]: JSON.stringify({ z: 9 }), [PROJECTS_KEY]: 'projekte' })
    await restoreBackup(parseBackup(json)!, other)
    expect(JSON.parse(other.getItem(HIDDEN_KEY)!)).toEqual({ a: 1 })
    expect(other.getItem(LIMIT_KEY)).toBe('7')
    expect(other.getItem(PROJECTS_KEY)).toBe('projekte')
  })

  it('lässt den Browser-Speicher in Ruhe, wenn eine ältere Sicherung ihn nicht enthält', async () => {
    const backup = createBackup(getState(), memoryStorage())
    delete backup.deviceData
    const other = memoryStorage({ [HIDDEN_KEY]: JSON.stringify({ z: 9 }) })
    await restoreBackup(parseBackup(JSON.stringify(backup))!, other)
    expect(JSON.parse(other.getItem(HIDDEN_KEY)!)).toEqual({ z: 9 })
  })

  it('lehnt fremde oder kaputte Dateien freundlich ab', () => {
    expect(parseBackup('kein json')).toBeNull()
    expect(parseBackup('{"app":"etwas-anderes"}')).toBeNull()
    expect(parseBackup(JSON.stringify({ ...createBackup(), data: { days: 'x' } }))).toBeNull()
    expect(parseBackup(JSON.stringify({ ...createBackup(), schemaVersion: 999 }))).toBeNull()
  })
})
