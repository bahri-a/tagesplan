/**
 * Kurze, freundliche Meldung unten in der Mitte, die von selbst verschwindet.
 */

import { useEffect } from 'react'

interface Props {
  message: string
  onDone: () => void
  /** Anzeigedauer in Millisekunden. */
  duration?: number
}

export function Toast({ message, onDone, duration = 3500 }: Props) {
  useEffect(() => {
    const id = setTimeout(onDone, duration)
    return () => clearTimeout(id)
  }, [message, onDone, duration])

  return (
    <div className="toast" role="status">
      {message}
    </div>
  )
}
