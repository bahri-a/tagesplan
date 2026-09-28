/**
 * BILDSCHIRM „PLANEN“
 * Zwei Spalten: Heute und Morgen. Hauptaufgaben anlegen, per Drag & Drop
 * sortieren und aufklappen, um Schritte und Blöcke festzulegen.
 * Löschen über den Papierkorb: sofort, danach kurz „Rückgängig“ (zeigt die App unten an).
 * Nur wenn für die Aufgabe gerade ein Block oder eine kurze Pause läuft, wird vorher gefragt –
 * „Rückgängig“ holt den Timer nämlich nicht zurück.
 */

import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { T } from '../config/texts'
import { Dialog } from '../components/Dialog'
import { TaskCard } from '../components/TaskCard'
import type { ID, Task } from '../model/types'
import { addTask, deleteTask, reorderTasks } from '../store/actions'
import { activeDay, plannedDay, runningTimerOfTask, tasksOfDay } from '../store/selectors'
import { getState, useAppState } from '../store/store'
import './plan.css'

interface Props {
  /** Eine Aufgabe wurde gelöscht – die App zeigt dann „Aufgabe gelöscht · Rückgängig“. */
  onTaskDeleted: (taskId: ID) => void
}

export function PlanScreen({ onTaskDeleted }: Props) {
  const state = useAppState()
  // Es ist immer höchstens eine Aufgabe aufgeklappt – das hält es ruhig.
  const [expandedId, setExpandedId] = useState<ID | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<ID | null>(null)
  // Rückfrage vor dem Löschen, wenn für die Aufgabe gerade ein Block oder eine Pause läuft.
  const [confirmDelete, setConfirmDelete] = useState<{ task: Task; running: 'block' | 'break' } | null>(null)

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

  return (
    <div className="plan">
      <p className="plan-hint muted">{T.plan.hardestFirst}</p>
      <div className="plan-columns">
        {[
          { day: activeDay(state), label: T.plan.today },
          { day: plannedDay(state), label: T.plan.tomorrow },
        ].map(({ day, label }) => (
          <DayColumn
            key={day.id}
            dayId={day.id}
            label={label}
            expandedId={expandedId}
            justCreatedId={justCreatedId}
            onToggle={toggle}
            onCreated={created}
            onDelete={requestDelete}
          />
        ))}
      </div>

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
  expandedId: ID | null
  justCreatedId: ID | null
  onToggle: (id: ID) => void
  onCreated: (id: ID) => void
  onDelete: (task: Task) => void
}

function DayColumn({ dayId, label, expandedId, justCreatedId, onToggle, onCreated, onDelete }: DayColumnProps) {
  const state = useAppState()
  const tasks = tasksOfDay(state, dayId)
  const max = state.settings.maxTasksPerDay
  const [newTitle, setNewTitle] = useState('')

  const sensors = useSensors(
    // Erst ab 4 Pixel Bewegung wird gezogen – ein normaler Klick bleibt ein Klick.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Deutsche Ansagen für Screenreader (statt der englischen Standardtexte).
  const titleOf = (id: UniqueIdentifier) => tasks.find((t) => t.id === id)?.title ?? ''
  const placeOf = (id: UniqueIdentifier) => tasks.findIndex((t) => t.id === id) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => T.plan.dragStart(titleOf(active.id)),
    onDragOver: ({ active, over }) => (over ? T.plan.dragOver(titleOf(active.id), placeOf(over.id)) : undefined),
    onDragEnd: ({ active, over }) =>
      over ? T.plan.dragEnd(titleOf(active.id), placeOf(over.id)) : T.plan.dragCancel(titleOf(active.id)),
    onDragCancel: ({ active }) => T.plan.dragCancel(titleOf(active.id)),
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = tasks.map((t) => t.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    reorderTasks(dayId, arrayMove(ids, from, to))
  }

  const submitNewTask = () => {
    if (!newTitle.trim()) return
    const task = addTask(dayId, newTitle)
    setNewTitle('')
    onCreated(task.id)
  }

  return (
    <section className="plan-column" aria-label={label}>
      <h2 className="plan-column-title">{label}</h2>

      {tasks.length > max && <p className="hint">{T.plan.overLimit(max)}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements, screenReaderInstructions: { draggable: T.plan.dragInstructions } }}
      >
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
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

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
