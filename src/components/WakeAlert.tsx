/**
 * Pop-up beim Zurückkehren ins iPhone: Hat die Mitteilung während der Sperre schon geklingelt
 * (Block oder Pause ist zu Ende), fällt das sonst leicht unter den Tisch, weil man dafür erst
 * auf die Mitteilung tippen müsste. Stattdessen erscheint beim Entsperren sofort dieses
 * auffällige Pop-up mit Ton – man benutzt die App ja sowieso gerade.
 */

import { useEffect } from 'react'
import { T } from '../config/texts'
import { playBlockEnd, playBreakEnd } from '../signals/sounds'
import { Dialog } from './Dialog'
import type { WakeEvent } from './hooks'

export function WakeAlert({ event, onClose }: { event: WakeEvent; onClose: () => void }) {
  useEffect(() => {
    if (event.kind === 'blockEnd') playBlockEnd()
    else playBreakEnd()
  }, [event])

  return (
    <Dialog title={event.title} onClose={onClose}>
      <p className="dialog-text">{event.body}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {T.notification.wakeButton}
        </button>
      </div>
    </Dialog>
  )
}
