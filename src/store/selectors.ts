/**
 * ABFRAGEN
 * ========
 * Kleine Funktionen, die aus dem Zustand etwas herauslesen, z. B.
 * „Welche Aufgabe ist gerade dran?“. Sie ändern nichts.
 */

import { UNDO_EXTRA_BLOCK_MS } from '../config/defaults'
import { dayKey } from '../logic/time'
import { blockWorkedMs, isBreakOver } from '../logic/timer'
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
 * Blöcke, die für „Block n von m“ zählen: nur durchgehaltene (auch „Früher fertig“).
 * Ein abgebrochener Block zählt nicht – beim nächsten Mal kommt genau dieser Block noch einmal.
 */
function countedBlocks(s: AppState, taskId: ID): Block[] {
  return blocksOfTask(s, taskId).filter((b) => b.status === 'completed')
}

/** Angefangene Blöcke: durchgehaltene und abgebrochene (nicht zurückgenommene). */
function startedBlocks(s: AppState, taskId: ID): Block[] {
  return blocksOfTask(s, taskId).filter((b) => b.status !== 'undone')
}

/**
 * Was an dieser Aufgabe gearbeitet wurde (über alle Tage): gezählte Blöcke und echte Minuten
 * (auch aus abgebrochenen und zurückgenommenen Blöcken, ohne Pausen).
 */
export function taskWork(s: AppState, taskId: ID): { blocks: number; minutes: number } {
  const seconds = blocksOfTask(s, taskId).reduce((sum, b) => sum + b.workedSeconds, 0)
  return { blocks: countedBlocks(s, taskId).length, minutes: Math.round(seconds / 60) }
}

/**
 * „Zuletzt verwendet“ in „Planen“: die zuletzt benutzten Hauptaufgaben, jeder Titel nur einmal
 * (die jüngste Aufgabe mit diesem Titel), ohne Titel, die auf `dayId` schon stehen.
 * „Benutzt“ = angelegt, daran gearbeitet oder erledigt – je nachdem, was zuletzt war.
 * Per × ausgeblendete Titel fehlen, bis sie wieder benutzt werden.
 */
/** Vergleichsschlüssel für Titel in „Zuletzt verwendet“ (ohne Leerzeichen am Rand, klein). */
export function recentKey(title: string): string {
  return title.trim().toLocaleLowerCase('de')
}

export function recentTasks(s: AppState, dayId: ID, limit: number): Task[] {
  const key = recentKey
  const hidden = s.settings.recentHidden ?? {}
  const lastWork = new Map<ID, number>()
  for (const b of alive(Object.values(s.blocks))) {
    lastWork.set(b.taskId, Math.max(lastWork.get(b.taskId) ?? 0, b.endedAt))
  }
  // Auch gelöschte Aufgaben zählen: Löschen ist „gerade nicht, aber bald wieder“.
  const usedAt = (t: Task) => Math.max(t.createdAt, t.completedAt ?? 0, t.deletedAt ?? 0, lastWork.get(t.id) ?? 0)
  const onDay = new Set(tasksOfDay(s, dayId).map((t) => key(t.title)))
  const seen = new Set<string>()
  const result: Task[] = []
  const tasks = Object.values(s.tasks).sort((a, b) => usedAt(b) - usedAt(a))
  for (const task of tasks) {
    const k = key(task.title)
    if (!k || onDay.has(k) || seen.has(k)) continue
    // Per × ausgeblendet – außer die Aufgabe wurde danach wieder benutzt.
    if (hidden[k] !== undefined && usedAt(task) <= hidden[k]) continue
    seen.add(k)
    result.push(task)
    if (result.length === limit) break
  }
  return result
}

/** Wann der letzte Block dieser Aufgabe geendet hat (oder `null`). */
export function lastBlockEndedAt(s: AppState, taskId: ID): number | null {
  const ends = startedBlocks(s, taskId).map((b) => b.endedAt)
  return ends.length > 0 ? Math.max(...ends) : null
}

/**
 * Wie viele Blöcke für diese Aufgabe schon gemacht wurden.
 * Nur durchgehaltene Blöcke zählen, abgebrochene nicht.
 */
export function blocksDone(s: AppState, taskId: ID): number {
  return countedBlocks(s, taskId).length
}

/** Blocklänge für diese Aufgabe in Minuten (individuell oder Standard). */
export function blockMinutesFor(s: AppState, task: Task): number {
  return task.blockMinutesOverride ?? s.settings.blockMinutes
}

/** Länge der kurzen Pause nach einem Block dieser Aufgabe in Minuten (individuell oder Standard). */
export function shortBreakMinutesFor(s: AppState, task: Task): number {
  return task.shortBreakMinutesOverride ?? s.settings.shortBreakMinutes
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
 * Läuft für diese Aufgabe gerade etwas, das beim Löschen verloren ginge?
 * 'block' = ein Block (auch pausiert), 'break' = eine kurze Pause, die noch nicht vorbei ist.
 * Sonst `null`. (Danach fragt „Planen“ vor dem Löschen nach.)
 */
export function runningTimerOfTask(s: AppState, taskId: ID, now: number): 'block' | 'break' | null {
  const t = s.timer
  if (t.phase === 'idle' || t.taskId !== taskId) return null
  if (t.phase === 'block') return 'block'
  return isBreakOver(t, now) ? null : 'break'
}

/**
 * Soll vor dieser Aufgabe der Knopf „Lange Pause gemacht? / Weiter mit …“
 * erscheinen? Ja, wenn heute schon an einer ANDEREN Aufgabe gearbeitet wurde,
 * an dieser aber noch nicht. Vor der ersten Aufgabe des Tages also nie.
 */
export function needsLongPause(s: AppState, task: Task): boolean {
  const dayId = activeDay(s).id
  const blocksToday = alive(Object.values(s.blocks)).filter((b) => b.dayId === dayId)
  return blocksToday.length > 0 && !blocksToday.some((b) => b.taskId === task.id)
}

/**
 * Steht in „Heute“ gerade die Karte „Lange Pause“? Ja, nach einer erledigten Hauptaufgabe vor der
 * nächsten (siehe `needsLongPause`), solange nichts läuft und „Weiter“ noch nicht gedrückt wurde.
 */
export function isOnLongPause(s: AppState, task: Task): boolean {
  return s.timer.phase === 'idle' && needsLongPause(s, task) && s.local.longPauseEndedFor !== task.id
}

/**
 * Sind alle geschätzten Blöcke gemacht? Dann fragt die App:
 * „Hauptaufgabe erledigt oder noch ein Block?“
 */
export function isAskingDone(s: AppState, task: Task): boolean {
  return task.completedAt === null && blocksDone(s, task.id) >= task.estimatedBlocks
}

/**
 * An einem FRÜHEREN Tag angefangen (mindestens ein Block, auch abgebrochen), aber nicht alle
 * Blöcke geschafft und heute noch nicht weitergemacht? Dann fragt die App:
 * „Hier hast du schon angefangen. Weitermachen oder abschließen?“
 */
export function isAskingResume(s: AppState, task: Task): boolean {
  if (task.completedAt !== null || isAskingDone(s, task)) return false
  if (s.timer.phase !== 'idle' && s.timer.taskId === task.id) return false // schon weitergemacht
  const blocks = startedBlocks(s, task.id)
  const today = activeDay(s).id
  return blocks.length > 0 && blocks.every((b) => b.dayId !== today)
}

/**
 * Startet „Noch ein Block“ sofort einen Block? Nein, wenn der letzte Block erst so kurz her ist,
 * dass die kurze Pause noch laufen würde – dann kommt zuerst der Rest dieser Pause.
 */
export function extraBlockStartsNow(s: AppState, task: Task, now: number): boolean {
  if (s.timer.phase === 'block') return false
  if (s.timer.phase === 'break') return s.timer.endSignaled || isBreakOver(s.timer, now)
  const lastEnd = lastBlockEndedAt(s, task.id)
  return lastEnd === null || now - lastEnd >= shortBreakMinutesFor(s, task) * 60_000
}

/**
 * Gibt es nach „Noch ein Block“ noch den Weg zurück zur Frage „Erledigt oder noch ein Block?“
 * (z. B. nach einem Versehen oder nur zum Ausprobieren)? Ja, solange
 *  - dieser zusätzliche Block noch nicht geschafft oder abgebrochen ist,
 *  - die Schätzung seitdem nicht anders geändert wurde,
 *  - und – falls er schon läuft – erst kurz darin gearbeitet wurde (`UNDO_EXTRA_BLOCK_MS`).
 */
export function canUndoExtraBlock(s: AppState, task: Task, now: number): boolean {
  const mark = s.local.extraBlock
  if (!mark || mark.taskId !== task.id || task.completedAt !== null) return false
  if (task.estimatedBlocks !== mark.previousEstimate + 1) return false
  if (blocksDone(s, task.id) !== mark.previousEstimate) return false
  const t = s.timer
  if (t.phase === 'block') return t.taskId === task.id && blockWorkedMs(t, now) < UNDO_EXTRA_BLOCK_MS
  return true
}

/**
 * Soll in „Heute“ der leise Link „Neuen Tag beginnen“ erscheinen?
 * Ja, wenn am aktiven Tag schon gearbeitet wurde und seitdem ein neuer Kalendertag
 * begonnen hat (Wechsel um 4 Uhr). Gefragt wird nicht mehr – die App geht davon aus,
 * dass du am alten Tag weiterarbeitest. Während ein Block läuft, bleibt der Link weg.
 */
export function canStartNewDay(s: AppState, now: number): boolean {
  const day = activeDay(s)
  if (day.firstWorkAt === null) return false
  if (s.timer.phase === 'block') return false
  return dayKey(day.firstWorkAt) < dayKey(now)
}

/**
 * Kleiner Tagesertrag für „Tag beenden“: durchgehaltene Blöcke, gearbeitete Minuten
 * (auch aus abgebrochenen und dem gerade laufenden Block, ohne Pausen) und erledigte Aufgaben.
 */
export function dayYield(s: AppState, dayId: ID, now: number) {
  const blocks = Object.values(s.blocks).filter((b) => b.deletedAt === null && b.dayId === dayId)
  let workedSeconds = blocks.reduce((sum, b) => sum + b.workedSeconds, 0)
  if (s.timer.phase === 'block' && s.timer.dayId === dayId) {
    workedSeconds += blockWorkedMs(s.timer, now) / 1000
  }
  return {
    completedBlocks: blocks.filter((b) => b.status === 'completed').length,
    minutes: Math.round(workedSeconds / 60),
    doneTitles: tasksOfDay(s, dayId)
      .filter((t) => t.completedAt !== null)
      .map((t) => t.title),
  }
}
