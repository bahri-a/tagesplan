import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import * as actions from '../store/actions'
import * as sel from '../store/selectors'
import { flushSaves, getState, initStore, resetStoreForTests } from '../store/store'
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
    actions.updateSettings({ blockMinutes: 25 })
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
    expect(s.settings.blockMinutes).toBe(25)
    expect(s.note.text).toBe('Idee für später')
    expect(s.timer.phase).toBe('idle')
  })

  it('lehnt fremde oder kaputte Dateien freundlich ab', () => {
    expect(parseBackup('kein json')).toBeNull()
    expect(parseBackup('{"app":"etwas-anderes"}')).toBeNull()
    expect(parseBackup(JSON.stringify({ ...createBackup(), data: { days: 'x' } }))).toBeNull()
    expect(parseBackup(JSON.stringify({ ...createBackup(), schemaVersion: 999 }))).toBeNull()
  })
})
