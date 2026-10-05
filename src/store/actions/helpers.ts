/**
 * Kleine Hilfen für die Aktionen (nicht für die Oberfläche gedacht).
 */

import { baseFields } from '../../logic/records'
import * as timer from '../../logic/timer'
import type { Block, BlockStatus, TimerState } from '../../model/types'
import { blocksDone, shortBreakMinutesFor } from '../selectors'
import { getState, type Changes } from '../store'
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Vergibt neue Positionen 0, 1, 2 … und gibt nur geänderte Einträge zurück. */
export function renumber<T extends { position: number }>(items: T[]): T[] {
  return items.flatMap((item, index) => (item.position === index ? [] : [{ ...item, position: index }]))
}

/** Macht aus dem laufenden Block einen gespeicherten Block-Eintrag. */
export function blockRecord(t: timer.BlockTimer, status: BlockStatus, endedAt: number): Block {
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
export function completeBlockChanges(t: timer.BlockTimer, endedAt: number): Changes & { timer: TimerState; lastBlock: boolean } {
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
export function stopTimerChanges(now: number): Changes {
  const t = getState().timer
  const changes: Changes = { timer: { phase: 'idle' } }
  if (t.phase === 'block') changes.blocks = [blockRecord(t, 'aborted', now)]
  return changes
}
