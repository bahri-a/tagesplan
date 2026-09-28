/**
 * BILDSCHIRM „PLANEN“
 * Zwei Spalten: Heute und Morgen. Hauptaufgaben anlegen, per Drag & Drop sortieren – auch
 * hinüber auf den anderen Tag – und aufklappen, um Schritte und Blöcke festzulegen.
 * Karten von heute lassen sich mit einem Klick für morgen kopieren.
 * Löschen über den Papierkorb: sofort, danach kurz „Rückgängig“ (zeigt die App unten an).
 * Nur wenn für die Aufgabe gerade ein Block oder eine kurze Pause läuft, wird vorher gefragt –
 * „Rückgängig“ holt den Timer nämlich nicht zurück.
 * Ganz unten, leise: „Zuletzt verwendet“ – ein Klick legt eine frühere Aufgabe wieder an.
 */

import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { RECENT_TASKS_COUNT } from '../config/defaults'
import { T } from '../config/texts'
import { Dialog } from '../components/Dialog'
import { TaskCard } from '../components/TaskCard'
import type { ID, Task } from '../model/types'
import { addTask, copyTask, deleteTask, hideRecentTask, moveTask, reorderTasks } from '../store/actions'
import { activeDay, plannedDay, recentTasks, runningTimerOfTask, tasksOfDay } from '../store/selectors'
import { getState, useAppState } from '../store/store'
import './plan.css'

/** Kennung der Spalte als Ablagefläche (für leere Spalten und „ans Ende“). */
const COLUMN_PREFIX = 'column:'

/**
 * Worüber wird gerade gezogen? Zuerst eine Karte direkt unter dem Mauszeiger, sonst die Spalte
 * darunter; ohne Maus (Tastatur) die nächstgelegene Karte.
 */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const cardHit = hits.find((hit) => !String(hit.id).startsWith(COLUMN_PREFIX))
  if (cardHit) return [cardHit]
  if (hits.length > 0) return hits
  return closestCenter(args)
}

interface Props {
  /** Eine Aufgabe wurde gelöscht – die App zeigt dann „Aufgabe gelöscht · Rückgängig“. */
  onTaskDeleted: (taskId: ID) => void
  /** Kurze Meldung unten anzeigen (z. B. „… für morgen kopiert“). */
  onNotice: (message: string) => void
}

export function PlanScreen({ onTaskDeleted, onNotice }: Props) {
  const state = useAppState()
  // Es ist immer höchstens eine Aufgabe aufgeklappt – das hält es ruhig.
  const [expandedId, setExpandedId] = useState<ID | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<ID | null>(null)
  // Rückfrage vor dem Löschen, wenn für die Aufgabe gerade ein Block oder eine Pause läuft.
  const [confirmDelete, setConfirmDelete] = useState<{ task: Task; running: 'block' | 'break' } | null>(null)
  // Beim Ziehen auf den ANDEREN Tag: diese Spalte wird hervorgehoben.
  const [dropDayId, setDropDayId] = useState<ID | null>(null)

  const days = [
    { day: activeDay(state), label: T.plan.today },
    { day: plannedDay(state), label: T.plan.tomorrow },
  ]
  const labelOf = (dayId: ID) => days.find((d) => d.day.id === dayId)?.label ?? ''

  const toggle = (id: ID) => setExpandedId((current) => (current === id ? null : id))
  const created = (id: ID) => {
    setExpandedId(id)
    setJustCreatedId(id)
  }

  const remove = (id: ID) => {
    setConfirmDelete(null)
    deleteTask(id)
    // Kommt die Aufgabe per „Rückgängig“ zurück, ist sie zugeklappt.
    setExpandedId((current) => (current === id ? null : current))
    onTaskDeleted(id)
  }

  const requestDelete = (task: Task) => {
    const running = runningTimerOfTask(getState(), task.id, Date.now())
    if (running) setConfirmDelete({ task, running })
    else remove(task.id)
  }

  const copyToTomorrow = (task: Task) => {
    copyTask(task.id, plannedDay(getState()).id)
    onNotice(T.plan.copied(task.title || '…'))
  }

  // ---------- Drag & Drop: sortieren innerhalb eines Tages und hinüber auf den anderen ----------

  const sensors = useSensors(
    // Erst ab 4 Pixel Bewegung wird gezogen – ein normaler Klick bleibt ein Klick.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Zu welchem Tag gehört die Karte oder Spalte mit dieser Kennung? */
  const dayOf = (id: UniqueIdentifier): ID | null => {
    const key = String(id)
    if (key.startsWith(COLUMN_PREFIX)) return key.slice(COLUMN_PREFIX.length)
    return getState().tasks[key]?.dayId ?? null
  }
  const titleOf = (id: UniqueIdentifier) => getState().tasks[String(id)]?.title ?? ''
  const placeOf = (id: UniqueIdentifier) => {
    const dayId = dayOf(id)
    if (!dayId) return 1
    const tasks = tasksOfDay(getState(), dayId)
    const index = tasks.findIndex((t) => t.id === String(id))
    return index === -1 ? tasks.length + 1 : index + 1
  }

  // Deutsche Ansagen für Screenreader (statt der englischen Standardtexte).
  const announcements: Announcements = {
    onDragStart: ({ active }) => T.plan.dragStart(titleOf(active.id)),
    onDragOver: ({ active, over }) => (over ? T.plan.dragOver(titleOf(active.id), placeOf(over.id)) : undefined),
    onDragEnd: ({ active, over }) =>
      over ? T.plan.dragEnd(titleOf(active.id), placeOf(over.id)) : T.plan.dragCancel(titleOf(active.id)),
    onDragCancel: ({ active }) => T.plan.dragCancel(titleOf(active.id)),
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const target = over ? dayOf(over.id) : null
    setDropDayId(target !== null && target !== dayOf(active.id) ? target : null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDropDayId(null)
    if (!over || active.id === over.id) return
    const fromDay = dayOf(active.id)
    const toDay = dayOf(over.id)
    if (!fromDay || !toDay) return

    if (fromDay === toDay) {
      // Innerhalb desselben Tages umsortieren.
      if (String(over.id).startsWith(COLUMN_PREFIX)) return
      const ids = tasksOfDay(getState(), fromDay).map((t) => t.id)
      reorderTasks(fromDay, arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
      return
    }

    // Auf den anderen Tag: vor die Karte, über der losgelassen wurde – sonst ans Ende.
    const target = tasksOfDay(getState(), toDay)
    const overIndex = target.findIndex((t) => t.id === String(over.id))
    const moved = moveTask(String(active.id), toDay, overIndex === -1 ? target.length : overIndex)
    onNotice(moved ? T.plan.dragMoved(titleOf(active.id), labelOf(toDay)) : T.plan.moveBlocked)
  }

  return (
    <div className="plan">
      <p className="plan-hint muted">{T.plan.hardestFirst}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDropDayId(null)}
        accessibility={{ announcements, screenReaderInstructions: { draggable: T.plan.dragInstructions } }}
      >
        <div className="plan-columns">
          {days.map(({ day, label }, index) => (
            <DayColumn
              key={day.id}
              dayId={day.id}
              label={label}
              isDropTarget={dropDayId === day.id}
              expandedId={expandedId}
              justCreatedId={justCreatedId}
              onToggle={toggle}
              onCreated={created}
              onDelete={requestDelete}
              // Kopieren gibt es auf den Karten von heute (→ morgen).
              onCopy={index === 0 ? copyToTomorrow : undefined}
            />
          ))}
        </div>
      </DndContext>

      <RecentTasks days={days} onNotice={onNotice} />

      {confirmDelete && (
        <Dialog title={`„${confirmDelete.task.title || '…'}“`} onClose={() => setConfirmDelete(null)}>
          <p className="dialog-text">
            {confirmDelete.running === 'block' ? T.plan.deleteRunningBlock : T.plan.deleteRunningBreak}
          </p>
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(null)}>
              {T.plan.deleteNo}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => remove(confirmDelete.task.id)}>
              {T.plan.deleteYes}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

interface DayColumnProps {
  dayId: ID
  label: string
  /** Gerade wird eine Karte vom anderen Tag hierher gezogen. */
  isDropTarget: boolean
  expandedId: ID | null
  justCreatedId: ID | null
  onToggle: (id: ID) => void
  onCreated: (id: ID) => void
  onDelete: (task: Task) => void
  onCopy?: (task: Task) => void
}

function DayColumn(props: DayColumnProps) {
  const { dayId, label, isDropTarget, expandedId, justCreatedId, onToggle, onCreated, onDelete, onCopy } = props
  const state = useAppState()
  const tasks = tasksOfDay(state, dayId)
  const max = state.settings.maxTasksPerDay
  const [newTitle, setNewTitle] = useState('')
  // Die ganze Spalte ist Ablagefläche – so klappt es auch, wenn der Tag noch leer ist.
  const { setNodeRef } = useDroppable({ id: COLUMN_PREFIX + dayId })

  const submitNewTask = () => {
    if (!newTitle.trim()) return
    const task = addTask(dayId, newTitle)
    setNewTitle('')
    onCreated(task.id)
  }

  return (
    <section ref={setNodeRef} className={`plan-column${isDropTarget ? ' is-drop-target' : ''}`} aria-label={label}>
      <h2 className="plan-column-title">
        {label}
        {isDropTarget && <span className="drop-hint">{T.plan.dropHere}</span>}
      </h2>

      {tasks.length > max && <p className="hint">{T.plan.overLimit(max)}</p>}

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ol className="task-list">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              number={index + 1}
              expanded={expandedId === task.id}
              focusStepInput={justCreatedId === task.id}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task)}
              onCopy={onCopy ? () => onCopy(task) : undefined}
            />
          ))}
        </ol>
      </SortableContext>

      {tasks.length === 0 && <p className="muted small plan-empty">{T.plan.empty}</p>}

      <form
        className="new-task"
        onSubmit={(e) => {
          e.preventDefault()
          submitNewTask()
        }}
      >
        <input
          className="input"
          value={newTitle}
          placeholder={T.plan.newTask}
          aria-label={`${T.plan.newTask} (${label})`}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!newTitle.trim()}>
          {T.plan.add}
        </button>
      </form>
    </section>
  )
}

/**
 * Ganz unten, leise: die zuletzt benutzten Hauptaufgaben als kleine Knöpfe. Ein Klick legt sie
 * (mit ihren ersten Schritten und Einstellungen) wieder an – standardmäßig für morgen, per
 * Umschalter auch für heute. Was auf dem gewählten Tag schon steht, wird nicht angeboten.
 * Das kleine × in der Pille nimmt eine Aufgabe aus der Liste (sie selbst bleibt unverändert).
 */
function RecentTasks({ days, onNotice }: { days: { day: { id: ID }; label: string }[]; onNotice: (m: string) => void }) {
  const state = useAppState()
  const [targetIndex, setTargetIndex] = useState(1) // 1 = Morgen
  const target = days[targetIndex]
  const recent = recentTasks(state, target.day.id, RECENT_TASKS_COUNT)
  if (recent.length === 0 && recentTasks(state, days[1 - targetIndex].day.id, 1).length === 0) return null

  return (
    <section className="recent" aria-label={T.plan.recentTitle}>
      <div className="recent-head">
        <h2 className="recent-title">{T.plan.recentTitle}</h2>
        <div className="segmented recent-target" role="radiogroup" aria-label={T.plan.recentTarget}>
          {days.map(({ label }, index) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={index === targetIndex}
              className="segmented-item"
              onClick={() => setTargetIndex(index)}
            >
              {label}
            </button>
          ))}
        </div>
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
