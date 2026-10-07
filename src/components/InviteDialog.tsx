/**
 * FOKUS-EINLADUNG ÖFFNEN
 * Jemand hat einen Link geschickt (…/tagesplan/#fokus=<Endzeit>, siehe logic/invite.ts).
 * „Mitmachen“ startet einen Block mit der aktuellen Hauptaufgabe – oder einer neuen, wenn heute
 * noch nichts geplant ist. Er endet zur selben Minute wie der Block der anderen Person.
 */

import { useState } from 'react'
import { T } from '../config/texts'
import { formatClock, type Invite } from '../logic/invite'
import { haptic, requestFocusFullscreen } from '../platform/focusMode'
import { requestNotificationPermission } from '../signals/notifications'
import { addTask, startBlock } from '../store/actions'
import { activeDay, currentTask } from '../store/selectors'
import { getState, useAppState } from '../store/store'
import { Dialog } from './Dialog'

interface Props {
  invite: Invite
  onClose: () => void
  /** Block läuft – zu „Heute“ wechseln. */
  onJoined: () => void
}

export function InviteDialog({ invite, onClose, onJoined }: Props) {
  const state = useAppState()
  const [title, setTitle] = useState('')
  const task = currentTask(state)

  // Vorbei, oder bei dir läuft schon ein Block: nur ein kurzer Satz.
  const notPossible = invite.status === 'over' ? T.invite.over : state.timer.phase === 'block' ? T.invite.busy : null
  if (notPossible !== null || invite.status !== 'open') {
    return (
      <Dialog title={T.invite.title} onClose={onClose}>
        <p className="dialog-text invite-text">{notPossible}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {T.invite.close}
          </button>
        </div>
      </Dialog>
    )
  }

  const join = () => {
    const taskId = task?.id ?? (title.trim() ? addTask(activeDay(getState()).id, title).id : null)
    if (taskId === null) return
    // Wie beim Startknopf: Benachrichtigungen erfragen, am Handy Vollbild und ein leichtes Antippen.
    void requestNotificationPermission()
    requestFocusFullscreen()
    haptic('tap')
    startBlock(taskId, { endsAt: invite.endsAt })
    onJoined()
  }

  return (
    <Dialog title={T.invite.title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          join()
        }}
      >
        <p className="dialog-text invite-text">{T.invite.open(formatClock(invite.endsAt))}</p>
        {task ? (
          <p className="invite-task">
            <span className="muted">{T.invite.withTask}</span> <strong>{task.title}</strong>
          </p>
        ) : (
          <input
            className="input"
            value={title}
            placeholder={T.invite.newTask}
            aria-label={T.invite.newTask}
            enterKeyHint="go"
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            {T.invite.notNow}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!task && !title.trim()}>
            {T.invite.join}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
