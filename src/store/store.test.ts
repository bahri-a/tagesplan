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
    expect(events).toEqual([{ type: 'blockEnd', taskTitle: 'A', fresh: true, lastBlock: false }])
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

describe('Ultra-Modus', () => {
  it('ist anfangs aus: Pause läuft wie gewohnt, kein Piepen', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK + 500))
    const t = getState().timer
    expect(t.phase === 'break' && t.nagging).toBeFalsy()
    expect(actions.isUltraRinging(at(BLOCK + MIN))).toBe(false)
  })

  it('piept bei fälliger Pause, bis „Pause machen“ – die Pause läuft ab Blockende', () => {
    actions.updateSettings({ ultraMode: true })
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    expect(actions.checkTimer(at(BLOCK + 500))).toEqual([{ type: 'blockEnd', taskTitle: 'A', fresh: true, lastBlock: false }])
    expect(actions.isUltraRinging(at(BLOCK + 10_000))).toBe(true)
    actions.confirmBreak(at(BLOCK + 20_000))
    expect(actions.isUltraRinging(at(BLOCK + 30_000))).toBe(false)
    const t = getState().timer
    expect(t.phase === 'break' && t.startedAt).toBe(START + BLOCK)
    expect(actions.checkTimer(at(BLOCK + BREAK + 100))).toEqual([{ type: 'breakEnd', taskTitle: 'A', fresh: true }])
  })

  it('„+2 Min.“ schiebt die Pause auf, danach piept es wieder', () => {
    actions.updateSettings({ ultraMode: true })
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK))
    actions.snoozeBreak(at(BLOCK + 5000))
    expect(actions.isUltraRinging(at(BLOCK + MIN))).toBe(false)
    // Während des Aufschubs startet die Pause nicht und läuft nicht ab.
    expect(actions.checkTimer(at(BLOCK + BREAK))).toEqual([])
    expect(actions.isUltraRinging(at(BLOCK + 5000 + 2 * MIN))).toBe(true)
    actions.confirmBreak(at(BLOCK + 5000 + 2 * MIN + 1000))
    const t = getState().timer
    // Die Pause beginnt erst nach dem Aufschub und dauert voll.
    expect(t.phase === 'break' && t.startedAt).toBe(START + BLOCK + 5000 + 2 * MIN)
    expect(actions.checkTimer(at(BLOCK + 5000 + 2 * MIN + BREAK))).toEqual([{ type: 'breakEnd', taskTitle: 'A', fresh: true }])
  })

  it('„+2 Min.“ gibt es auch ohne Ultra-Modus – ohne Piepen', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK))
    actions.snoozeBreak(at(BLOCK + MIN))
    expect(actions.checkTimer(at(BLOCK + BREAK))).toEqual([])
    expect(actions.isUltraRinging(at(BLOCK + 3 * MIN))).toBe(false)
    expect(actions.checkTimer(at(BLOCK + 3 * MIN + BREAK))).toEqual([{ type: 'breakEnd', taskTitle: 'A', fresh: true }])
  })

  it('piept nicht, wenn die App lange zu war, nach dem letzten Block oder ohne Töne', () => {
    actions.updateSettings({ ultraMode: true })
    const a = actions.addTask(today(), 'A')
    actions.startBlock(a.id)
    actions.checkTimer(at(BLOCK + 5 * MIN))
    expect(actions.isUltraRinging(at(BLOCK + 5 * MIN))).toBe(false)

    const b = actions.addTask(today(), 'B')
    actions.updateTask(b.id, { estimatedBlocks: 1 })
    actions.startBlock(b.id)
    actions.checkTimer(at(2 * BLOCK + 5 * MIN))
    expect(getState().timer.phase).toBe('idle')

    const c = actions.addTask(today(), 'C')
    actions.startBlock(c.id)
    actions.checkTimer(at(3 * BLOCK + 5 * MIN))
    expect(actions.isUltraRinging(at(3 * BLOCK + 5 * MIN + 1000))).toBe(true)
    actions.updateSettings({ sounds: false })
    expect(actions.isUltraRinging(at(3 * BLOCK + 5 * MIN + 2000))).toBe(false)
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

    actions.addExtraBlock(task.id)
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
    actions.addExtraBlock(task.id)
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

  it('kurz nach dem letzten Block: erst der Rest der Pause – „Zurück“ beendet sie wieder', () => {
    const task = askingTask()
    expect(getState().timer.phase).toBe('idle') // nach dem letzten Block keine Pause
    at(BLOCK + MIN)
    expect(sel.extraBlockStartsNow(getState(), fresh(task.id), Date.now())).toBe(false)
    actions.addExtraBlock(task.id)
    const t = getState().timer
    expect(t.phase).toBe('break')
    if (t.phase === 'break') expect(t.startedAt).toBe(at(BLOCK)) // Pause zählt ab dem Blockende
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(BLOCK + 2 * MIN))).toBe(true)
    actions.undoExtraBlock(at(BLOCK + 2 * MIN))
    expect(fresh(task.id).estimatedBlocks).toBe(1)
    expect(sel.isAskingDone(getState(), fresh(task.id))).toBe(true)
    expect(getState().timer.phase).toBe('idle')
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(BLOCK + 2 * MIN))).toBe(false)
  })

  it('gerade gestarteter Zusatz-Block zählt nicht als Block – seine Minuten zählen trotzdem', () => {
    const task = askingTask()
    at(BLOCK + BREAK + 100)
    actions.addExtraBlock(task.id)
    expect(getState().timer.phase).toBe('block')
    actions.undoExtraBlock(at(BLOCK + BREAK + 100 + 2 * MIN))
    expect(getState().timer.phase).toBe('idle')
    expect(sel.blocksDone(getState(), task.id)).toBe(1)
    expect(sel.isAskingDone(getState(), fresh(task.id))).toBe(true)
    expect(sel.dayYield(getState(), today(), Date.now()).minutes).toBe(BLOCK / MIN + 2)
  })

  it('nicht mehr nach längerer Arbeit im Zusatz-Block oder wenn er geschafft ist', () => {
    const task = askingTask()
    const start = BLOCK + BREAK + 100
    at(start)
    actions.addExtraBlock(task.id)
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(start + 5 * MIN))).toBe(false)
    actions.undoExtraBlock(at(start + 5 * MIN))
    expect(getState().timer.phase).toBe('block')
    actions.checkTimer(at(start + BLOCK))
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), at(start + BLOCK + MIN))).toBe(false)
  })

  it('verschwindet mit „Erledigt“ und nach dem Tageswechsel', () => {
    const task = askingTask()
    actions.addExtraBlock(task.id)
    actions.endDay()
    expect(sel.canUndoExtraBlock(getState(), fresh(task.id), Date.now())).toBe(false)
    const other = askingTask()
    actions.addExtraBlock(other.id)
    actions.finishTask(other.id)
    expect(sel.canUndoExtraBlock(getState(), fresh(other.id), Date.now())).toBe(false)
  })
})

describe('Nach dem letzten Block und am nächsten Tag', () => {
  it('nach dem letzten geschätzten Block keine kurze Pause, sondern gleich die Frage', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 2 })
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK))
    expect(getState().timer.phase).toBe('break') // zwischen den Blöcken wie gewohnt
    actions.checkTimer(at(BLOCK + BREAK))
    actions.startBlock(task.id)
    const events = actions.checkTimer(at(2 * BLOCK + BREAK))
    expect(events).toEqual([{ type: 'blockEnd', taskTitle: 'A', fresh: true, lastBlock: true }])
    expect(getState().timer.phase).toBe('idle')
    expect(sel.isAskingDone(getState(), getState().tasks[task.id])).toBe(true)
  })

  it('„Früher fertig“ beim letzten Block: ebenfalls keine Pause', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 1 })
    actions.startBlock(task.id)
    actions.finishBlockEarly(at(10 * MIN))
    expect(getState().timer.phase).toBe('idle')
    expect(sel.isAskingDone(getState(), getState().tasks[task.id])).toBe(true)
  })

  it('angefangen, aber nicht fertig → am nächsten Tag „Weitermachen oder abschließen?“', () => {
    const started = actions.addTask(today(), 'Angefangen')
    const untouched = actions.addTask(today(), 'Nicht angefangen')
    actions.startBlock(started.id)
    at(10 * MIN)
    actions.abortCurrentBlock() // auch ein halber Block zählt als angefangen
    expect(sel.isAskingResume(getState(), getState().tasks[started.id])).toBe(false) // heute nicht
    actions.endDay()

    const s = getState()
    expect(sel.isAskingResume(s, s.tasks[started.id])).toBe(true)
    expect(sel.isAskingResume(s, s.tasks[untouched.id])).toBe(false)
    // Weitermachen = Block starten → die Frage ist weg.
    actions.startBlock(started.id)
    expect(sel.isAskingResume(getState(), getState().tasks[started.id])).toBe(false)
  })
})

describe('Erledigte Hauptaufgaben', () => {
  it('zählt Blöcke und echte Minuten einer Aufgabe – auch abgebrochene', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK))
    actions.checkTimer(at(BLOCK + BREAK))
    actions.startBlock(task.id)
    at(BLOCK + BREAK + 10 * MIN)
    actions.abortCurrentBlock()
    expect(sel.taskWork(getState(), task.id)).toEqual({ blocks: 2, minutes: BLOCK / MIN + 10 })
  })
})

describe('Planen: kopieren, verschieben, zuletzt verwendet', () => {
  it('kopiert eine Aufgabe mit Schritten (nicht abgehakt) ans Ende von morgen', () => {
    const task = actions.addTask(today(), 'Lernen')
    actions.updateTask(task.id, { estimatedBlocks: 4, startCue: 'Kaffee steht' })
    const step = actions.addStep(task.id, 'Skript öffnen')
    actions.toggleStep(step.id)
    actions.addTask(tomorrow(), 'Anderes')
    const copy = actions.copyTask(task.id, tomorrow())!
    const s = getState()
    expect(sel.tasksOfDay(s, tomorrow()).map((t) => t.title)).toEqual(['Anderes', 'Lernen'])
    expect(copy.estimatedBlocks).toBe(4)
    expect(copy.startCue).toBe('Kaffee steht')
    const steps = sel.stepsOfTask(s, copy.id)
    expect(steps.map((x) => [x.text, x.doneAt])).toEqual([['Skript öffnen', null]])
    expect(sel.stepsOfTask(s, task.id)).toHaveLength(1) // das Original bleibt
  })

  it('verschiebt eine Aufgabe von heute auf morgen – nicht, solange ihr Block läuft', () => {
    const a = actions.addTask(today(), 'A')
    const b = actions.addTask(today(), 'B')
    actions.addTask(tomorrow(), 'C')
    actions.startBlock(a.id)
    expect(actions.moveTask(a.id, tomorrow(), 0)).toBe(false)
    expect(actions.moveTask(b.id, tomorrow(), 0)).toBe(true)
    const s = getState()
    expect(sel.tasksOfDay(s, today()).map((t) => [t.title, t.position])).toEqual([['A', 0]])
    expect(sel.tasksOfDay(s, tomorrow()).map((t) => [t.title, t.position])).toEqual([['B', 0], ['C', 1]])
  })

  it('„Zuletzt verwendet“: jüngste zuerst, jeder Titel einmal, ohne Titel des Ziel-Tags', () => {
    at(0)
    actions.addTask(today(), 'Mathe')
    at(MIN)
    actions.addTask(today(), 'Englisch')
    at(2 * MIN)
    actions.addTask(tomorrow(), 'mathe ')
    at(3 * MIN)
    actions.addTask(today(), 'Physik')
    const titles = (dayId: string) => sel.recentTasks(getState(), dayId, 5).map((t) => t.title)
    expect(titles(tomorrow())).toEqual(['Physik', 'Englisch'])
    expect(titles(today())).toEqual([])
    expect(sel.recentTasks(getState(), 'anderer-tag', 2).map((t) => t.title)).toEqual(['Physik', 'mathe'])
  })

  it('× blendet einen Titel aus – bis die Aufgabe wieder benutzt wird', () => {
    at(0)
    actions.addTask(today(), 'Mathe')
    at(MIN)
    actions.addTask(today(), 'Physik')
    const titles = () => sel.recentTasks(getState(), tomorrow(), 5).map((t) => t.title)
    at(2 * MIN)
    actions.hideRecentTask(' physik')
    expect(titles()).toEqual(['Mathe'])
    at(3 * MIN)
    actions.addTask(today(), 'Physik') // wieder benutzt → taucht wieder auf
    expect(titles()).toEqual(['Physik', 'Mathe'])
  })
})

describe('Tag beenden: streichen bei der Platzwahl', () => {
  it('gestrichene übertragene Aufgabe bleibt zurück, gestrichene geplante wird gelöscht', () => {
    const a = actions.addTask(today(), 'Heute offen')
    const x = actions.addTask(tomorrow(), 'Morgen geplant')
    const b = actions.addTask(today(), 'Heute auch offen')
    actions.addTask(tomorrow(), 'Morgen zwei')
    const oldDay = today()
    expect(actions.getEndDayConflicts()).toHaveLength(2)
    expect(actions.getEndDayConflicts(new Set([a.id, b.id]))).toHaveLength(0)
    actions.endDay({}, new Set([a.id, x.id]))
    const s = getState()
    expect(sel.tasksOfDay(s, today()).map((t) => t.title)).toEqual(['Morgen zwei', 'Heute auch offen'])
    expect(s.tasks[a.id].dayId).toBe(oldDay) // nicht mitgenommen, aber nicht gelöscht
    expect(s.tasks[a.id].deletedAt).toBeNull()
    expect(s.tasks[x.id].deletedAt).not.toBeNull()
  })
})
