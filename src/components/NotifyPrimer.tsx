/**
 * „EINE SACHE VORAB“
 * Erklärt vor der Frage von Chrome bzw. iOS in einem Satz, wozu Mitteilungen gut sind. Diese Frage
 * kommt nur ein einziges Mal – wer sie ohne Erklärung ablehnt, hört das Blockende bei gesperrtem
 * iPhone nie. „Weiter“ löst die echte Frage aus. Escape schließt; beim nächsten Start kommt die Karte wieder.
 */

import { T } from '../config/texts'
import { IS_MOBILE } from '../platform/device'
import { requestFocusFullscreen } from '../platform/focusMode'
import { requestNotificationPermission } from '../signals/notifications'
import { Dialog } from './Dialog'

export function NotifyPrimer({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={T.notifyPrimer.title} onClose={onClose}>
      <p className="dialog-text notify-primer-text">{IS_MOBILE ? T.notifyPrimer.textMobile : T.notifyPrimer.textMac}</p>
      <div className="dialog-actions">
        <button
          type="button"
          className="btn btn-primary"
          autoFocus
          onClick={() => {
            void requestNotificationPermission()
            // Handy im Browser: Das Vollbild für den Block kommt erst jetzt (die Karte lag davor).
            requestFocusFullscreen()
            onClose()
          }}
        >
          {T.notifyPrimer.next}
        </button>
      </div>
    </Dialog>
  )
}
