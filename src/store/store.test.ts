/**
 * Tests für den kompletten Ablauf: planen → Block → Pause → erledigt →
 * Tag beenden. Die Datenbank wird dabei im Arbeitsspeicher simuliert
 * (fake-indexeddb).
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../config/defaults'
import { resetDatabaseForTests } from '../db/database'
import type { Settings } from '../model/types'
import * as actions from './actions'
import * as sel from './selectors'
import { flushSaves, getState, initStore, resetStoreForTests } from './store'

const MIN = 60_000
// Die Abläufe rechnen mit den Standardwerten – so passen sie auch, wenn sich diese ändern.
const BLOCK = DEFAULT_SETTINGS.blockMinutes * MIN
const BREAK = DEFAULT_SETTINGS.shortBreakMinutes * MIN
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
    expect(s.settings.blockMinutes).toBe(25)
    expect(s.settings.shortBreakMinutes).toBe(7)
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
    expect(actions.checkTimer(at(BLOCK - 3 * MIN))).toEqual([])
    // Kurz vor dem Ende: einmal die sanfte Vorwarnung.
    expect(actions.checkTimer(at(BLOCK - MIN))).toEqual([{ type: 'blockWarning', taskTitle: 'A', fresh: true }])
    expect(actions.checkTimer(at(BLOCK - MIN / 2))).toEqual([])

    const events = actions.checkTimer(at(BLOCK + 500))
    expect(events).toEqual([{ type: 'blockEnd', taskTitle: 'A', fresh: true }])
    const [block] = sel.blocksOfTask(getState(), task.id)
    expect(block.status).toBe('completed')
    expect(block.workedSeconds).toBe(BLOCK / 1000)
    expect(getState().timer.phase).toBe('break')

    expect(actions.checkTimer(at(BLOCK + BREAK + 100))).toEqual([{ type: 'breakEnd', taskTitle: 'A', fresh: true }])
    // Das Pausenende wird nur einmal gemeldet.
    expect(actions.checkTimer(at(BLOCK + BREAK + MIN))).toEqual([])
  })

  it('Pausieren verlängert den Block, pausierte Zeit zählt nicht', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    at(5 * MIN)
    actions.pauseCurrentBlock()
    at(8 * MIN)
    actions.resumeCurrentBlock()
    expect(actions.checkTimer(at(BLOCK + 500))).toEqual([])
    actions.checkTimer(at(BLOCK + 3 * MIN))
    const [block] = sel.blocksOfTask(getState(), task.id)
    expect(block.pausedMs).toBe(3 * MIN)
    expect(block.workedSeconds).toBe(BLOCK / 1000)
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

  it('nutzt die individuelle Blocklänge der Aufgabe', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { blockMinutesOverride: 10 })
    actions.startBlock(task.id)
    expect(actions.checkTimer(at(10 * MIN))).toHaveLength(1)
  })

  it('nutzt die individuelle kurze Pause der Aufgabe – sonst den Standard', () => {
    const a = actions.addTask(today(), 'A')
    actions.updateTask(a.id, { shortBreakMinutesOverride: 3 })
    actions.startBlock(a.id)
    actions.checkTimer(at(BLOCK))
    const t = getState().timer
    expect(t.phase === 'break' && t.durationMs).toBe(3 * MIN)
    expect(actions.checkTimer(at(BLOCK + 3 * MIN))).toEqual([{ type: 'breakEnd', taskTitle: 'A', fresh: true }])

    const b = actions.addTask(today(), 'B')
    actions.startBlock(b.id)
    actions.checkTimer(at(2 * BLOCK + 3 * MIN))
    const t2 = getState().timer
    expect(t2.phase === 'break' && t2.durationMs).toBe(BREAK)
  })

  it('begrenzt die individuelle Pause auf erlaubte Werte', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { shortBreakMinutesOverride: 999 })
    expect(getState().tasks[task.id].shortBreakMinutesOverride).toBe(60)
    actions.updateTask(task.id, { shortBreakMinutesOverride: null })
    expect(getState().tasks[task.id].shortBreakMinutesOverride).toBeNull()
  })
})

describe('Hauptaufgabe erledigt, lange Pause', () => {
  it('fragt nach dem letzten geschätzten Block – abgebrochene zählen mit', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 2 })
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK))
    expect(sel.isAskingDone(getState(), getState().tasks[task.id])).toBe(false)
    actions.startBlock(task.id)
    at(BLOCK + 10 * MIN)
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
    actions.checkTimer(at(BLOCK))
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
    actions.checkTimer(at(BLOCK))
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

  it('Rückgängig holt eine gelöschte Aufgabe mit Schritten und Werten auf ihren alten Platz zurück', () => {
    const a = actions.addTask(today(), 'A')
    const b = actions.addTask(today(), 'B')
    const c = actions.addTask(today(), 'C')
    actions.updateTask(b.id, { estimatedBlocks: 5, blockMinutesOverride: 40, shortBreakMinutesOverride: 3 })
    const step1 = actions.addStep(b.id, 'PDF öffnen')
    actions.addStep(b.id, 'Seite 1 lesen')
    actions.toggleStep(step1.id)

    actions.deleteTask(b.id)
    expect(sel.tasksOfDay(getState(), today()).map((t) => t.title)).toEqual(['A', 'C'])
    expect(sel.stepsOfTask(getState(), b.id)).toEqual([])

    expect(actions.restoreTask(b.id)).toBe(true)
    const s = getState()
    expect(sel.tasksOfDay(s, today()).map((t) => [t.title, t.position])).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ])
    const restored = s.tasks[b.id]
    expect(restored.deletedAt).toBeNull()
    expect(restored.estimatedBlocks).toBe(5)
    expect(restored.blockMinutesOverride).toBe(40)
    expect(restored.shortBreakMinutesOverride).toBe(3)
    const steps = sel.stepsOfTask(s, b.id)
    expect(steps.map((st) => [st.text, st.doneAt !== null])).toEqual([
      ['PDF öffnen', true],
      ['Seite 1 lesen', false],
    ])
    // Nichts anderes hat sich verändert.
    expect([a.id, c.id].map((id) => s.tasks[id].deletedAt)).toEqual([null, null])
  })

  it('Rückgängig bringt keine vorher einzeln entfernten Schritte zurück', () => {
    const a = actions.addTask(today(), 'A')
    const old = actions.addStep(a.id, 'alt')
    actions.addStep(a.id, 'neu')
    actions.deleteStep(old.id)
    at(MIN)
    actions.deleteTask(a.id)
    actions.restoreTask(a.id)
    expect(sel.stepsOfTask(getState(), a.id).map((st) => [st.text, st.position])).toEqual([['neu', 0]])
  })

  it('Rückgängig stellt einen beim Löschen beendeten Block nicht wieder her', () => {
    const a = actions.addTask(tomorrow(), 'Morgen')
    const b = actions.addTask(today(), 'B')
    actions.startBlock(b.id)
    at(4 * MIN)
    expect(sel.runningTimerOfTask(getState(), b.id, Date.now())).toBe('block')
    expect(sel.runningTimerOfTask(getState(), a.id, Date.now())).toBeNull()
    actions.deleteTask(b.id)
    expect(getState().timer.phase).toBe('idle')

    actions.restoreTask(b.id)
    const s = getState()
    expect(s.timer.phase).toBe('idle')
    // Die 4 gearbeiteten Minuten bleiben als abgebrochener Block gespeichert.
    expect(sel.blocksOfTask(s, b.id).map((bl) => [bl.status, bl.workedSeconds])).toEqual([['aborted', 4 * 60]])
  })

  it('erkennt einen pausierten Block und eine laufende kurze Pause – nicht aber eine vorbei', () => {
    const a = actions.addTask(today(), 'A')
    actions.startBlock(a.id)
    actions.pauseCurrentBlock()
    expect(sel.runningTimerOfTask(getState(), a.id, Date.now())).toBe('block')
    actions.resumeCurrentBlock()
    actions.checkTimer(at(BLOCK))
    expect(sel.runningTimerOfTask(getState(), a.id, at(BLOCK + MIN))).toBe('break')
    expect(sel.runningTimerOfTask(getState(), a.id, at(BLOCK + BREAK))).toBeNull()
  })

  it('Rückgängig tut nichts, wenn der Tag der Aufgabe inzwischen beendet ist', () => {
    const a = actions.addTask(today(), 'A')
    actions.deleteTask(a.id)
    actions.endDay()
    expect(actions.restoreTask(a.id)).toBe(false)
    expect(getState().tasks[a.id].deletedAt).not.toBeNull()
    // Eine nicht gelöschte Aufgabe bleibt unverändert.
    const b = actions.addTask(today(), 'B')
    expect(actions.restoreTask(b.id)).toBe(false)
  })

  it('neue Aufgaben bekommen die Standard-Blockanzahl', () => {
    actions.updateSettings({ defaultBlocksPerTask: 4 })
    expect(actions.addTask(today(), 'A').estimatedBlocks).toBe(4)
  })

  it('ältere Einstellungen ohne „Flächen“ bekommen den Standard „pur“', async () => {
    const { surfaces: _ignored, ...old } = getState().settings
    const db = await import('../db/database')
    await flushSaves()
    await db.putRecords('settings', [old as Settings])
    resetStoreForTests()
    await initStore()
    expect(getState().settings.surfaces).toBe('pur')
    actions.updateSettings({ surfaces: 'glass' })
    expect(getState().settings.surfaces).toBe('glass')
  })

  it('hält Einstellungen in sinnvollen Grenzen', () => {
    actions.updateSettings({ blockMinutes: 0, shortBreakMinutes: 999 })
    expect(getState().settings.blockMinutes).toBe(1)
    expect(getState().settings.shortBreakMinutes).toBe(60)
  })
})

describe('Startsignal und erste Schätzung', () => {
  it('merkt sich das Startsignal, leer bedeutet keins', () => {
    const task = actions.addTask(today(), 'A')
    expect(getState().tasks[task.id].startCue).toBeNull()
    actions.updateTask(task.id, { startCue: 'der Kaffee auf dem Tisch steht' })
    expect(getState().tasks[task.id].startCue).toBe('der Kaffee auf dem Tisch steht')
    actions.updateTask(task.id, { startCue: '   ' })
    expect(getState().tasks[task.id].startCue).toBeNull()
  })

  it('merkt sich beim ersten Block die damalige Schätzung – „Noch ein Block“ ändert sie nicht', () => {
    const task = actions.addTask(today(), 'A')
    expect(getState().tasks[task.id].firstEstimatedBlocks).toBeNull()
    actions.startBlock(task.id)
    const first = getState().tasks[task.id].estimatedBlocks
    expect(getState().tasks[task.id].firstEstimatedBlocks).toBe(first)
    actions.abortCurrentBlock()
    actions.addExtraBlock(task.id, true)
    expect(getState().tasks[task.id].estimatedBlocks).toBe(first + 1)
    expect(getState().tasks[task.id].firstEstimatedBlocks).toBe(first)
  })
})

describe('Gedanken parken und Tagesertrag', () => {
  it('hängt geparkte Gedanken als neue Zeile an den Notizzettel', () => {
    actions.parkThought('Mama anrufen')
    actions.parkThought('  ')
    actions.parkThought('Buch zurückgeben')
    expect(getState().note.text).toBe('Mama anrufen\nBuch zurückgeben')
  })

  it('zählt durchgehaltene Blöcke, alle Minuten und erledigte Aufgaben des Tages', () => {
    const task = actions.addTask(today(), 'Kapitel 3')
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK + 500))
    actions.finishTask(task.id)
    const result = sel.dayYield(getState(), today(), at(BLOCK + MIN))
    expect(result.completedBlocks).toBe(1)
    expect(result.minutes).toBe(BLOCK / 60_000)
    expect(result.doneTitles).toEqual(['Kapitel 3'])
  })
})

describe('Früher fertig', () => {
  it('schließt den Block vorzeitig als durchgehalten ab, die Pause startet sofort', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    actions.finishBlockEarly(at(10 * MIN))
    const [block] = sel.blocksOfTask(getState(), task.id)
    expect(block.status).toBe('completed')
    expect(block.workedSeconds).toBe(10 * 60)
    const t = getState().timer
    expect(t.phase).toBe('break')
    if (t.phase === 'break') expect(t.startedAt).toBe(at(10 * MIN))
    // Die Einstellungen der Aufgabe bleiben gleich – der nächste Block ist wieder normal lang.
    expect(getState().tasks[task.id].blockMinutesOverride).toBeNull()
    actions.checkTimer(at(10 * MIN + BREAK + 100))
    actions.startBlock(task.id)
    const next = getState().timer
    expect(next.phase === 'block' && next.plannedMs).toBe(BLOCK)
  })
})

describe('Zurück nach „Noch ein Block“', () => {
  /** Aufgabe mit 1 Block, dieser ist geschafft → die Frage „Erledigt oder noch ein Block?“ ist da. */
  function askingTask() {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 1 })
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK))
    return task
  }
  const fresh = (id: string) => getState().tasks[id]

  it('in der Pause: Schätzung wie vorher, die Frage ist wieder da', () => {
    const task = askingTask()
    actions.addExtraBlock(task.id, false)
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(BLOCK + MIN))).toBe(true)
    actions.undoExtraBlock(at(BLOCK + MIN))
    expect(fresh(task.id).estimatedBlocks).toBe(1)
    expect(sel.isAskingDone(getState(), fresh(task.id))).toBe(true)
    expect(getState().timer.phase).toBe('break') // die Pause läuft einfach weiter
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(BLOCK + MIN))).toBe(false)
  })

  it('gerade gestarteter Zusatz-Block wird verworfen und zählt nicht', () => {
    const task = askingTask()
    at(BLOCK + BREAK + 100)
    actions.checkTimer()
    actions.addExtraBlock(task.id, true)
    expect(getState().timer.phase).toBe('block')
    actions.undoExtraBlock(at(BLOCK + BREAK + MIN))
    expect(getState().timer.phase).toBe('idle')
    expect(sel.blocksDone(getState(), task.id)).toBe(1)
    expect(sel.isAskingDone(getState(), fresh(task.id))).toBe(true)
  })

  it('nicht mehr nach längerer Arbeit im Zusatz-Block oder wenn er geschafft ist', () => {
    const task = askingTask()
    const start = BLOCK + BREAK + 100
    at(start)
    actions.checkTimer()
    actions.addExtraBlock(task.id, true)
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(start + 5 * MIN))).toBe(false)
    actions.undoExtraBlock(at(start + 5 * MIN))
    expect(getState().timer.phase).toBe('block')
    actions.checkTimer(at(start + BLOCK))
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(start + BLOCK + MIN))).toBe(false)
  })

  it('verschwindet mit „Erledigt“ und nach dem Tageswechsel', () => {
    const task = askingTask()
    actions.addExtraBlock(task.id, false)
    actions.endDay()
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), Date.now())).toBe(false)
    const other = askingTask()
    actions.addExtraBlock(other.id, false)
    actions.finishTask(other.id)
    expect(sel.canUndoExtraBlock(getState(), fresh(other.id), Date.now())).toBe(false)
  })
})
