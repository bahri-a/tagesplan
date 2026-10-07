/**
 * Dialog „Tag beenden“.
 *  1. Kurze Rückfrage (entfällt, wenn du über „Willkommen zurück“ kommst).
 *  2. Falls zwei Aufgaben auf denselben Platz wollen: Die beiden Karten
 *     stehen nebeneinander – ein Klick wählt, welche dort bleibt.
 *     Oder das kleine × auf einer Karte streicht sie: Eine übertragene Aufgabe wird dann nicht
 *     mitgenommen, eine geplante fällt weg. (Wirksam erst, wenn der Tag wirklich endet.)
 *     Nach dem letzten Klick ist der Tag beendet.
 */

import { useState } from 'react'
import { T } from '../config/texts'
import type { ConflictChoices } from '../logic/carryOver'
import type { ID } from '../model/types'
import { endDay, getEndDayConflicts } from '../store/actions'
import { activeDay, dayYield, lifetimeWork } from '../store/selectors'
import { useAppState } from '../store/store'
import { Dialog } from './Dialog'
import { CheckIcon } from './icons'

interface Props {
  /**
   * true = ohne Rückfrage gleich mit der Platzwahl starten.
   * (Nur sinnvoll, wenn es Konflikte gibt – sonst direkt `endDay()` aufrufen.)
   */
  skipConfirm?: boolean
  onCancel: () => void
  onEnded: () => void
}

export function EndDayDialog({ skipConfirm = false, onCancel, onEnded }: Props) {
  const state = useAppState()
  const [confirmed, setConfirmed] = useState(skipConfirm)
  const [choices, setChoices] = useState<ConflictChoices>({})
  // Per × gestrichene Aufgaben – erst beim Beenden wirksam (Abbrechen lässt alles, wie es war).
  const [dropped, setDropped] = useState<ReadonlySet<ID>>(new Set())
  // Die Konflikte ändern sich, wenn etwas gestrichen wird – deshalb jedes Mal neu ermittelt.
  const conflicts = getEndDayConflicts(dropped)

  const finish = (finalChoices: ConflictChoices, finalDropped: ReadonlySet<ID> = dropped) => {
    endDay(finalChoices, finalDropped)
    onEnded()
  }

  if (!confirmed) {
    return (
      <Dialog title={T.endDay.title} onClose={onCancel}>
        <DayYield />
        <p className="dialog-text">{T.endDay.question}</p>
        {state.timer.phase === 'block' && <p className="hint">{T.endDay.runningBlock}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            {T.endDay.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (conflicts.length === 0 ? finish({}) : setConfirmed(true))}
          >
            {T.endDay.confirm}
          </button>
        </div>
      </Dialog>
    )
  }

  // Der erste Konflikt, für den noch nichts gewählt ist.
  const index = conflicts.findIndex((c) => choices[c.carried.id] === undefined)
  const conflict = conflicts[index]
  if (!conflict) return null
  const isLast = index === conflicts.length - 1

  const choose = (winner: 'carried' | 'planned') => {
    const next = { ...choices, [conflict.carried.id]: winner }
    if (isLast) finish(next)
    else setChoices(next)
  }

  // × auf einer Karte: diese Aufgabe streichen – die andere bekommt den Platz.
  const drop = (id: ID) => {
    const next = new Set(dropped).add(id)
    const remaining = getEndDayConflicts(next).filter((c) => choices[c.carried.id] === undefined)
    if (remaining.length === 0) finish(choices, next)
    else setDropped(next)
  }

  return (
    <Dialog title={T.endDay.conflictTitle(conflict.place)} onClose={onCancel} wide>
      <p className="dialog-text">{T.endDay.conflictHint}</p>
      <div className="conflict-choices">
        {(
          [
            { side: 'carried', task: conflict.carried, origin: T.endDay.carried },
            { side: 'planned', task: conflict.planned, origin: T.endDay.planned },
          ] as const
        ).map(({ side, task, origin }) => (
          <div key={task.id} className="conflict-item">
            <button type="button" className="conflict-card card" onClick={() => choose(side)}>
              <span className="conflict-origin">{origin}</span>
              <span className="conflict-title">{task.title}</span>
            </button>
            {/* Dezentes × oben rechts: diese Aufgabe streichen statt wählen. */}
            <button
              type="button"
              className="conflict-drop"
              aria-label={T.endDay.dropLabel(task.title)}
              title={T.endDay.dropLabel(task.title)}
              onClick={() => drop(task.id)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {conflicts.length > 1 && (
        <p className="muted small conflict-progress">
          {index + 1} / {conflicts.length}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          {T.endDay.cancel}
        </button>
      </div>
    </Dialog>
  )
}

/**
 * Kleiner Tagesertrag: „Heute geschafft: 4 Blöcke · 1 Std. 40 Min.“ und darunter die erledigten
 * Aufgaben mit Haken. Ohne Vergleich, ohne Streak. Wurde nichts gearbeitet, erscheint nichts.
 */
function DayYield() {
  const state = useAppState()
  const [now] = useState(Date.now)
  const result = dayYield(state, activeDay(state).id, now)
  if (result.minutes === 0 && result.doneTitles.length === 0) return null
  const parts = [T.endDay.yieldBlocks(result.completedBlocks), T.endDay.yieldTime(result.minutes)]
  const lifetime = lifetimeWork(state).blocks
  return (
    <div className="day-yield">
      <p className="day-yield-title">{T.endDay.yieldTitle}</p>
      <p className="day-yield-numbers">{parts.join(' · ')}</p>
      {lifetime > 0 && <p className="lifetime-line">{T.endDay.lifetime(lifetime)}</p>}
      {result.doneTitles.length > 0 && (
        <ul className="day-yield-done">
          {result.doneTitles.map((title) => (
            <li key={title}>
              <CheckIcon className="glyph" /> {title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
