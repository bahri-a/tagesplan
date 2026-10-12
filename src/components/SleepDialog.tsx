/**
 * MAC HAT IM BLOCK GESCHLAFEN
 * Klappst du den Mac mitten im Block zu und später wieder auf, steht der Block pausiert (ab dem
 * Einschlafen), und diese Frage kommt: Ja = die Zeit zählt als Arbeit, Nein = wie „Abbrechen“.
 */

import { useState } from 'react'
import { T } from '../config/texts'
import { answerSleep } from '../store/actions'
import { Dialog } from './Dialog'

export function SleepDialog({ sleptAt }: { sleptAt: number }) {
  const [minutes] = useState(() => Math.max(1, Math.round((Date.now() - sleptAt) / 60_000)))
  return (
    <Dialog title={T.sleep.title}>
      <p className="dialog-text sleep-text">{T.sleep.text(minutes)}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-quiet" onClick={() => answerSleep(false)}>
          {T.sleep.no}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => answerSleep(true)}>
          {T.sleep.yes}
        </button>
      </div>
    </Dialog>
  )
}
