/**
 * „Zuletzt verwendet“ ganz unten im Planer: ein Klick legt eine frühere Hauptaufgabe wieder an.
 */

import { RECENT_TASKS_COUNT } from '../../config/defaults'
import { T } from '../../config/texts'
import { alive } from '../../logic/records'
import { copyTask, hideAllRecentTasks, hideRecentTask } from '../../store/actions'
import { hasRecentTasks, recentTasks } from '../../store/selectors'
import { useAppState } from '../../store/store'
import { ResetButton, TargetSwitch, type TargetProps } from './shared'

export function RecentTasks({ days, targetIndex, onTargetChange, onNotice }: TargetProps) {
  const state = useAppState()
  const target = days[targetIndex]
  const recent = recentTasks(state, target.day.id, RECENT_TASKS_COUNT)
  if (!hasRecentTasks(state, days.map((d) => d.day.id))) return null

  return (
    <section className="recent" aria-label={T.plan.recentTitle}>
      <div className="recent-head">
        <h2 className="recent-title">{T.plan.recentTitle}</h2>
        {/* „Reset“: alle auf einmal weg, ohne Nachfrage – sie kommen wieder, sobald man sie benutzt. */}
        <ResetButton
          hint={T.plan.recentResetHint}
          onReset={() => {
            hideAllRecentTasks(alive(Object.values(state.tasks)).map((t) => t.title))
            onNotice(T.plan.recentResetDone)
          }}
        />
        <TargetSwitch days={days} targetIndex={targetIndex} onTargetChange={onTargetChange} />
      </div>
      {recent.length === 0 && <p className="muted small">{T.plan.recentNone(target.label)}</p>}
      <ul className="recent-list">
        {recent.map((task) => (
          <li key={task.id} className="recent-item">
            <button
              type="button"
              className="recent-chip"
              aria-label={T.plan.recentAdd(task.title, target.label)}
              title={T.plan.recentAdd(task.title, target.label)}
              onClick={() => {
                copyTask(task.id, target.day.id)
                onNotice(T.plan.recentAdded(task.title, target.label))
              }}
            >
              <span className="recent-plus" aria-hidden="true">
                +
              </span>
              <span className="recent-chip-title">{task.title}</span>
            </button>
            {/* Kleines × rechts in der Pille: nur leise sichtbar, deutlicher beim Drüberfahren. */}
            <button
              type="button"
              className="recent-hide"
              aria-label={T.plan.recentHide(task.title)}
              title={T.plan.recentHide(task.title)}
              onClick={() => hideRecentTask(task.title)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
