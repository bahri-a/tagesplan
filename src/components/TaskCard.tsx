/**
 * Eine Hauptaufgabe als Karte im Bildschirm „Planen“.
 * Zugeklappt: Nummer, Titel, Blöcke und Schritte auf einen Blick.
 * Aufgeklappt: Titel, erste Schritte, Blockanzahl, Blocklänge und kurze Pause bearbeiten.
 * Über den Griff links lässt sich die Karte verschieben (Drag & Drop).
 */

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SETTINGS_LIMITS } from '../config/defaults'
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

      {/* Zahlen der Aufgabe: immer dieselben drei Zeilen – beim Ändern springt nichts. */}
      <div className="task-numbers">
        <div className="number-row">
          <span className="number-row-label">
            <span className="number-row-name">{T.plan.blocks}</span>
          </span>
          <NumberStepper
            label={T.plan.blocks}
            value={task.estimatedBlocks}
            min={1}
            unit=""
            onChange={(v) => updateTask(task.id, { estimatedBlocks: v })}
          />
        </div>

        <DurationRow
          label={T.plan.blockLength}
          standardMinutes={state.settings.blockMinutes}
          override={task.blockMinutesOverride}
          limits={SETTINGS_LIMITS.blockMinutes}
          onChange={(v) => updateTask(task.id, { blockMinutesOverride: v })}
        />

        <DurationRow
          label={T.plan.shortBreak}
          standardMinutes={state.settings.shortBreakMinutes}
          override={task.shortBreakMinutesOverride}
          limits={SETTINGS_LIMITS.shortBreakMinutes}
          onChange={(v) => updateTask(task.id, { shortBreakMinutesOverride: v })}
        />
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

interface DurationRowProps {
  label: string
  /** Der Standardwert aus den Einstellungen. */
  standardMinutes: number
  /** Individueller Wert dieser Aufgabe – oder `null` für den Standard. */
  override: number | null
  limits: { min: number; max: number }
  onChange: (value: number | null) => void
}

/**
 * Eine Dauer (Blocklänge oder kurze Pause) als ruhige Zeile:
 * links Name und darunter „Standard“ bzw. „Individuell · zurücksetzen“, rechts immer dasselbe Zahlenfeld.
 * Wer die Zahl ändert, macht sie automatisch individuell. Wer genau den Standardwert
 * einstellt oder „zurücksetzen“ klickt, ist wieder beim Standard (folgt dann den Einstellungen).
 */
function DurationRow({ label, standardMinutes, override, limits, onChange }: DurationRowProps) {
  const isCustom = override !== null
  return (
    <div className="number-row">
      <span className="number-row-label">
        <span className="number-row-name">{label}</span>
        {isCustom ? (
          <span className="number-row-state is-custom">
            {T.plan.custom} ·{' '}
            <button
              type="button"
              className="link-button"
              aria-label={T.plan.resetLabel(label, standardMinutes)}
              title={T.plan.resetLabel(label, standardMinutes)}
              onClick={() => onChange(null)}
            >
              {T.plan.reset}
            </button>
          </span>
        ) : (
          <span className="number-row-state">{T.plan.standard}</span>
        )}
      </span>
      <NumberStepper
        label={label}
        value={override ?? standardMinutes}
        {...limits}
        unit={T.plan.minutesShort}
        onChange={(v) => onChange(v === standardMinutes ? null : v)}
      />
    </div>
  )
}
