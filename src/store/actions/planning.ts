/**
 * AKTIONEN: PLANEN
 * Hauptaufgaben und ihre ersten Schritte anlegen, ändern, verschieben, löschen.
 */

import { EXAMPLE_TASK, SETTINGS_LIMITS } from '../../config/defaults'
import { T } from '../../config/texts'
import { baseFields } from '../../logic/records'
import type { ID, Step, Task } from '../../model/types'
import {
  activeDay,
  blocksNeeded,
  plannedDay,
  stepsOfTask,
  tasksOfDay,
} from '../selectors'
import { commit, getState, type Changes } from '../store'
import { clamp, renumber, stopTimerChanges } from './helpers'
import { SHOWS_START_CUE } from '../../platform/device'

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
    // Gemerktes Startsignal (Häkchen „Für alle neuen Hauptaufgaben“) – pro Aufgabe änderbar. Nur auf dem Mac.
    startCue: SHOWS_START_CUE ? s.settings.defaultStartCue : null,
    firstEstimatedBlocks: null,
  }
  commit({ tasks: [task] })
  return task
}

/**
 * Beim allerersten Start: eine Beispielaufgabe für heute – ein kurzer Block mit zwei ersten
 * Schritten. Man lernt die App, indem man sie benutzt. Löschen geht im Planer wie bei jeder Aufgabe.
 */
export function addExampleTask(): Task {
  const s = getState()
  const now = Date.now()
  const dayId = activeDay(s).id
  const task: Task = {
    ...baseFields(now),
    dayId,
    title: T.example.title,
    position: tasksOfDay(s, dayId).length,
    estimatedBlocks: EXAMPLE_TASK.blocks,
    blockMinutesOverride: EXAMPLE_TASK.blockMinutes,
    shortBreakMinutesOverride: null,
    completedAt: null,
    startCue: null,
    firstEstimatedBlocks: null,
  }
  const steps: Step[] = T.example.steps.map((text, position) => ({
    ...baseFields(now),
    taskId: task.id,
    text,
    position,
    doneAt: null,
  }))
  commit({ tasks: [task], steps })
  return task
}

/**
 * Eine Hauptaufgabe auf einen Tag kopieren (ans Ende): Titel, erste Schritte (nicht abgehakt),
 * Blockanzahl, individuelle Blocklänge/Pause und Startsignal. Blöcke und „erledigt“ nicht.
 * Für „Für morgen kopieren“ und „Zuletzt verwendet“.
 * `learn`: Wurde die Aufgabe schon einmal erledigt, bekommt die Kopie so viele Blöcke, wie damals
 * wirklich gebraucht wurden (für „Zuletzt verwendet“ – aus Erfahrung schätzen).
 */
export function copyTask(taskId: ID, dayId: ID, { learn = false } = {}): Task | null {
  const s = getState()
  const source = s.tasks[taskId]
  if (!source) return null
  const now = Date.now()
  const task: Task = {
    ...baseFields(now),
    dayId,
    title: source.title,
    position: tasksOfDay(s, dayId).length,
    estimatedBlocks: (learn && blocksNeeded(s, taskId)) || source.estimatedBlocks,
    blockMinutesOverride: source.blockMinutesOverride,
    shortBreakMinutesOverride: source.shortBreakMinutesOverride,
    completedAt: null,
    startCue: source.startCue,
    firstEstimatedBlocks: null,
  }
  const steps: Step[] = stepsOfTask(s, taskId).map((step) => ({
    ...step,
    ...baseFields(now),
    taskId: task.id,
    doneAt: null,
  }))
  commit({ tasks: [task], steps })
  return task
}

/**
 * Eine Hauptaufgabe per Drag & Drop auf den anderen Tag (heute ↔ morgen) schieben, an Platz
 * `index`. Läuft für sie gerade ein Block, passiert nichts (Rückgabe `false`). Eine kurze Pause
 * dieser Aufgabe endet dabei.
 */
export function moveTask(taskId: ID, dayId: ID, index: number): boolean {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task || task.dayId === dayId) return false
  if (s.timer.phase === 'block' && s.timer.taskId === taskId) return false
  const source = tasksOfDay(s, task.dayId).filter((t) => t.id !== taskId)
  const target = tasksOfDay(s, dayId)
  const place = clamp(index, 0, target.length)
  target.splice(place, 0, { ...task, dayId })
  // Die verschobene Aufgabe immer speichern – `renumber` lässt Einträge weg, deren Position
  // gleich bleibt (z. B. erste Karte → leerer Tag), dann ginge der neue Tag verloren.
  const renumbered = renumber(target).filter((t) => t.id !== taskId)
  const changes: Changes = {
    tasks: [...renumber(source), ...renumbered, { ...task, dayId, position: place }],
  }
  if (s.timer.phase === 'break' && s.timer.taskId === taskId) changes.timer = { phase: 'idle' }
  commit(changes)
  return true
}

/**
 * Heute und morgen tauschen: Alle Hauptaufgaben von heute wandern nach morgen und umgekehrt,
 * jeweils in ihrer Reihenfolge. Hat nur ein Tag Aufgaben, landen sie einfach auf dem anderen.
 * Läuft gerade ein Block, passiert nichts (Rückgabe `false`); eine kurze Pause endet dabei.
 */
export function swapDays(): boolean {
  const s = getState()
  if (s.timer.phase === 'block') return false
  const today = activeDay(s).id
  const tomorrow = plannedDay(s).id
  const fromToday = tasksOfDay(s, today)
  const fromTomorrow = tasksOfDay(s, tomorrow)
  if (fromToday.length === 0 && fromTomorrow.length === 0) return false
  const changes: Changes = {
    tasks: [
      ...fromToday.map((task, index) => ({ ...task, dayId: tomorrow, position: index })),
      ...fromTomorrow.map((task, index) => ({ ...task, dayId: today, position: index })),
    ],
  }
  if (s.timer.phase === 'break') changes.timer = { phase: 'idle' }
  commit(changes)
  return true
}

type TaskPatch = Partial<
  Pick<Task, 'title' | 'estimatedBlocks' | 'blockMinutesOverride' | 'shortBreakMinutesOverride' | 'startCue'>
>

/** Titel, Blockanzahl, individuelle Blocklänge oder individuelle kurze Pause ändern. */
export function updateTask(taskId: ID, patch: TaskPatch): void {
  const task = getState().tasks[taskId]
  if (!task) return
  const next = { ...task, ...patch }
  next.estimatedBlocks = Math.max(1, Math.round(next.estimatedBlocks))
  // Leeres Startsignal = keins.
  if (next.startCue !== null && next.startCue.trim() === '') next.startCue = null
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

/**
 * Hauptaufgabe (mit ihren Schritten) löschen – weich, also mit `deletedAt`.
 * Aufgabe und Schritte bekommen denselben Zeitpunkt; daran erkennt `restoreTask`,
 * was zusammen gelöscht wurde. Die Aufgabe behält ihre alte `position`.
 */
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

/**
 * „Rückgängig“ nach dem Löschen: Die Aufgabe kommt mit ihren ersten Schritten und
 * individuellen Werten zurück – auf ihren alten Platz, die anderen rücken wieder nach hinten.
 *  - Nur die Schritte, die zusammen mit der Aufgabe gelöscht wurden, kommen zurück
 *    (vorher einzeln entfernte Schritte bleiben weg).
 *  - Ein beim Löschen beendeter Block oder eine Pause kommt bewusst NICHT zurück.
 *  - Ist ihr Tag inzwischen beendet, passiert nichts (Rückgabe `false`).
 */
export function restoreTask(taskId: ID): boolean {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task || task.deletedAt === null) return false
  if (s.days[task.dayId]?.status === 'ended') return false

  const deletedAt = task.deletedAt
  const restored: Task = { ...task, deletedAt: null }
  const others = tasksOfDay(s, task.dayId)
  const place = Math.min(task.position, others.length)
  const ordered = [...others.slice(0, place), restored, ...others.slice(place)]
  const steps = Object.values(s.steps)
    .filter((st) => st.taskId === taskId && st.deletedAt === deletedAt)
    .map((st) => ({ ...st, deletedAt: null }))

  commit({
    tasks: ordered.flatMap((t, index) =>
      t === restored || t.position !== index ? [{ ...t, position: index }] : [],
    ),
    steps,
  })
  return true
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
