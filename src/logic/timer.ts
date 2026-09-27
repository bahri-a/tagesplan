/**
 * TIMER-RECHNUNG
 * ==============
 * Reine Rechenfunktionen, ohne Seiteneffekte. Der Timer zählt nie Sekunden
 * mit, sondern rechnet immer aus Zeitpunkten (Start, Pausen, jetzt).
 * Dadurch stimmt die Zeit auch, wenn Chrome einen Hintergrund-Tab bremst
 * oder das Fenster zwischendurch geschlossen war.
 */

import type { TimerState } from '../model/types'

export type BlockTimer = Extract<TimerState, { phase: 'block' }>
export type BreakTimer = Extract<TimerState, { phase: 'break' }>

/** Zeitpunkt, an dem der Block endet (gilt, solange er nicht pausiert ist). */
export function blockEndsAt(t: BlockTimer): number {
  return t.startedAt + t.plannedMs + t.pausedMs
}

/** Gesamte Pausenzeit bis `now`, inklusive einer gerade laufenden Pause. */
export function blockPausedMs(t: BlockTimer, now: number): number {
  return t.pausedMs + (t.pausedAt !== null ? now - t.pausedAt : 0)
}

/** Verbleibende Zeit im Block. Während einer Pause bleibt sie stehen. */
export function blockRemainingMs(t: BlockTimer, now: number): number {
  const reference = t.pausedAt ?? now
  return Math.min(t.plannedMs, Math.max(0, blockEndsAt(t) - reference))
}

/** Tatsächlich gearbeitete Zeit (ohne Pausen), höchstens die geplante Länge. */
export function blockWorkedMs(t: BlockTimer, now: number): number {
  const worked = now - t.startedAt - blockPausedMs(t, now)
  return Math.min(t.plannedMs, Math.max(0, worked))
}

/** Ist der Block abgelaufen? (Ein pausierter Block läuft nie ab.) */
export function isBlockFinished(t: BlockTimer, now: number): boolean {
  return t.pausedAt === null && now >= blockEndsAt(t)
}

/** Block pausieren. */
export function pauseBlock(t: BlockTimer, now: number): BlockTimer {
  if (t.pausedAt !== null) return t
  return { ...t, pausedAt: now }
}

/** Pausierten Block fortsetzen: Die Pausenzeit wird aufaddiert. */
export function resumeBlock(t: BlockTimer, now: number): BlockTimer {
  if (t.pausedAt === null) return t
  return { ...t, pausedMs: t.pausedMs + (now - t.pausedAt), pausedAt: null }
}

/** Zeitpunkt, an dem die kurze Pause endet. */
export function breakEndsAt(t: BreakTimer): number {
  return t.startedAt + t.durationMs
}

/** Verbleibende Zeit der kurzen Pause. */
export function breakRemainingMs(t: BreakTimer, now: number): number {
  return Math.min(t.durationMs, Math.max(0, breakEndsAt(t) - now))
}

/** Ist die kurze Pause vorbei? */
export function isBreakOver(t: BreakTimer, now: number): boolean {
  return now >= breakEndsAt(t)
}

/** Anteil der vergangenen Zeit (0 bis 1) – für den Fortschrittsring. */
export function progress(totalMs: number, remainingMs: number): number {
  if (totalMs <= 0) return 1
  return Math.min(1, Math.max(0, 1 - remainingMs / totalMs))
}
