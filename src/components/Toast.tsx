/**
 * Kurze, freundliche Meldung unten in der Mitte, die von selbst verschwindet.
 * Optional mit einem Knopf daneben, z. B. „Aufgabe gelöscht · Rückgängig“.
 */

import { useContext, useEffect } from 'react'
import { WindowContext } from './hooks'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface Props {
  message: string
  onDone: () => void
  /** Anzeigedauer in Millisekunden. */
  duration?: number
  /** Knopf hinter der Meldung (z. B. „Rückgängig“). Nach dem Klick verschwindet die Meldung. */
  action?: ToastAction
}

export function Toast({ message, onDone, duration = 3500, action }: Props) {
  // Im Mini-Fenster mit dessen Uhr – das große Fenster liegt dann oft im Dock und wird gebremst.
  const win = useContext(WindowContext)
  useEffect(() => {
    const id = win.setTimeout(onDone, duration)
    return () => win.clearTimeout(id)
  }, [message, onDone, duration, win])

  return (
    <div className="toast" role="status">
      <span className="toast-message">{message}</span>
      {action && (
        <>
          <span className="toast-separator" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              action.onClick()
              onDone()
            }}
          >
            {action.label}
          </button>
        </>
      )}
    </div>
  )
}
