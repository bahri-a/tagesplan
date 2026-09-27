/**
 * ABFRAGEN
 * ========
 * Kleine Funktionen, die aus dem Zustand etwas herauslesen, z. B.
 * „Welche Aufgabe ist gerade dran?“. Sie ändern nichts.
 */

import { dayKey } from '../logic/time'
import { alive, sortByPosition } from '../logic/records'
import type { Block, Day, ID, Step, Task } from '../model/types'
import type { AppState } from './store'

/** Der aktive Tag („heute“). */
export function activeDay(s: AppState): Day {
  const day = alive(Object.values(s.days)).find((d) => d.status === 'active')
  if (!day) throw new Error('Kein aktiver Tag vorhanden.')
  return day
}

/** Der geplante Tag („morgen“). */
export function plannedDay(s: AppState): Day {
  const day = alive(Object.values(s.days)).find((d) => d.status === 'planned')
  if (!day) throw new Error('Kein geplanter Tag vorhanden.')
  return day
}

/** Alle Hauptaufgaben eines Tages in ihrer Reihenfolge (erledigte eingeschlossen). */
export function tasksOfDay(s: AppState, dayId: ID): Task[] {
  return sortByPosition(alive(Object.values(s.tasks)).filter((t) => t.dayId === dayId))
}

/** Alle Schritte einer Hauptaufgabe in ihrer Reihenfolge. */
export function stepsOfTask(s: AppState, taskId: ID): Step[] {
  return sortByPosition(alive(Object.values(s.steps)).filter((st) => st.taskId === taskId))
}

/** Alle Blöcke einer Hauptaufgabe (über alle Tage). */
export function blocksOfTask(s: AppState, taskId: ID): Block[] {
  return alive(Object.values(s.blocks)).filter((b) => b.taskId === taskId)
}

/**
 * Wie viele Blöcke für diese Aufgabe schon gemacht wurden.
 * Durchgehaltene UND abgebrochene Blöcke zählen mit.
 */
export function blocksDone(s: AppState, taskId: ID): number {
  return blocksOfTask(s, taskId).length
}

/** Blocklänge für diese Aufgabe in Minuten (eigene oder Standard). */
export function blockMinutesFor(s: AppState, task: Task): number {
  return task.blockMinutesOverride ?? s.settings.blockMinutes
}

/** Die Aufgabe, die gerade dran ist: die oberste noch nicht erledigte von heute. */
export function currentTask(s: AppState): Task | undefined {
  return tasksOfDay(s, activeDay(s).id).find((t) => t.completedAt === null)
}

/** Der aktuelle Schritt: der erste noch nicht abgehakte. */
export function currentStep(s: AppState, taskId: ID): Step | undefined {
  return stepsOfTask(s, taskId).find((st) => st.doneAt === null)
}

/**
 * Soll vor dieser Aufgabe der Knopf „Lange Pause gemacht – weiter mit …“
 * erscheinen? Ja, wenn heute schon an einer ANDEREN Aufgabe gearbeitet wurde,
 * an dieser aber noch nicht. Vor der ersten Aufgabe des Tages also nie.
 */
export function needsLongPause(s: AppState, task: Task): boolean {
  const dayId = activeDay(s).id
  const blocksToday = alive(Object.values(s.blocks)).filter((b) => b.dayId === dayId)
  return blocksToday.length > 0 && !blocksToday.some((b) => b.taskId === task.id)
}

/**
 * Sind alle geschätzten Blöcke gemacht? Dann fragt die App:
 * „Hauptaufgabe erledigt oder noch ein Block?“
 */
export function isAskingDone(s: AppState, task: Task): boolean {
  return task.completedAt === null && blocksDone(s, task.id) >= task.estimatedBlocks
}

/**
 * Soll beim Öffnen gefragt werden, ob der vorherige Tag beendet werden soll?
 * Ja, wenn am aktiven Tag schon gearbeitet wurde, seitdem ein neuer
 * Kalendertag begonnen hat (Wechsel um 4 Uhr) und du heute noch nicht
 * „Nein“ gesagt hast. Während ein Block läuft, wird nie gefragt.
 */
export function shouldAskToEndPreviousDay(s: AppState, now: number): boolean {
  const day = activeDay(s)
  if (day.firstWorkAt === null) return false
  if (s.timer.phase === 'block') return false
  const today = dayKey(now)
  if (dayKey(day.firstWorkAt) >= today) return false
  return s.local.endDayPromptDismissedOn !== today
}
