/**
 * Kurze, freundliche Meldung unten in der Mitte, die von selbst verschwindet.
 * Optional mit einem Knopf daneben, z. B. „Aufgabe gelöscht · Rückgängig“.
 */

import { useEffect } from 'react'

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
  useEffect(() => {
    const id = setTimeout(onDone, duration)
    return () => clearTimeout(id)
  }, [message, onDone, duration])

  return (
    <div className="toast" role="status">
      <span>{message}</span>
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
