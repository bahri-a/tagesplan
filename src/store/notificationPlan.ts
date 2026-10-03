/**
 * MITTEILUNGEN DER IPHONE-APP PLANEN
 * ==================================
 * Ist das iPhone gesperrt, läuft die App nicht weiter – sie kann am Blockende also keinen Ton
 * spielen. Deshalb werden die Mitteilungen schon vorher beim iPhone „bestellt“: Beim Start
 * eines Blocks für das Blockende (und das Ende der anschließenden kurzen Pause), beim
 * Pausieren wird alles wieder abbestellt.
 *
 * Diese Datei rechnet nur aus, WAS geplant sein soll (reine Logik, mit Tests).
 * Das Bestellen beim iPhone übernimmt signals/nativeNotifications.ts.
 */

import { T } from '../config/texts'
import * as timer from '../logic/timer'
import { blocksDone, shortBreakMinutesFor } from './selectors'
import type { AppState } from './store'

export interface PlannedNotification {
  /** Feste Nummer je Art – eine neue Planung ersetzt die alte. */
  id: number
  kind: 'blockEnd' | 'breakEnd'
  /** Zeitpunkt in Millisekunden */
  at: number
  title: string
  body: string
}

export const NOTIFICATION_IDS = { blockEnd: 1, breakEnd: 2 } as const

/** Alle Mitteilungen, die für den jetzigen Timer-Zustand geplant sein sollen. */
export function plannedNotifications(s: AppState): PlannedNotification[] {
  const t = s.timer
  const task = t.phase === 'idle' ? undefined : s.tasks[t.taskId]
  const title = task?.title ?? ''

  if (t.phase === 'block') {
    if (t.pausedAt !== null) return [] // pausiert: nichts läuft ab
    const blockEnd = timer.blockEndsAt(t)
    const lastBlock = task !== undefined && blocksDone(s, task.id) + 1 >= task.estimatedBlocks
    const list: PlannedNotification[] = [
      {
        id: NOTIFICATION_IDS.blockEnd,
        kind: 'blockEnd',
        at: blockEnd,
        title: T.notification.blockEndTitle,
        body: lastBlock ? T.notification.lastBlockEndBody(title) : T.notification.blockEndBody(title),
      },
    ]
    // Danach startet die kurze Pause von selbst – ihr Ende also gleich mit planen.
    // Nicht nach dem letzten Block (dann gibt es keine Pause) und nicht im Ultra-Modus
    // (dort beginnt die Pause erst mit „Pause machen“).
    if (!lastBlock && !s.settings.ultraMode) {
      const breakMs = (task ? shortBreakMinutesFor(s, task) : s.settings.shortBreakMinutes) * 60_000
      list.push(breakEndNotification(blockEnd + breakMs, title))
    }
    return list
  }

  if (t.phase === 'break' && !t.endSignaled && !t.nagging) {
    return [breakEndNotification(timer.breakEndsAt(t), title)]
  }
  return []
}

function breakEndNotification(at: number, title: string): PlannedNotification {
  return {
    id: NOTIFICATION_IDS.breakEnd,
    kind: 'breakEnd',
    at,
    title: T.notification.breakEndTitle,
    body: T.notification.breakEndBody(title),
  }
}

/**
 * Ultra-Modus: Die Mitteilung zum Blockende bleibt auf dem Display stehen, bis die Pause
 * bestätigt ist („Pause machen“) – bzw. nach dem letzten Block, bis die Frage
 * „Erledigt oder noch ein Block?“ beantwortet ist. Sonst darf sie verschwinden,
 * sobald die App offen ist.
 */
export function keepDeliveredNotifications(s: AppState): boolean {
  const t = s.timer
  if (t.phase === 'break') return t.nagging === true && !t.endSignaled
  if (t.phase === 'idle') return t.ultra !== undefined
  return false
}
