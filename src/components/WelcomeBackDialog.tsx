/**
 * „Willkommen zurück! Möchtest du den Tag von … beenden?“
 * Erscheint, wenn du vergessen hast, den Tag zu beenden, und die App an
 * einem neuen Kalendertag wieder öffnest.
 */

import { T } from '../config/texts'
import { formatDayName } from '../logic/time'
import { dismissEndDayPrompt } from '../store/actions'
import { activeDay } from '../store/selectors'
import { useAppState } from '../store/store'
import { Dialog } from './Dialog'

interface Props {
  onEndDay: () => void
  onKeepWorking: () => void
}

export function WelcomeBackDialog({ onEndDay, onKeepWorking }: Props) {
  const state = useAppState()
  const day = activeDay(state)
  const dayName = day.firstWorkAt === null ? '' : formatDayName(day.firstWorkAt)

  const keepWorking = () => {
    dismissEndDayPrompt()
    onKeepWorking()
  }

  return (
    <Dialog title={T.welcome.title} onClose={keepWorking}>
      <p className="dialog-text">{T.welcome.question(dayName)}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-quiet" onClick={keepWorking}>
          {T.welcome.no}
        </button>
        <button type="button" className="btn btn-primary" onClick={onEndDay}>
          {T.welcome.yes}
        </button>
      </div>
    </Dialog>
  )
}
