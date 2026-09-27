/**
 * Tests für den kompletten Ablauf: planen → Block → Pause → erledigt →
 * Tag beenden. Die Datenbank wird dabei im Arbeitsspeicher simuliert
 * (fake-indexeddb).
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDatabaseForTests } from '../db/database'
import * as actions from './actions'
import * as sel from './selectors'
import { flushSaves, getState, initStore, resetStoreForTests } from './store'

const MIN = 60_000
const START = new Date(2026, 8, 28, 9, 0).getTime() // Mo, 28.09.2026, 9:00

function at(ms: number) {
  vi.setSystemTime(START + ms)
  return START + ms
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseForTests()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] })
  at(0)
  await initStore()
})

afterEach(() => {
  vi.useRealTimers()
})

const today = () => sel.activeDay(getState()).id
const tomorrow = () => sel.plannedDay(getState()).id

describe('Start', () => {
  it('legt beim ersten Start heute, morgen und Standardeinstellungen an', () => {
    const s = getState()
    expect(sel.activeDay(s)).toBeTruthy()
    expect(sel.plannedDay(s)).toBeTruthy()
    expect(s.settings.blockMinutes).toBe(15)
    expect(s.settings.shortBreakMinutes).toBe(5)
  })

  it('lädt gespeicherte Daten nach einem Neustart wieder', async () => {
    const task = actions.addTask(today(), 'Kapitel 3')
    actions.addStep(task.id, 'PDF öffnen')
    await flushSaves()
    resetStoreForTests()
    await initStore()
    const s = getState()
    expect(sel.tasksOfDay(s, today()).map((t) => t.title)).toEqual(['Kapitel 3'])
    expect(sel.stepsOfTask(s, task.id).map((st) => st.text)).toEqual(['PDF öffnen'])
  })
})

describe('Block und kurze Pause', () => {
  it('Block läuft ab → durchgehalten, kurze Pause startet, danach Ton', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    expect(actions.checkTimer(at(14 * MIN))).toEqual([])

    const events = actions.checkTimer(at(15 * MIN + 500))
    expect(events).toEqual([{ type: 'blockEnd', taskTitle: 'A', fresh: true }])
    const [block] = sel.blocksOfTask(getState(), task.id)
    expect(block.status).toBe('completed')
    expect(block.workedSeconds).toBe(15 * 60)
    expect(getState().timer.phase).toBe('break')

    expect(actions.checkTimer(at(20 * MIN + 100))).toEqual([{ type: 'breakEnd', taskTitle: 'A', fresh: true }])
    // Das Pausenende wird nur einmal gemeldet.
    expect(actions.checkTimer(at(21 * MIN))).toEqual([])
  })

  it('Pausieren verlängert den Block, pausierte Zeit zählt nicht', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    at(5 * MIN)
    actions.pauseCurrentBlock()
    at(8 * MIN)
    actions.resumeCurrentBlock()
    expect(actions.checkTimer(at(15 * MIN + 500))).toEqual([])
    actions.checkTimer(at(18 * MIN))
    const [block] = sel.blocksOfTask(getState(), task.id)
    expect(block.pausedMs).toBe(3 * MIN)
    expect(block.workedSeconds).toBe(15 * 60)
  })

  it('Abbrechen speichert die gearbeitete Zeit und zählt als Block', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    at(7 * MIN)
    actions.abortCurrentBlock()
    const [block] = sel.blocksOfTask(getState(), task.id)
    expect(block.status).toBe('aborted')
    expect(block.workedSeconds).toBe(7 * 60)
    expect(sel.blocksDone(getState(), task.id)).toBe(1)
    expect(getState().timer.phase).toBe('idle')
  })

  it('kein verspäteter Ton, wenn die App lange zu war', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    const events = actions.checkTimer(at(3 * 60 * MIN))
    expect(events.map((e) => e.fresh)).toEqual([false, false])
    expect(sel.blocksOfTask(getState(), task.id)[0].status).toBe('completed')
  })

  it('nutzt die eigene Blocklänge der Aufgabe', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { blockMinutesOverride: 10 })
    actions.startBlock(task.id)
    expect(actions.checkTimer(at(10 * MIN))).toHaveLength(1)
  })
})

describe('Hauptaufgabe erledigt, lange Pause', () => {
  it('fragt nach dem letzten geschätzten Block – abgebrochene zählen mit', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 2 })
    actions.startBlock(task.id)
    actions.checkTimer(at(15 * MIN))
    expect(sel.isAskingDone(getState(), getState().tasks[task.id])).toBe(false)
    actions.startBlock(task.id)
    at(25 * MIN)
    actions.abortCurrentBlock()
    expect(sel.isAskingDone(getState(), getState().tasks[task.id])).toBe(true)

    actions.addExtraBlock(task.id, false)
    expect(sel.isAskingDone(getState(), getState().tasks[task.id])).toBe(false)
  })

  it('„Erledigt“ beendet die kurze Pause; die nächste Aufgabe braucht die lange Pause', () => {
    const a = actions.addTask(today(), 'A')
    const b = actions.addTask(today(), 'B')
    expect(sel.needsLongPause(getState(), a)).toBe(false)
    actions.startBlock(a.id)
    actions.checkTimer(at(15 * MIN))
    actions.finishTask(a.id)
    const s = getState()
    expect(s.timer.phase).toBe('idle')
    expect(s.tasks[a.id].completedAt).not.toBeNull()
    expect(sel.currentTask(s)?.id).toBe(b.id)
    expect(sel.needsLongPause(s, s.tasks[b.id])).toBe(true)
  })
})

describe('Tag beenden', () => {
  it('„morgen“ wird „heute“, offene Aufgaben behalten ihren Platz', () => {
    // A und C erledigt, B (Platz 2) bleibt offen; für morgen ist X geplant.
    const a = actions.addTask(today(), 'A')
    actions.addTask(today(), 'B')
    const c = actions.addTask(today(), 'C')
    actions.addTask(tomorrow(), 'X')
    actions.setTaskCompleted(a.id, true)
    actions.setTaskCompleted(c.id, true)

    const oldDayId = today()
    expect(actions.getEndDayConflicts()).toEqual([])
    actions.endDay()
    const s = getState()
    expect(s.days[oldDayId].status).toBe('ended')
    expect(sel.tasksOfDay(s, today()).map((t) => t.title)).toEqual(['X', 'B'])
    expect(sel.tasksOfDay(s, tomorrow())).toEqual([])
    // Erledigte Aufgaben bleiben beim alten Tag (für die Statistik).
    expect(s.tasks[a.id].dayId).toBe(oldDayId)
  })

  it('löst Platzkonflikte nach deiner Wahl', () => {
    actions.addTask(today(), 'A')
    actions.addTask(tomorrow(), 'X')
    const [conflict] = actions.getEndDayConflicts()
    expect(conflict.place).toBe(1)
    actions.endDay({ [conflict.carried.id]: 'planned' })
    expect(sel.tasksOfDay(getState(), today()).map((t) => t.title)).toEqual(['X', 'A'])
  })

  it('stoppt einen laufenden Block und speichert seine Minuten', () => {
    const a = actions.addTask(today(), 'A')
    actions.startBlock(a.id)
    at(6 * MIN)
    actions.endDay()
    const [block] = sel.blocksOfTask(getState(), a.id)
    expect(block.status).toBe('aborted')
    expect(block.workedSeconds).toBe(6 * 60)
    expect(getState().timer.phase).toBe('idle')
  })

  it('fragt am nächsten Tag freundlich nach – aber nur nach echter Arbeit', () => {
    const a = actions.addTask(today(), 'A')
    // Ohne Arbeit: keine Frage
    expect(sel.shouldAskToEndPreviousDay(getState(), at(24 * 60 * MIN))).toBe(false)
    at(0)
    actions.startBlock(a.id)
    actions.checkTimer(at(15 * MIN))
    // Nachts um 2 Uhr zählt noch zum selben Tag
    const nightTwo = new Date(2026, 8, 29, 2, 0).getTime()
    expect(sel.shouldAskToEndPreviousDay(getState(), nightTwo)).toBe(false)
    // Am nächsten Morgen schon
    const nextMorning = new Date(2026, 8, 29, 9, 0).getTime()
    expect(sel.shouldAskToEndPreviousDay(getState(), nextMorning)).toBe(true)
    // „Nein“ → heute nicht mehr fragen, morgen wieder
    actions.dismissEndDayPrompt(nextMorning)
    expect(sel.shouldAskToEndPreviousDay(getState(), nextMorning + 60 * MIN)).toBe(false)
    expect(sel.shouldAskToEndPreviousDay(getState(), nextMorning + 24 * 60 * MIN)).toBe(true)
  })
})

describe('Planen', () => {
  it('sortiert per Drag & Drop und rückt nach dem Löschen auf', () => {
    const a = actions.addTask(today(), 'A')
    const b = actions.addTask(today(), 'B')
    const c = actions.addTask(today(), 'C')
    actions.reorderTasks(today(), [c.id, a.id, b.id])
    expect(sel.tasksOfDay(getState(), today()).map((t) => t.title)).toEqual(['C', 'A', 'B'])
    actions.deleteTask(a.id)
    const tasks = sel.tasksOfDay(getState(), today())
    expect(tasks.map((t) => [t.title, t.position])).toEqual([
      ['C', 0],
      ['B', 1],
    ])
  })

  it('neue Aufgaben bekommen die Standard-Blockanzahl', () => {
    actions.updateSettings({ defaultBlocksPerTask: 4 })
    expect(actions.addTask(today(), 'A').estimatedBlocks).toBe(4)
  })

  it('hält Einstellungen in sinnvollen Grenzen', () => {
    actions.updateSettings({ blockMinutes: 0, shortBreakMinutes: 999 })
    expect(getState().settings.blockMinutes).toBe(1)
    expect(getState().settings.shortBreakMinutes).toBe(60)
  })
})
