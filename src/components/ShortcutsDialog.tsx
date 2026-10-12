/**
 * TASTENKÜRZEL (Taste ?)
 * Eine kleine Tafel mit allen Kürzeln – damit man Leertaste, N und 1 / 2 / 3 nicht erst in der
 * Anleitung suchen muss. Öffnet mit „?“ oder unten in den Einstellungen; Escape oder „Fertig“ schließt.
 */

import { T } from '../config/texts'
import { Dialog } from './Dialog'

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={T.shortcuts.title} onClose={onClose}>
      <dl className="shortcuts">
        {T.shortcuts.list.map(([keys, what]) => (
          <div key={what} className="shortcut-row">
            <dt>
              {keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
          {T.shortcuts.close}
        </button>
      </div>
    </Dialog>
  )
}
