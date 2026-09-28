/**
 * AKTIONEN
 * ========
 * Alles, was Daten verändert, steht hier – z. B. „Aufgabe anlegen“,
 * „Block starten“ oder „Tag beenden“. Die Oberfläche ruft nur diese
 * Funktionen auf.
 */

import { SETTINGS_LIMITS, SIGNAL_MAX_DELAY_MS } from '../config/defaults'
import { mergeCarryOver, type CarryConflict, type ConflictChoices } from '../logic/carryOver'
import { baseFields } from '../logic/records'
import { dayKey } from '../logic/time'
import * as timer from '../logic/timer'
import type { Block, BlockStatus, ID, SettingsValues, Step, Task } from '../model/types'
import {
  activeDay,
  blockMinutesFor,
  plannedDay,
  shortBreakMinutesFor,
  stepsOfTask,
  tasksOfDay,
} from './selectors'
import { commit, getState, type Changes } from './store'

/* ================================================================== */
/* Planen: Hauptaufgaben                                              */
/* ================================================================== */

/** Neue Hauptaufgabe am Ende des Tages anlegen. */
export function addTask(dayId: ID, title: string): Task {
  const s = getState()
  const task: Task = {
    ...baseFields(Date.now()),
    dayId,
    title: title.trim(),
    position: tasksOfDay(s, dayId).length,
    estimatedBlocks: s.settings.defaultBlocksPerTask,
    blockMinutesOverride: null,
    shortBreakMinutesOverride: null,
    completedAt: null,
  }
  commit({ tasks: [task] })
  return task
}

type TaskPatch = Partial<
  Pick<Task, 'title' | 'estimatedBlocks' | 'blockMinutesOverride' | 'shortBreakMinutesOverride'>
>

/** Titel, Blockanzahl, individuelle Blocklänge oder individuelle kurze Pause ändern. */
export function updateTask(taskId: ID, patch: TaskPatch): void {
  const task = getState().tasks[taskId]
  if (!task) return
  const next = { ...task, ...patch }
  next.estimatedBlocks = Math.max(1, Math.round(next.estimatedBlocks))
  if (next.blockMinutesOverride !== null) {
    const { min, max } = SETTINGS_LIMITS.blockMinutes
    next.blockMinutesOverride = clamp(Math.round(next.blockMinutesOverride), min, max)
  }
  if (next.shortBreakMinutesOverride !== null) {
    const { min, max } = SETTINGS_LIMITS.shortBreakMinutes
    next.shortBreakMinutesOverride = clamp(Math.round(next.shortBreakMinutesOverride), min, max)
  }
  commit({ tasks: [next] })
}

/** Hauptaufgabe (mit ihren Schritten) löschen. */
export function deleteTask(taskId: ID): void {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task) return
  const now = Date.now()
  const changes: Changes = {
    tasks: [{ ...task, deletedAt: now }],
    steps: stepsOfTask(s, taskId).map((st) => ({ ...st, deletedAt: now })),
  }
  // Läuft gerade ein Block oder eine Pause für diese Aufgabe, wird er beendet.
  if (s.timer.phase !== 'idle' && s.timer.taskId === taskId) {
    Object.assign(changes, stopTimerChanges(now))
  }
  // Die übrigen Aufgaben rücken auf.
  const rest = tasksOfDay(s, task.dayId).filter((t) => t.id !== taskId)
  changes.tasks!.push(...renumber(rest))
  commit(changes)
}

/** Neue Reihenfolge nach Drag & Drop. */
export function reorderTasks(dayId: ID, orderedIds: ID[]): void {
  const s = getState()
  const byId = new Map(tasksOfDay(s, dayId).map((t) => [t.id, t]))
  const ordered = orderedIds.map((id) => byId.get(id)).filter((t): t is Task => !!t)
  commit({ tasks: renumber(ordered) })
}

/** Aufgabe als erledigt markieren (oder wieder öffnen). */
export function setTaskCompleted(taskId: ID, done: boolean): void {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task) return
  const changes: Changes = { tasks: [{ ...task, completedAt: done ? Date.now() : null }] }
  // Die kurze Pause dieser Aufgabe ist damit vorbei – als Nächstes kommt die lange Pause.
  if (done && s.timer.phase === 'break' && s.timer.taskId === taskId) {
    changes.timer = { phase: 'idle' }
  }
  commit(changes)
}

/* ================================================================== */
/* Planen: Schritte                                                   */
/* ================================================================== */

export function addStep(taskId: ID, text: string): Step {
  const step: Step = {
    ...baseFields(Date.now()),
    taskId,
    text: text.trim(),
    position: stepsOfTask(getState(), taskId).length,
    doneAt: null,
  }
  commit({ steps: [step] })
  return step
}

export function updateStepText(stepId: ID, text: string): void {
  const step = getState().steps[stepId]
  if (step) commit({ steps: [{ ...step, text }] })
}

export function toggleStep(stepId: ID): void {
  const step = getState().steps[stepId]
  if (step) commit({ steps: [{ ...step, doneAt: step.doneAt === null ? Date.now() : null }] })
}

export function deleteStep(stepId: ID): void {
  const s = getState()
  const step = s.steps[stepId]
  if (!step) return
  const rest = stepsOfTask(s, step.taskId).filter((st) => st.id !== stepId)
  commit({ steps: [{ ...step, deletedAt: Date.now() }, ...renumber(rest)] })
}

/* ================================================================== */
/* Durchführen: Timer                                                 */
/* ================================================================== */

/** Einen Block für diese Aufgabe starten. */
export function startBlock(taskId: ID): void {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task || task.completedAt !== null || s.timer.phase === 'block') return
  const now = Date.now()
  const day = activeDay(s)
  commit({
    timer: {
      phase: 'block',
      taskId,
      dayId: day.id,
      startedAt: now,
      plannedMs: blockMinutesFor(s, task) * 60_000,
      pausedAt: null,
      pausedMs: 0,
    },
    days: day.firstWorkAt === null ? [{ ...day, firstWorkAt: now }] : undefined,
  })
}

export function pauseCurrentBlock(): void {
  const t = getState().timer
  if (t.phase === 'block') commit({ timer: timer.pauseBlock(t, Date.now()) })
}

export function resumeCurrentBlock(): void {
  const t = getState().timer
  if (t.phase === 'block') commit({ timer: timer.resumeBlock(t, Date.now()) })
}

/** Block abbrechen. Die bis dahin gearbeitete Zeit wird gespeichert. */
export function abortCurrentBlock(): void {
  if (getState().timer.phase !== 'block') return
  commit(stopTimerChanges(Date.now()))
}

/** Ein Ereignis, bei dem ein Ton (und evtl. eine Benachrichtigung) kommt. */
export interface TimerEvent {
  type: 'blockEnd' | 'breakEnd'
  taskTitle: string
  /** false = das Ereignis ist schon länger her (App war zu) → kein Ton. */
  fresh: boolean
}

/**
 * Prüft, ob ein Block oder eine Pause abgelaufen ist, und schaltet weiter.
 * Wird etwa jede Sekunde aufgerufen – und sofort, wenn das Fenster wieder
 * sichtbar wird. Gibt zurück, welche Töne gespielt werden sollen.
 */
export function checkTimer(now = Date.now()): TimerEvent[] {
  const s = getState()
  const events: TimerEvent[] = []
  let t = s.timer
  const changes: Changes = {}
  const titleOf = (taskId: ID) => s.tasks[taskId]?.title ?? ''

  // 1. Block abgelaufen → gilt als durchgehalten, die kurze Pause startet
  //    (so lang wie bei dieser Aufgabe eingestellt, sonst Standard).
  if (t.phase === 'block' && timer.isBlockFinished(t, now)) {
    const endedAt = timer.blockEndsAt(t)
    const task = s.tasks[t.taskId]
    const breakMinutes = task ? shortBreakMinutesFor(s, task) : s.settings.shortBreakMinutes
    changes.blocks = [blockRecord(t, 'completed', endedAt)]
    t = {
      phase: 'break',
      taskId: t.taskId,
      startedAt: endedAt,
      durationMs: breakMinutes * 60_000,
      endSignaled: false,
    }
    changes.timer = t
    events.push({ type: 'blockEnd', taskTitle: titleOf(t.taskId), fresh: now - endedAt < SIGNAL_MAX_DELAY_MS })
  }

  // 2. Kurze Pause abgelaufen → Ton, danach erscheint „Nächsten Block starten“.
  if (t.phase === 'break' && !t.endSignaled && timer.isBreakOver(t, now)) {
    const endedAt = timer.breakEndsAt(t)
    t = { ...t, endSignaled: true }
    changes.timer = t
    events.push({ type: 'breakEnd', taskTitle: titleOf(t.taskId), fresh: now - endedAt < SIGNAL_MAX_DELAY_MS })
  }

  if (changes.timer) commit(changes)
  return events
}

/** „Hauptaufgabe erledigt“ – beendet auch die kurze Pause. */
export function finishTask(taskId: ID): void {
  setTaskCompleted(taskId, true)
}

/**
 * „Noch ein Block“: Die Schätzung wird um einen Block erhöht.
 * Mit `startNow` startet der Block sofort (wenn die Pause schon vorbei ist).
 */
export function addExtraBlock(taskId: ID, startNow: boolean): void {
  const task = getState().tasks[taskId]
  if (!task) return
  commit({ tasks: [{ ...task, estimatedBlocks: task.estimatedBlocks + 1 }] })
  if (startNow) startBlock(taskId)
}

/* ================================================================== */
/* Tag beenden                                                        */
/* ================================================================== */

/** Welche Plätze wären beim Übertrag doppelt belegt? */
export function getEndDayConflicts(): CarryConflict[] {
  const s = getState()
  return mergeCarryOver(tasksOfDay(s, activeDay(s).id), tasksOfDay(s, plannedDay(s).id)).conflicts
}

/**
 * Tag beenden:
 *  - ein laufender Block wird gestoppt (Minuten werden gespeichert),
 *  - „morgen“ wird zu „heute“, ein neuer leerer „morgen“ entsteht,
 *  - nicht erledigte Aufgaben wandern auf ihren alten Platz.
 */
export function endDay(choices: ConflictChoices = {}): void {
  const now = Date.now()
  checkTimer(now) // ein inzwischen abgelaufener Block zählt noch als durchgehalten

  const s = getState()
  const oldDay = activeDay(s)
  const nextDay = plannedDay(s)
  const { order } = mergeCarryOver(tasksOfDay(s, oldDay.id), tasksOfDay(s, nextDay.id), choices)

  const changes: Changes = s.timer.phase === 'idle' ? {} : stopTimerChanges(now)
  changes.tasks = order.map((task, index) => ({ ...task, dayId: nextDay.id, position: index }))
  changes.days = [
    { ...oldDay, status: 'ended', endedAt: now },
    { ...nextDay, status: 'active', startedAt: now },
    { ...baseFields(now), status: 'planned', startedAt: null, endedAt: null, firstWorkAt: null },
  ]
  changes.local = { ...s.local, endDayPromptDismissedOn: null }
  commit(changes)
}

/** „Nein, ich arbeite noch daran“ – heute nicht mehr fragen. */
export function dismissEndDayPrompt(now = Date.now()): void {
  commit({ local: { ...getState().local, endDayPromptDismissedOn: dayKey(now) } })
}

/* ================================================================== */
/* Einstellungen und Notizzettel                                      */
/* ================================================================== */

export function updateSettings(patch: Partial<SettingsValues>): void {
  const current = getState().settings
  const next = { ...current, ...patch }
  for (const key of Object.keys(SETTINGS_LIMITS) as (keyof typeof SETTINGS_LIMITS)[]) {
    const { min, max } = SETTINGS_LIMITS[key]
    next[key] = clamp(Math.round(Number(next[key]) || min), min, max)
  }
  commit({ settings: next })
}

export function updateNote(text: string): void {
  commit({ note: { ...getState().note, text } })
}

/* ================================================================== */
/* Hilfsfunktionen                                                    */
/* ================================================================== */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Vergibt neue Positionen 0, 1, 2 … und gibt nur geänderte Einträge zurück. */
function renumber<T extends { position: number }>(items: T[]): T[] {
  return items.flatMap((item, index) => (item.position === index ? [] : [{ ...item, position: index }]))
}

/** Macht aus dem laufenden Block einen gespeicherten Block-Eintrag. */
function blockRecord(t: timer.BlockTimer, status: BlockStatus, endedAt: number): Block {
  return {
    ...baseFields(Date.now()),
    taskId: t.taskId,
    dayId: t.dayId,
    startedAt: t.startedAt,
    endedAt,
    plannedMinutes: Math.round(t.plannedMs / 60_000),
    pausedMs: timer.blockPausedMs(t, endedAt),
    workedSeconds: Math.round(timer.blockWorkedMs(t, endedAt) / 1000),
    status,
  }
}

/** Stoppt Block oder Pause. Ein laufender Block wird als abgebrochen gespeichert. */
function stopTimerChanges(now: number): Changes {
  const t = getState().timer
  const changes: Changes = { timer: { phase: 'idle' } }
  if (t.phase === 'block') changes.blocks = [blockRecord(t, 'aborted', now)]
  return changes
}
