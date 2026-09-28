/**
 * Eine Hauptaufgabe als Karte im Bildschirm „Planen“.
 * Zugeklappt: Nummer, Titel, Blöcke und Schritte auf einen Blick.
 * Aufgeklappt: Titel, erste Schritte, Blockanzahl und Blocklänge bearbeiten.
 * Über den Griff links lässt sich die Karte verschieben (Drag & Drop).
 */

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { T } from '../config/texts'
import type { Task } from '../model/types'
import { deleteTask, setTaskCompleted, updateTask } from '../store/actions'
import { blockMinutesFor, stepsOfTask } from '../store/selectors'
import { useAppState } from '../store/store'
import { NumberStepper } from './NumberStepper'
import { StepList } from './StepList'

interface Props {
  task: Task
  number: number
  expanded: boolean
  /** Bei einer neuen Aufgabe gleich ins Feld für den ersten Schritt springen. */
  focusStepInput: boolean
  onToggle: () => void
}

export function TaskCard({ task, number, expanded, focusStepInput, onToggle }: Props) {
  const state = useAppState()
  const steps = stepsOfTask(state, task.id)
  const stepsDone = steps.filter((s) => s.doneAt !== null).length
  const minutes = blockMinutesFor(state, task)
  const isDone = task.completedAt !== null

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const classes = ['task-card', 'card']
  if (isDone) classes.push('is-done')
  if (isDragging) classes.push('is-dragging')
  if (expanded) classes.push('is-expanded')

  return (
    <li ref={setNodeRef} style={style} className={classes.join(' ')}>
      <div className="task-card-head">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label={T.plan.dragHandle}
          {...attributes}
          {...listeners}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
            {[2, 8, 14].map((y) => (
              <g key={y}>
                <circle cx="2" cy={y} r="1.5" />
                <circle cx="8" cy={y} r="1.5" />
              </g>
            ))}
          </svg>
        </button>

        <button type="button" className="task-card-summary" aria-expanded={expanded} onClick={onToggle}>
          <span className="task-number">{isDone ? '✓' : `${number}.`}</span>
          <span className="task-title">{task.title || '…'}</span>
          <span className="task-meta">
            {T.plan.blocksMeta(task.estimatedBlocks)} · {minutes} {T.plan.minutesShort}
            {steps.length > 0 && <> · {T.plan.stepsMeta(stepsDone, steps.length)}</>}
          </span>
        </button>
      </div>

      {expanded && <TaskEditor task={task} focusStepInput={focusStepInput} onClose={onToggle} />}
    </li>
  )
}

function TaskEditor({ task, focusStepInput, onClose }: { task: Task; focusStepInput: boolean; onClose: () => void }) {
  const state = useAppState()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const standardMinutes = state.settings.blockMinutes
  const isDone = task.completedAt !== null

  return (
    <div className="task-editor">
      <label className="field">
        <span className="field-label">{T.plan.title}</span>
        <input
          className="input"
          value={task.title}
          onChange={(e) => updateTask(task.id, { title: e.target.value })}
        />
      </label>

      {/* Erste Schritte: nur zum Loslegen – keine Blöcke, keine Blocknamen. */}
      <div className="field">
        <span className="field-label">{T.plan.steps}</span>
        <span className="field-hint">{T.plan.stepsHint}</span>
        <StepList taskId={task.id} autoFocusNew={focusStepInput} />
      </div>

      <div className="task-editor-row">
        <div className="field">
          <span className="field-label">{T.plan.blocks}</span>
          <NumberStepper
            label={T.plan.blocks}
            value={task.estimatedBlocks}
            min={1}
            onChange={(v) => updateTask(task.id, { estimatedBlocks: v })}
          />
        </div>

        <div className="field">
          <span className="field-label">{T.plan.blockLength}</span>
          <div className="block-length">
            <select
              className="input select"
              value={task.blockMinutesOverride === null ? 'standard' : 'custom'}
              onChange={(e) =>
                updateTask(task.id, {
                  blockMinutesOverride: e.target.value === 'standard' ? null : standardMinutes,
                })
              }
            >
              <option value="standard">{T.plan.standard(standardMinutes)}</option>
              <option value="custom">{T.plan.custom}</option>
            </select>
            {task.blockMinutesOverride !== null && (
              <NumberStepper
                label={T.plan.blockLength}
                value={task.blockMinutesOverride}
                min={1}
                max={240}
                unit={T.plan.minutesShort}
                onChange={(v) => updateTask(task.id, { blockMinutesOverride: v })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="task-editor-footer">
        {confirmDelete ? (
          <span className="confirm-inline">
            {T.plan.deleteConfirm}
            <button type="button" className="btn btn-small" onClick={() => deleteTask(task.id)}>
              {T.plan.yes}
            </button>
            <button type="button" className="btn btn-small btn-quiet" onClick={() => setConfirmDelete(false)}>
              {T.plan.no}
            </button>
          </span>
        ) : (
          <>
            <button type="button" className="btn btn-small btn-quiet" onClick={() => setTaskCompleted(task.id, !isDone)}>
              {isDone ? T.plan.reopen : T.plan.markDone}
            </button>
            <button type="button" className="btn btn-small btn-quiet" onClick={() => setConfirmDelete(true)}>
              {T.plan.delete}
            </button>
          </>
        )}
        <button type="button" className="btn btn-small task-editor-close" onClick={onClose}>
          {T.plan.close}
        </button>
      </div>
    </div>
  )
}
