/**
 * AKTIONEN: TAG BEENDEN
 * „Morgen“ wird zu „heute“, offene Aufgaben wandern mit.
 */

import { mergeCarryOver, type CarryConflict, type ConflictChoices } from '../../logic/carryOver'
import { baseFields } from '../../logic/records'
import type { ID } from '../../model/types'
import { activeDay, plannedDay, tasksOfDay } from '../selectors'
import { commit, getState, type Changes } from '../store'
import { stopTimerChanges } from './helpers'
import { deleteTask } from './planning'
import { checkTimer } from './timer'

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
