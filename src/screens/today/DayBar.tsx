/**
 * Leiste unter der großen Karte: alle Aufgaben des Tages als kleine Pillen, mit kurzer Übersicht.
 */

import { useState } from 'react'
import { T } from '../../config/texts'
import { taskMark, type Mark } from '../../logic/progress'
import { cleanStartCue } from '../../logic/variety'
import { SHOWS_START_CUE } from '../../platform/device'
import type { ID, Task } from '../../model/types'
import { blockMinutesFor, stepsOfTask, taskWork } from '../../store/selectors'
import { useAppState } from '../../store/store'
import { CheckIcon } from '../../components/icons'
import { wasJustFinished } from './celebrate'

/**
 * Schlanke Leiste unter der Karte: alle Aufgaben des Tages als kleine Pillen.
 *  - erledigt: grün mit Haken (gerade erst erledigt: der Haken zeichnet sich kurz)
 *  - jetzt dran: salbeigrüner Punkt (in Arbeit)
 *  - kommt noch: durchscheinendes Glas (noch nicht aktiv)
 * Ein Klick auf eine Pille zeigt darunter eine kurze Übersicht der Aufgabe, ein zweiter Klick
 * (oder das ×) schließt sie wieder.
 */
export function DayBar({ tasks, currentId }: { tasks: Task[]; currentId: ID | undefined }) {
  const [openId, setOpenId] = useState<ID | null>(null)
  const open = tasks.find((t) => t.id === openId)
  return (
    <nav className="day-bar" aria-label={T.today.dayList}>
      <ol>
        {tasks.map((item) => {
          const mark = taskMark(item.completedAt !== null, item.id === currentId)
          const isOpen = item.id === open?.id
          return (
            <li key={item.id} aria-current={mark === 'current' ? 'step' : undefined}>
              <button
                type="button"
                className={`day-pill is-${mark}${isOpen ? ' is-expanded' : ''}${mark === 'done' && wasJustFinished(item.id) ? ' is-fresh' : ''}`}
                aria-expanded={isOpen}
                title={T.today.peekHint(item.title)}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span className="day-mark" aria-hidden="true">
                  {mark === 'done' && <CheckIcon />}
                </span>
                <span className="day-title">{item.title}</span>
                {mark === 'done' && <span className="visually-hidden"> ({T.today.stepDone})</span>}
              </button>
            </li>
          )
        })}
      </ol>
      {open && (
        <DayPeek
          key={open.id}
          task={open}
          mark={taskMark(open.completedAt !== null, open.id === currentId)}
          onClose={() => setOpenId(null)}
        />
      )}
    </nav>
  )
}

/** Kurze Übersicht einer Aufgabe unter der Leiste: Stand, Blöcke, Startsignal, erste Schritte. */
function DayPeek({ task, mark, onClose }: { task: Task; mark: Mark; onClose: () => void }) {
  const state = useAppState()
  const steps = stepsOfTask(state, task.id)
  const work = taskWork(state, task.id)
  const minutes = blockMinutesFor(state, task)
  const cue = SHOWS_START_CUE && task.startCue ? cleanStartCue(task.startCue) : ''

  let status: string = T.today.peekUpcoming
  if (mark === 'current') status = T.today.peekCurrent
  if (mark === 'done') status = T.today.doneCard
  const meta = [T.endDay.yieldBlocks(task.estimatedBlocks), T.today.perBlock(minutes)]
  if (work.blocks > 0) meta.push(T.today.peekWorked(work.blocks, T.endDay.yieldTime(work.minutes)))

  return (
    <section className={`day-peek is-${mark}`} aria-label={task.title}>
      <button type="button" className="day-peek-close" aria-label={T.today.peekClose} onClick={onClose}>
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
        </svg>
      </button>
      <p className="day-peek-status">{status}</p>
      <h2 className="day-peek-title">{task.title}</h2>
      <p className="day-peek-meta">{meta.join(' · ')}</p>
      {cue && <p className="day-peek-cue">{T.today.startCue(cue)}</p>}
      {steps.length > 0 && (
        <>
          <p className="day-peek-label">{T.today.firstStep}</p>
          <ul className="day-peek-steps">
            {steps.map((step) => (
              <li key={step.id} className={step.doneAt !== null ? 'is-done' : undefined}>
                {step.text}
                {step.doneAt !== null && <span className="visually-hidden"> ({T.today.stepDone})</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
