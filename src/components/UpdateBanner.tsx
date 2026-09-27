/**
 * Kleiner Hinweis, wenn online eine neue Version der App bereitliegt.
 * Ein Klick auf „Neu laden“ holt sie – ein laufender Timer läuft danach
 * einfach weiter (er ist gespeichert).
 */

import { useRegisterSW } from 'virtual:pwa-register/react'
import { T } from '../config/texts'

/** Wie oft nach einer neuen Version gesucht wird (Millisekunden): stündlich. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="toast" role="status">
      {T.update.ready}
      <button type="button" className="btn btn-primary btn-small" onClick={() => void updateServiceWorker(true)}>
        {T.update.reload}
      </button>
    </div>
  )
}
