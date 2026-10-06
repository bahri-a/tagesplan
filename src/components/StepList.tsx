/**
 * Die ersten Schritte einer Hauptaufgabe als Checkliste – kleine Schritte zum Loslegen.
 * Wird im Bildschirm „Planen“ (bearbeitbar) und „Heute“ (nur abhaken) genutzt.
 */

import { useEffect, useRef, useState } from 'react'
import { T } from '../config/texts'
import type { ID } from '../model/types'
import { addStep, deleteStep, toggleStep, updateStepText } from '../store/actions'
import { stepsOfTask } from '../store/selectors'
import { getState, useAppState } from '../store/store'

interface Props {
  taskId: ID
  /** false = nur abhaken, nicht bearbeiten (für „Heute“). */
  editable?: boolean
  autoFocusNew?: boolean
  /** Diesen Schritt hervorheben (der aktuelle Schritt). */
  highlightId?: ID
}

export function StepList({ taskId, editable = true, autoFocusNew = false, highlightId }: Props) {
  const state = useAppState()
  const steps = stepsOfTask(state, taskId)
  const [newText, setNewText] = useState('')
  const pending = useRef('')

  const submit = () => {
    if (!newText.trim()) return
    addStep(taskId, newText)
    setNewText('')
    pending.current = ''
  }

  // Vergessenes Enter: Beim Zuklappen/Schließen den getippten Schritt trotzdem übernehmen.
  useEffect(
    () => () => {
      const text = pending.current.trim()
      const task = getState().tasks[taskId]
      if (text && task && task.deletedAt === null) addStep(taskId, text)
    },
    [taskId],
  )

  return (
    <div className="step-list">
      {steps.length > 0 && (
        <ul className="steps">
          {steps.map((step) => (
            <li
              key={step.id}
              className={`step${step.doneAt !== null ? ' is-done' : ''}${step.id === highlightId ? ' is-current' : ''}`}
            >
              {editable ? (
                <>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={step.doneAt !== null}
                    aria-label={step.text}
                    onChange={() => toggleStep(step.id)}
                  />
                  <input
                    className="step-text-input"
                    value={step.text}
                    aria-label={T.plan.steps}
                    onChange={(e) => updateStepText(step.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="step-remove"
                    aria-label={T.plan.removeStep}
                    title={T.plan.removeStep}
                    onClick={() => deleteStep(step.id)}
                  >
                    ×
                  </button>
                </>
              ) : (
                <label className="step-label">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={step.doneAt !== null}
                    onChange={() => toggleStep(step.id)}
                  />
                  <span className="step-text">{step.text}</span>
                </label>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form
          className="step-new"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            className="input"
            value={newText}
            // Bei einer neuen Aufgabe direkt den ersten Schritt eintippen können.
            autoFocus={autoFocusNew}
            placeholder={steps.length === 0 ? T.plan.firstStep : T.plan.nextStep}
            aria-label={steps.length === 0 ? T.plan.firstStep : T.plan.nextStep}
            onChange={(e) => {
              setNewText(e.target.value)
              pending.current = e.target.value
            }}
            onBlur={submit}
          />
        </form>
      )}
    </div>
  )
}
