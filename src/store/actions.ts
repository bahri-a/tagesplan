/**
 * AKTIONEN
 * ========
 * Alles, was Daten verändert, steht hier – z. B. „Aufgabe anlegen“,
 * „Block starten“ oder „Tag beenden“. Die Oberfläche ruft nur diese
 * Funktionen auf.
 */

import { BLOCK_WARNING_MS, SETTINGS_LIMITS, SIGNAL_MAX_DELAY_MS, BLOCK_EXTEND_MS, BLOCK_EXTEND_OFFER_MS } from '../config/defaults'
import { mergeCarryOver, type CarryConflict, type ConflictChoices } from '../logic/carryOver'
import { baseFields } from '../logic/records'
import * as timer from '../logic/timer'
import { stripStartCuePrefix } from '../logic/variety'
import type { Block, BlockStatus, ID, SettingsValues, Step, Task, TimerState } from '../model/types'
import {
  activeDay,
  blockMinutesFor,
  blocksDone,
  canUndoExtraBlock,
  extraBlockStartsNow,
  lastBlockEndedAt,
  plannedDay,
  recentKey,
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
    // Gemerktes Startsignal (Häkchen „Für alle neuen Hauptaufgaben“) – pro Aufgabe änderbar.
    startCue: s.settings.defaultStartCue,
    firstEstimatedBlocks: null,
  }
  commit({ tasks: [task] })
  return task
}

/**
 * Eine Hauptaufgabe auf einen Tag kopieren (ans Ende): Titel, erste Schritte (nicht abgehakt),
 * Blockanzahl, individuelle Blocklänge/Pause und Startsignal. Blöcke und „erledigt“ nicht.
 * Für „Für morgen kopieren“ und „Zuletzt verwendet“.
 */
export function copyTask(taskId: ID, dayId: ID): Task | null {
  const s = getState()
  const source = s.tasks[taskId]
  if (!source) return null
  const now = Date.now()
  const task: Task = {
    ...baseFields(now),
    dayId,
    title: source.title,
    position: tasksOfDay(s, dayId).length,
    estimatedBlocks: source.estimatedBlocks,
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
    // Beim allerersten Block die damalige Schätzung merken (für Version 2, unsichtbar).
    tasks: task.firstEstimatedBlocks === null ? [{ ...task, firstEstimatedBlocks: task.estimatedBlocks }] : undefined,
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

/**
 * „Früher fertig“: Der laufende (oder pausierte) Block wird jetzt erfolgreich abgeschlossen –
 * als Ausnahme nur für diesen einen Block. Er zählt als durchgehalten, gespeichert wird die
 * wirklich gearbeitete Zeit, und die kurze Pause startet sofort. Die Blocklänge der Aufgabe
 * und die nächsten Blöcke bleiben unverändert.
 */
export function finishBlockEarly(now = Date.now()): void {
  const t = getState().timer
  if (t.phase !== 'block') return
  const { blocks, timer: next } = completeBlockChanges(t, now)
  commit({ blocks, timer: next })
}

/**
 * „Habe ich bereits erledigt“: Der Block wurde ohne App gemacht. Er zählt als durchgehalten
 * mit voller geplanter Zeit. Keine Pause danach – der nächste Block kann gleich starten.
 */
export function skipBlockAsDone(now = Date.now()): void {
  const t = getState().timer
  if (t.phase !== 'block') return
  const { blocks } = completeBlockChanges(t, now)
  const done = (blocks ?? []).map((b) => ({ ...b, pausedMs: 0, workedSeconds: Math.round(t.plannedMs / 1000) }))
  commit({ blocks: done, timer: { phase: 'idle' } })
}

/**
 * Block abbrechen. Die bis dahin gearbeitete Zeit wird gespeichert, der Block zählt aber nicht:
 * Beim nächsten Start kommt genau dieser Block noch einmal (fürs Beenden gibt es „Früher fertig“).
 */
export function abortCurrentBlock(): void {
  if (getState().timer.phase !== 'block') return
  commit(stopTimerChanges(Date.now()))
}

/** Ein Ereignis, bei dem ein Ton (und evtl. eine Benachrichtigung) kommt. */
export interface TimerEvent {
  /** 'blockWarning' = sanfte Vorwarnung kurz vor dem Blockende (nur ein leiser Ton). */
  type: 'blockWarning' | 'blockEnd' | 'breakEnd'
  taskTitle: string
  /** false = das Ereignis ist schon länger her (App war zu) → kein Ton. */
  fresh: boolean
  /** Nur bei 'blockEnd': war das der letzte geschätzte Block (dann keine Pause)? */
  lastBlock?: boolean
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

  // 0. Kurz vor dem Ende: einmal sanft vorwarnen (nicht bei sehr kurzen Blöcken).
  if (t.phase === 'block' && !t.warned && isInWarningTime(t, now)) {
    const warnedAt = timer.blockEndsAt(t) - BLOCK_WARNING_MS
    t = { ...t, warned: true }
    changes.timer = t
    events.push({ type: 'blockWarning', taskTitle: titleOf(t.taskId), fresh: now - warnedAt < SIGNAL_MAX_DELAY_MS })
  }

  // 1. Block abgelaufen → gilt als durchgehalten, die kurze Pause startet
  //    (so lang wie bei dieser Aufgabe eingestellt, sonst Standard).
  if (t.phase === 'block' && timer.isBlockFinished(t, now)) {
    const endedAt = timer.blockEndsAt(t)
    const { lastBlock, ...completed } = completeBlockChanges(t, endedAt)
    const taskTitle = titleOf(t.taskId)
    const fresh = now - endedAt < SIGNAL_MAX_DELAY_MS
    // Ultra-Modus: Beginnt eine kurze Pause, piept es (nur wenn das Blockende gerade erst war),
    // bis die Pause bestätigt ist. Nach dem letzten Block (keine kurze Pause) piept es nicht.
    // In der iPhone-App auch, wenn das Blockende länger her ist: Dort hat die Mitteilung auf dem
    // gesperrten Display schon geklingelt – die Pause beginnt trotzdem erst mit „Pause machen“.
    if ((fresh || __NATIVE_APP__) && s.settings.ultraMode && completed.timer.phase === 'break') {
      completed.timer = { ...completed.timer, nagging: true }
    }
    Object.assign(changes, completed)
    t = completed.timer
    events.push({ type: 'blockEnd', taskTitle, fresh, lastBlock })
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

/**
 * Ultra-Modus: Soll gerade gepiept werden? Ja, solange die fällige Pause nicht bestätigt ist,
 * noch läuft – und der Modus an ist. Nach dem letzten Block piept es nicht.
 */
export function isUltraRinging(now = Date.now()): boolean {
  const s = getState()
  const t = s.timer
  return (
    t.phase === 'break' &&
    t.nagging === true &&
    !t.endSignaled &&
    s.settings.ultraMode &&
    s.settings.sounds &&
    now >= t.startedAt &&
    now < t.startedAt + t.durationMs
  )
}

/** „Pause machen“: Im Ultra-Modus hört das Piepen auf – erst jetzt beginnt die Pause zu zählen. */
export function confirmBreak(now = Date.now()): void {
  const t = getState().timer
  if (t.phase !== 'break' || t.endSignaled || !t.nagging) return
  commit({ timer: { ...t, nagging: false, startedAt: Math.max(t.startedAt, now) } })
}

/**
 * „Pause überspringen“: Die kurze Pause ist sofort vorbei (ohne Ton), danach kommt wie
 * gewohnt „Nächsten Block starten“. Im Ultra-Modus hört damit auch das Piepen auf.
 */
export function skipBreak(): void {
  const t = getState().timer
  if (t.phase !== 'break' || t.endSignaled) return
  commit({ timer: { ...t, nagging: false, endSignaled: true } })
}

/** Wird „+2 Min.“ gerade angeboten? Nur in den letzten 5 Minuten eines laufenden Blocks. */
export function canExtendBlock(t: timer.BlockTimer, now: number): boolean {
  if (t.pausedAt !== null) return false
  const remaining = timer.blockRemainingMs(t, now)
  return remaining > 0 && remaining <= BLOCK_EXTEND_OFFER_MS
}

/** „+2 Min.“: Der laufende Block wird 2 Minuten länger. Die kurze Pause danach bleibt, wie sie ist. */
export function extendBlock(now = Date.now()): void {
  const t = getState().timer
  if (t.phase !== 'block' || !canExtendBlock(t, now)) return
  commit({ timer: { ...t, plannedMs: t.plannedMs + BLOCK_EXTEND_MS } })
}

/**
 * Läuft der Block gerade in den letzten Minuten (Vorwarnzeit)? Pausiert zählt nicht.
 * Bei Blöcken, die höchstens doppelt so lang wie die Vorwarnzeit sind, gibt es keine Vorwarnung.
 */
export function isInWarningTime(t: timer.BlockTimer, now: number): boolean {
  if (t.pausedAt !== null || t.plannedMs <= 2 * BLOCK_WARNING_MS) return false
  const remaining = timer.blockRemainingMs(t, now)
  return remaining > 0 && remaining <= BLOCK_WARNING_MS
}

/** Lange Pause vorbei („Weiter“): Die nächste Aufgabe erscheint – auch nach einem Neuladen. */
export function endLongPause(taskId: ID): void {
  const s = getState()
  if (s.local.longPauseEndedFor !== taskId) commit({ local: { ...s.local, longPauseEndedFor: taskId } })
}

/** „Hauptaufgabe erledigt“ – beendet auch die kurze Pause. */
export function finishTask(taskId: ID): void {
  setTaskCompleted(taskId, true)
}

/**
 * „Noch ein Block“: Die Schätzung wird um einen Block erhöht.
 *  - Ist der letzte Block erst kurz her, läuft zuerst der Rest der kurzen Pause (gerechnet ab
 *    dem Blockende), danach kommt wie gewohnt „Nächsten Block starten“.
 *  - Sonst startet der Block sofort (siehe `extraBlockStartsNow`).
 */
export function addExtraBlock(taskId: ID, now = Date.now()): void {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task || s.timer.phase === 'block') return
  const startNow = extraBlockStartsNow(s, task, now)
  const lastEnd = lastBlockEndedAt(s, taskId)
  const changes: Changes = {
    tasks: [{ ...task, estimatedBlocks: task.estimatedBlocks + 1 }],
    // Merken, damit „Zurück“ die Schätzung wieder herstellen kann.
    local: { ...s.local, extraBlock: { taskId, previousEstimate: task.estimatedBlocks } },
  }
  if (!startNow && s.timer.phase === 'idle' && lastEnd !== null) {
    const durationMs = shortBreakMinutesFor(s, task) * 60_000
    changes.timer = { phase: 'break', taskId, startedAt: lastEnd, durationMs, endSignaled: false }
  }
  commit(changes)
  if (startNow) startBlock(taskId)
}

/**
 * „Zurück“ nach „Noch ein Block“: Die Schätzung wird wieder wie vorher, die Frage
 * „Erledigt oder noch ein Block?“ ist wieder da. Eine dafür gestartete kurze Pause endet.
 * Läuft der zusätzliche Block schon (erst kurz, siehe `canUndoExtraBlock`), zählt er nicht
 * als Block – die darin gearbeiteten Minuten werden aber gespeichert (Status 'undone').
 */
export function undoExtraBlock(now = Date.now()): void {
  const s = getState()
  const mark = s.local.extraBlock
  const task = mark ? s.tasks[mark.taskId] : undefined
  if (!mark || !task || !canUndoExtraBlock(s, task, now)) return
  const changes: Changes = {
    tasks: [{ ...task, estimatedBlocks: mark.previousEstimate }],
    local: { ...s.local, extraBlock: null },
  }
  if (s.timer.phase === 'block') changes.blocks = [blockRecord(s.timer, 'undone', now)]
  if (s.timer.phase !== 'idle') changes.timer = { phase: 'idle' }
  commit(changes)
}

/* ================================================================== */
/* Tag beenden                                                        */
/* ================================================================== */

/** Welche Plätze wären beim Übertrag doppelt belegt? */
export function getEndDayConflicts(dropped: ReadonlySet<ID> = new Set()): CarryConflict[] {
  const s = getState()
  return mergeCarryOver(tasksOfDay(s, activeDay(s).id), tasksOfDay(s, plannedDay(s).id), {}, dropped).conflicts
}

/**
 * Tag beenden:
 *  - ein laufender Block wird gestoppt (Minuten werden gespeichert),
 *  - „morgen“ wird zu „heute“, ein neuer leerer „morgen“ entsteht,
 *  - nicht erledigte Aufgaben wandern auf ihren alten Platz,
 *  - gestrichene (× bei der Platzwahl): übertragene bleiben beim alten Tag zurück,
 *    geplante werden gelöscht.
 */
export function endDay(choices: ConflictChoices = {}, dropped: ReadonlySet<ID> = new Set()): void {
  const now = Date.now()
  checkTimer(now) // ein inzwischen abgelaufener Block zählt noch als durchgehalten

  const plannedId = plannedDay(getState()).id
  for (const id of dropped) {
    if (getState().tasks[id]?.dayId === plannedId) deleteTask(id)
  }

  const s = getState()
  const oldDay = activeDay(s)
  const nextDay = plannedDay(s)
  const { order } = mergeCarryOver(tasksOfDay(s, oldDay.id), tasksOfDay(s, nextDay.id), choices, dropped)

  const changes: Changes = s.timer.phase === 'idle' ? {} : stopTimerChanges(now)
  changes.tasks = order.map((task, index) => ({ ...task, dayId: nextDay.id, position: index }))
  changes.days = [
    { ...oldDay, status: 'ended', endedAt: now },
    { ...nextDay, status: 'active', startedAt: now },
    { ...baseFields(now), status: 'planned', startedAt: null, endedAt: null, firstWorkAt: null },
  ]
  changes.local = { ...s.local, extraBlock: null, longPauseEndedFor: null }
  commit(changes)
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
  // Ultra-Modus aus, während eine Pause auf Bestätigung wartet → die Pause beginnt jetzt.
  if (current.ultraMode && !next.ultraMode) confirmBreak()
  commit({ settings: next })
}

/**
 * Häkchen unter dem Startsignal: Diesen Satz für alle neuen Hauptaufgaben merken (`null` = vergessen).
 * Bestehende Aufgaben bleiben unverändert.
 */
export function rememberStartCue(cue: string | null): void {
  const current = getState().settings
  const clean = cue === null ? null : stripStartCuePrefix(cue).trim() || null
  commit({ settings: { ...current, defaultStartCue: clean } })
}

/**
 * × in „Zuletzt verwendet“: diesen Titel dort nicht mehr anbieten. Die Aufgaben selbst bleiben
 * unverändert. Wird eine Aufgabe mit diesem Titel später wieder benutzt, taucht sie wieder auf.
 */
export function hideRecentTask(title: string, now = Date.now()): void {
  const current = getState().settings
  commit({ settings: { ...current, recentHidden: { ...current.recentHidden, [recentKey(title)]: now } } })
}

/** „Reset“ in „Zuletzt verwendet“: alle Titel auf einmal ausblenden (wie × bei jedem einzelnen). */
export function hideAllRecentTasks(titles: string[], now = Date.now()): void {
  const current = getState().settings
  const recentHidden = { ...current.recentHidden }
  for (const title of titles) recentHidden[recentKey(title)] = now
  commit({ settings: { ...current, recentHidden } })
}

export function updateNote(text: string): void {
  commit({ note: { ...getState().note, text } })
}

/** Taste N: einen Gedanken als neue Zeile unten an den Notizzettel hängen. */
export function parkThought(thought: string): void {
  const text = thought.trim()
  if (!text) return
  const current = getState().note.text.replace(/\s+$/, '')
  updateNote(current ? `${current}\n${text}` : text)
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

/**
 * Block als durchgehalten speichern. Danach startet die kurze Pause (Länge dieser Aufgabe)
 * ab `endedAt` – außer nach dem letzten geschätzten Block: Dann gibt es keine Pause, sondern
 * gleich die Frage „Erledigt oder noch ein Block?“ (`lastBlock` = true).
 */
function completeBlockChanges(t: timer.BlockTimer, endedAt: number): Changes & { timer: TimerState; lastBlock: boolean } {
  const s = getState()
  const task = s.tasks[t.taskId]
  const lastBlock = task !== undefined && blocksDone(s, task.id) + 1 >= task.estimatedBlocks
  const breakMinutes = task ? shortBreakMinutesFor(s, task) : s.settings.shortBreakMinutes
  return {
    blocks: [blockRecord(t, 'completed', endedAt)],
    timer: lastBlock
      ? { phase: 'idle' }
      : { phase: 'break', taskId: t.taskId, startedAt: endedAt, durationMs: breakMinutes * 60_000, endSignaled: false },
    lastBlock,
  }
}

/** Stoppt Block oder Pause. Ein laufender Block wird als abgebrochen gespeichert. */
function stopTimerChanges(now: number): Changes {
  const t = getState().timer
  const changes: Changes = { timer: { phase: 'idle' } }
  if (t.phase === 'block') changes.blocks = [blockRecord(t, 'aborted', now)]
  return changes
}
