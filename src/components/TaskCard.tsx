/**
 * Eine Hauptaufgabe als Karte im Bildschirm „Planen“.
 * Zugeklappt: Nummer, Titel, Blöcke und Schritte auf einen Blick.
 * Aufgeklappt: Titel, erste Schritte, Blockanzahl, Blocklänge und kurze Pause bearbeiten.
 * Über den Griff links lässt sich die Karte verschieben (Drag & Drop),
 * über den Papierkorb rechts löschen (danach kurz „Rückgängig“, siehe PlanScreen).
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SETTINGS_LIMITS } from '../config/defaults'
import { T } from '../config/texts'
import type { Task } from '../model/types'
import { setTaskCompleted, updateTask } from '../store/actions'
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
  /** Papierkorb geklickt – was dann passiert (Rückfrage, Löschen, „Rückgängig“), regelt „Planen“. */
  onDelete: () => void
}

export function TaskCard({ task, number, expanded, focusStepInput, onToggle, onDelete }: Props) {
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

        {/* Eigener Knopf neben der Zusammenfassung: klappt nichts auf und zieht nichts. */}
        <button
          type="button"
          className="task-delete"
          aria-label={T.plan.deleteLabel(task.title || '…')}
          title={T.plan.delete}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>

      {expanded && <TaskEditor task={task} focusStepInput={focusStepInput} onClose={onToggle} />}
    </li>
  )
}

function TaskEditor({ task, focusStepInput, onClose }: { task: Task; focusStepInput: boolean; onClose: () => void }) {
  const state = useAppState()
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
        <FieldLabel text={T.plan.steps} optional />
        <span className="field-hint">{T.plan.stepsHint}</span>
        <StepList taskId={task.id} autoFocusNew={focusStepInput} />
      </div>

      {/* Startsignal (optional): eine Zeile, das Beispiel im leeren Feld erklärt sie. */}
      <label className="field">
        <FieldLabel text={T.plan.startCue} optional />
        <input
          className="input"
          value={task.startCue ?? ''}
          placeholder={T.plan.startCuePlaceholder}
          onChange={(e) => updateTask(task.id, { startCue: e.target.value })}
        />
      </label>

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

      {/* Gelöscht wird nur über den Papierkorb oben in der Karte – überall gleich. */}
      <div className="task-editor-footer">
        <button type="button" className="btn btn-small btn-quiet" onClick={() => setTaskCompleted(task.id, !isDone)}>
          {isDone ? T.plan.reopen : T.plan.markDone}
        </button>
        <button type="button" className="btn btn-small task-editor-close" onClick={onClose}>
          {T.plan.close}
        </button>
      </div>
    </div>
  )
}

/**
 * Feldbezeichnung. `optional` hängt ein kleines, leises Schild „optional“ an –
 * damit niemand überlegen muss, ob er hier etwas eintragen muss.
 */
function FieldLabel({ text, optional = false }: { text: string; optional?: boolean }) {
  return (
    <span className="field-label">
      {text}
      {optional && <span className="field-optional">{T.plan.optional}</span>}
    </span>
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

/** Kleiner Papierkorb (eigenes SVG, keine Bibliothek). Farbe kommt vom Knopf (currentColor). */
function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.75 4.25h10.5" />
      <path d="M6.25 4.25V3a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v1.25" />
      <path d="M4 4.25l.65 8.6a1.2 1.2 0 0 0 1.2 1.15h4.3a1.2 1.2 0 0 0 1.2-1.15l.65-8.6" />
      <path d="M6.6 6.9v4.4M9.4 6.9v4.4" />
    </svg>
  )
}
