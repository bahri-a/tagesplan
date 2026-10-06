/**
 * BILDSCHIRM „PLANEN“
 * Zwei Spalten: Heute und Morgen. Hauptaufgaben anlegen, per Drag & Drop sortieren – auch
 * hinüber auf den anderen Tag – und aufklappen, um Schritte und Blöcke festzulegen.
 * Karten von heute lassen sich mit einem Klick für morgen kopieren.
 * Löschen über den Papierkorb: sofort, danach kurz „Rückgängig“ (zeigt die App unten an).
 * Nur wenn für die Aufgabe gerade ein Block oder eine kurze Pause läuft, wird vorher gefragt –
 * „Rückgängig“ holt den Timer nämlich nicht zurück.
 * Ganz unten, leise: „Zuletzt verwendet“ – ein Klick legt eine frühere Aufgabe wieder an.
 * Darunter „Vorschläge“: offene Aufgaben aus der App „Projekte“, kurz als Hauptaufgabe formuliert,
 * und „Aufgeschoben“ für Vorschläge, die man für später beiseitegelegt hat.
 *
 * Am Handy passt alles auf einen Bildschirm: oben „Heute | Morgen“ zum Umschalten (statt zwei
 * Spalten), daneben der Tausch-Knopf; eine Aufgabe bearbeitest du auf einem eigenen Blatt; ganz
 * unten „Zuletzt verwendet“ als eine Zeile. Vorschläge und Aufgeschoben gibt es nur am Mac.
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
import { MANY_TASKS_HINT_FROM } from '../../config/defaults'
import { T } from '../../config/texts'
import { TaskCard } from '../../components/TaskCard'
import type { ID, Task } from '../../model/types'
import { addTask, copyTask, deleteTask, moveTask, reorderTasks, swapDays } from '../../store/actions'
import { activeDay, hasRecentTasks, plannedDay, tasksOfDay } from '../../store/selectors'
import { getState, useAppState } from '../../store/store'
import { IS_MOBILE } from '../../platform/device'
import { RecentTasks } from './RecentTasks'
import { ProjectSuggestions } from './Suggestions'
import { type PlanDays } from './shared'
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
  /** Am Handy gleich „Morgen“ zeigen (nach „Morgen planen“ in „Heute“). */
  startOnTomorrow?: boolean
  /** Eine Aufgabe wurde gelöscht – die App zeigt dann „Aufgabe gelöscht · Rückgängig“. */
  onTaskDeleted: (taskId: ID) => void
  /** Kurze Meldung unten anzeigen (z. B. „… für morgen kopiert“). */
  onNotice: (message: string) => void
}

export function PlanScreen({ startOnTomorrow = false, onTaskDeleted, onNotice }: Props) {
  const state = useAppState()
  // Es ist immer höchstens eine Aufgabe aufgeklappt – das hält es ruhig.
  const [expandedId, setExpandedId] = useState<ID | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<ID | null>(null)
  // Beim Ziehen auf den ANDEREN Tag: diese Spalte wird hervorgehoben.
  const [dropDayId, setDropDayId] = useState<ID | null>(null)
  // „Hinzufügen zu“ gilt für „Zuletzt verwendet“ und „Vorschläge“ gemeinsam. 1 = Morgen.
  const [targetIndex, setTargetIndex] = useState(1)
  // Handy: welcher Tag gerade zu sehen ist (0 = Heute, 1 = Morgen).
  const [shownIndex, setShownIndex] = useState(startOnTomorrow ? 1 : 0)

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
    deleteTask(id)
    // Kommt die Aufgabe per „Rückgängig“ zurück, ist sie zugeklappt.
    setExpandedId((current) => (current === id ? null : current))
    onTaskDeleted(id)
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
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDropDayId(null)}
        accessibility={{ announcements, screenReaderInstructions: { draggable: T.plan.dragInstructions } }}
      >
        {IS_MOBILE && (
          <div className="plan-day-switch">
            <DaySwitch days={days} shownIndex={shownIndex} onChange={setShownIndex} />
            <SwapDays days={days} onNotice={onNotice} compact />
          </div>
        )}
        <div className="plan-columns">
          {days.map(({ day, label }, index) =>
            // Handy: nur der oben gewählte Tag.
            IS_MOBILE && index !== shownIndex ? null : (
              <DayColumn
                key={day.id}
                dayId={day.id}
                label={label}
                isDropTarget={dropDayId === day.id}
                expandedId={expandedId}
                justCreatedId={justCreatedId}
                onToggle={toggle}
                onCreated={created}
                onDelete={(task) => remove(task.id)}
                // Kopieren gibt es auf den Karten von heute (→ morgen).
                onCopy={index === 0 ? copyToTomorrow : undefined}
              />
            ),
          )}
        </div>
      </DndContext>

      {!IS_MOBILE && <SwapDays days={days} onNotice={onNotice} />}

      {/* Handy: „Zuletzt verwendet“ legt immer auf dem gerade gezeigten Tag an. */}
      <RecentTasks
        days={days}
        targetIndex={IS_MOBILE ? shownIndex : targetIndex}
        onTargetChange={IS_MOBILE ? setShownIndex : setTargetIndex}
        onNotice={onNotice}
      />
      {!IS_MOBILE && (
        <ProjectSuggestions
          days={days}
          targetIndex={targetIndex}
          onTargetChange={setTargetIndex}
          // Ohne „Zuletzt verwendet“ zeigen die Vorschläge den Umschalter selbst.
          showTarget={!hasRecentTasks(state, days.map((d) => d.day.id))}
          onNotice={onNotice}
        />
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
      {/* Viele Hauptaufgaben? Ein leiser Tipp statt einer festen Grenze. */}
      {tasks.length >= MANY_TASKS_HINT_FROM && <p className="plan-tip">{T.plan.manyTasks}</p>}

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
        <button type="submit" className="btn new-task-add" disabled={!newTitle.trim()} aria-label={T.plan.add} title={T.plan.add}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3.25v9.5M3.25 8h9.5" />
          </svg>
        </button>
      </form>
    </section>
  )
}

/**
 * Leiser Knopf mittig unter beiden Spalten: „Heute ⇄ Morgen“ tauscht die Aufgaben der beiden Tage.
 * Hat nur ein Tag Aufgaben, wandern sie auf den anderen. Nur sichtbar, wenn es etwas zu tauschen gibt.
 */
function SwapDays({ days, onNotice, compact = false }: { days: PlanDays; onNotice: (message: string) => void; compact?: boolean }) {
  const state = useAppState()
  const [today, tomorrow] = days
  const todayCount = tasksOfDay(state, today.day.id).length
  const tomorrowCount = tasksOfDay(state, tomorrow.day.id).length
  if (todayCount === 0 && tomorrowCount === 0) return null

  const hint = todayCount === 0 ? T.plan.swapToToday : tomorrowCount === 0 ? T.plan.swapToTomorrow : T.plan.swapDays
  const swap = () => {
    if (!swapDays()) {
      onNotice(T.plan.swapBlocked)
      return
    }
    if (todayCount > 0 && tomorrowCount > 0) onNotice(T.plan.swapped)
    else onNotice(T.plan.swappedTo(todayCount === 0 ? today.label : tomorrow.label))
  }

  const icon = (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 5.5h11M10.5 2.5l3 3-3 3M13.5 10.5h-11M5.5 7.5l-3 3 3 3" />
    </svg>
  )
  // Handy: nur das Symbol, rund, direkt neben „Heute | Morgen“.
  if (compact) {
    return (
      <button type="button" className="plan-swap-button is-compact" onClick={swap} title={hint} aria-label={hint}>
        {icon}
      </button>
    )
  }
  return (
    <div className="plan-swap">
      <button type="button" className="plan-swap-button" onClick={swap} title={hint} aria-label={hint}>
        <span>{today.label}</span>
        {icon}
        <span>{tomorrow.label}</span>
      </button>
    </div>
  )
}

/** Handy: „Heute | Morgen“ oben im Planer – zeigt einen der beiden Tage (mit Anzahl der Aufgaben). */
function DaySwitch({ days, shownIndex, onChange }: { days: PlanDays; shownIndex: number; onChange: (index: number) => void }) {
  const state = useAppState()
  return (
    <div className="segmented plan-day-tabs" role="tablist" aria-label={T.plan.dayTabs}>
      {days.map(({ day, label }, index) => {
        const count = tasksOfDay(state, day.id).filter((t) => t.completedAt === null).length
        return (
          <button
            key={day.id}
            type="button"
            role="tab"
            aria-selected={index === shownIndex}
            className="segmented-item"
            onClick={() => onChange(index)}
          >
            {label}
            {count > 0 && <span className="plan-day-count">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
