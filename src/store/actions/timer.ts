/**
 * AKTIONEN: TIMER
 * Blöcke starten, pausieren, beenden; kurze Pause, Ultra-Modus, „Noch ein Block“, lange Pause.
 */

import {
  BLOCK_WARNING_MS,
  SIGNAL_MAX_DELAY_MS,
  BLOCK_EXTEND_MS,
  BLOCK_EXTEND_OFFER_MS,
  SETTINGS_LIMITS,
} from '../../config/defaults'
import * as timer from '../../logic/timer'
import type { ID } from '../../model/types'
import {
  activeDay,
  blockMinutesFor,
  canUndoExtraBlock,
  extraBlockStartsNow,
  lastBlockEndedAt,
  shortBreakMinutesFor,
} from '../selectors'
import { commit, getState, type Changes } from '../store'
import { blockRecord, clamp, completeBlockChanges, stopTimerChanges } from './helpers'
import { setTaskCompleted } from './planning'

/**
 * Einen Block für diese Aufgabe starten. Mit `endsAt` (Fokus-Einladung per Link) endet er zu
 * dieser Zeit statt nach der eingestellten Blocklänge – zwischen 1 Minute und der längsten Blocklänge.
 */
export function startBlock(taskId: ID, { endsAt }: { endsAt?: number } = {}): void {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task || task.completedAt !== null || s.timer.phase === 'block') return
  const now = Date.now()
  const day = activeDay(s)
  const { min, max } = SETTINGS_LIMITS.blockMinutes
  const plannedMs =
    endsAt === undefined ? blockMinutesFor(s, task) * 60_000 : clamp(endsAt - now, min * 60_000, max * 60_000)
  commit({
    timer: {
      phase: 'block',
      taskId,
      dayId: day.id,
      startedAt: now,
      plannedMs,
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
 * „Schon ohne App erledigt?“: Der Block wurde ohne App gemacht. Er zählt als durchgehalten
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
 * „Schon ohne App erledigt?“ schon vor dem Start: Der Block wurde ganz ohne App gemacht.
 * Er wird mit voller geplanter Zeit (bis jetzt) als durchgehalten eingetragen, ohne Pause danach.
 * Eine abgelaufene kurze Pause endet dabei.
 */
export function logBlockAsDone(taskId: ID, now = Date.now()): void {
  const s = getState()
  const task = s.tasks[taskId]
  if (!task || task.completedAt !== null || s.timer.phase === 'block') return
  const day = activeDay(s)
  const plannedMs = blockMinutesFor(s, task) * 60_000
  const ran: timer.BlockTimer = {
    phase: 'block',
    taskId,
    dayId: day.id,
    startedAt: now - plannedMs,
    plannedMs,
    pausedAt: null,
    pausedMs: 0,
  }
  commit({
    blocks: [blockRecord(ran, 'completed', now)],
    timer: { phase: 'idle' },
    days: day.firstWorkAt === null ? [{ ...day, firstWorkAt: ran.startedAt }] : undefined,
    tasks: task.firstEstimatedBlocks === null ? [{ ...task, firstEstimatedBlocks: task.estimatedBlocks }] : undefined,
  })
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
