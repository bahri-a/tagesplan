/**
 * Dialog „Tag beenden“.
 *  1. Kurze Rückfrage (entfällt, wenn du über „Willkommen zurück“ kommst).
 *  2. Falls zwei Aufgaben auf denselben Platz wollen: Die beiden Karten
 *     stehen nebeneinander – ein Klick wählt, welche dort bleibt.
 *     Nach dem letzten Klick ist der Tag beendet.
 */

import { useState } from 'react'
import { T } from '../config/texts'
import type { ConflictChoices } from '../logic/carryOver'
import { endDay, getEndDayConflicts } from '../store/actions'
import { activeDay, dayYield } from '../store/selectors'
import { useAppState } from '../store/store'
import { Dialog } from './Dialog'

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
  // Die Konflikte werden einmal beim Öffnen ermittelt.
  const [conflicts] = useState(getEndDayConflicts)
  const [confirmed, setConfirmed] = useState(skipConfirm)
  const [choices, setChoices] = useState<ConflictChoices>({})
  const [index, setIndex] = useState(0)

  const finish = (finalChoices: ConflictChoices) => {
    endDay(finalChoices)
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

  const conflict = conflicts[index]
  if (!conflict) return null
  const choose = (winner: 'carried' | 'planned') => {
    const next = { ...choices, [conflict.carried.id]: winner }
    if (index + 1 < conflicts.length) {
      setChoices(next)
      setIndex(index + 1)
    } else {
      finish(next)
    }
  }

  return (
    <Dialog title={T.endDay.conflictTitle(conflict.place)} onClose={onCancel} wide>
      <p className="dialog-text">{T.endDay.conflictHint}</p>
      <div className="conflict-choices">
        <button type="button" className="conflict-card card" onClick={() => choose('carried')}>
          <span className="conflict-origin">{T.endDay.carried}</span>
          <span className="conflict-title">{conflict.carried.title}</span>
        </button>
        <button type="button" className="conflict-card card" onClick={() => choose('planned')}>
          <span className="conflict-origin">{T.endDay.planned}</span>
          <span className="conflict-title">{conflict.planned.title}</span>
        </button>
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
  return (
    <div className="day-yield">
      <p className="day-yield-title">{T.endDay.yieldTitle}</p>
      <p className="day-yield-numbers">{parts.join(' · ')}</p>
      {result.doneTitles.length > 0 && (
        <ul className="day-yield-done">
          {result.doneTitles.map((title) => (
            <li key={title}>✓ {title}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
