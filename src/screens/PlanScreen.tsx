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
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { MANY_TASKS_HINT_FROM, RECENT_TASKS_COUNT, SUGGESTIONS_COUNT, SUGGESTIONS_MAX, SUGGESTIONS_MIN } from '../config/defaults'
import { T } from '../config/texts'
import { Dialog } from '../components/Dialog'
import { TaskCard } from '../components/TaskCard'
import {
  hideSuggestion,
  hideSuggestions,
  loadHidden,
  loadShortTitles,
  loadSuggestionLimit,
  PROJECTS_KEY,
  readProjectTasks,
  loadDeferred,
  requestShortTitles,
  saveShortTitles,
  saveSuggestionLimit,
  searchNewTasks,
  setDeferred,
  suggestionsFor,
  type ProjectTask,
  type Suggestion,
} from '../logic/projectSuggestions'
import { alive } from '../logic/records'
import type { ID, Task } from '../model/types'
import { addTask, copyTask, deleteTask, hideAllRecentTasks, hideRecentTask, moveTask, reorderTasks } from '../store/actions'
import { activeDay, plannedDay, recentKey, recentTasks, runningTimerOfTask, tasksOfDay } from '../store/selectors'
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
  // „Hinzufügen zu“ gilt für „Zuletzt verwendet“ und „Vorschläge“ gemeinsam. 1 = Morgen.
  const [targetIndex, setTargetIndex] = useState(1)

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

      <RecentTasks days={days} targetIndex={targetIndex} onTargetChange={setTargetIndex} onNotice={onNotice} />
      <ProjectSuggestions
        days={days}
        targetIndex={targetIndex}
        onTargetChange={setTargetIndex}
        // Ohne „Zuletzt verwendet“ zeigen die Vorschläge den Umschalter selbst.
        showTarget={!hasRecentTasks(state, days)}
        onNotice={onNotice}
      />

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
 * Ganz unten, leise: die zuletzt benutzten Hauptaufgaben als kleine Knöpfe. Ein Klick legt sie
 * (mit ihren ersten Schritten und Einstellungen) wieder an – standardmäßig für morgen, per
 * Umschalter auch für heute. Was auf dem gewählten Tag schon steht, wird nicht angeboten.
 * Das kleine × in der Pille nimmt eine Aufgabe aus der Liste (sie selbst bleibt unverändert).
 */
type PlanDays = { day: { id: ID }; label: string }[]

interface TargetProps {
  days: PlanDays
  /** Welcher Tag bekommt die Aufgabe? 0 = Heute, 1 = Morgen. */
  targetIndex: number
  onTargetChange: (index: number) => void
  onNotice: (m: string) => void
}

/** Gibt es überhaupt etwas für „Zuletzt verwendet“ (auf einem der beiden Tage)? */
function hasRecentTasks(state: ReturnType<typeof getState>, days: PlanDays): boolean {
  return days.some(({ day }) => recentTasks(state, day.id, 1).length > 0)
}

/** Umschalter „Heute | Morgen“ rechts neben der Überschrift. */
function TargetSwitch({ days, targetIndex, onTargetChange }: Omit<TargetProps, 'onNotice'>) {
  return (
    <div className="segmented recent-target" role="radiogroup" aria-label={T.plan.recentTarget}>
      {days.map(({ label }, index) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={index === targetIndex}
          className="segmented-item"
          onClick={() => onTargetChange(index)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function RecentTasks({ days, targetIndex, onTargetChange, onNotice }: TargetProps) {
  const state = useAppState()
  const target = days[targetIndex]
  const recent = recentTasks(state, target.day.id, RECENT_TASKS_COUNT)
  if (!hasRecentTasks(state, days)) return null

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

/** Liest die offenen Aufgaben aus Projekte – neu, sobald Projekte (in einem anderen Tab) speichert
 * oder das Fenster wieder in den Vordergrund kommt. Fehlende Kurztitel lässt es von Claude
 * formulieren (jeden Titel nur einmal pro Sitzung). */
function useProjectSuggestions() {
  const [tasks, setTasks] = useState<ProjectTask[]>(() => readProjectTasks(localStorage))
  const [shortTitles, setShortTitles] = useState(() => loadShortTitles(localStorage))
  const [hidden, setHidden] = useState(() => loadHidden(localStorage))
  const [deferred, setDeferredState] = useState(() => loadDeferred(localStorage))
  const asked = useRef(new Set<string>())

  /** Alles frisch aus dem Speicher lesen. Liefert die offenen Projekte-Aufgaben. */
  const reload = useCallback(() => {
    const fresh = readProjectTasks(localStorage)
    setTasks(fresh)
    setShortTitles(loadShortTitles(localStorage))
    setHidden(loadHidden(localStorage))
    setDeferredState(loadDeferred(localStorage))
    return fresh
  }, [])
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const onFocus = () => void reload()
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === PROJECTS_KEY) reload()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      mounted.current = false
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [reload])

  useEffect(() => {
    const missing = tasks.map((t) => t.title).filter((t) => !(t in shortTitles) && !asked.current.has(t))
    if (missing.length === 0) return
    for (const t of missing) asked.current.add(t)
    // Die Antwort wird auch gespeichert, wenn „Planen“ inzwischen zu ist – beim nächsten Mal ist sie da.
    void requestShortTitles(missing).then((found) => {
      if (!found || Object.keys(found).length === 0) return
      const saved = saveShortTitles(localStorage, found)
      if (mounted.current) setShortTitles(saved)
    })
  }, [tasks, shortTitles])

  const hide = (id: string) => setHidden(hideSuggestion(localStorage, id))
  const hideAll = (ids: string[]) => setHidden(hideSuggestions(localStorage, ids))
  const defer = (id: string, value: boolean) => setDeferredState(setDeferred(localStorage, id, value))
  return { tasks, shortTitles, hidden, hide, hideAll, deferred, defer, reload }
}

/** Wo ein Vorschlag liegt: bei den „Vorschlägen“ oder unter „Aufgeschoben“. */
type SuggestionPlace = 'suggestions' | 'deferred'

/**
 * „Vorschläge“ unter „Zuletzt verwendet“, im selben Stil: offene Aufgaben aus der App „Projekte“,
 * von Claude kurz als Hauptaufgabe formuliert (1 bis 4 Wörter). Ein Klick legt sie als neue
 * Hauptaufgabe an – auf dem Tag, der oben bei „Hinzufügen zu“ gewählt ist. „Neue Vorschläge“
 * blendet alle gezeigten aus; es erscheinen nur noch die, die wegen der Obergrenze warten mussten.
 * Der kleine Papierkorb blendet einen Vorschlag aus; in Projekte selbst ändert sich nichts.
 *
 * Darunter „Aufgeschoben“: Vorschläge, die man für später beiseitegelegt hat. Verschieben geht auf
 * zwei Arten: ziehen (Maus sofort, Finger nach kurzem Halten) oder über das kleine Menü
 * (Rechtsklick bzw. lange drücken ohne zu ziehen). Aufgeschobene zählen nicht zur Höchstzahl.
 */
function ProjectSuggestions({ days, targetIndex, onTargetChange, showTarget, onNotice }: TargetProps & { showTarget: boolean }) {
  const state = useAppState()
  const { tasks, shortTitles, hidden, hide, hideAll, deferred, defer, reload } = useProjectSuggestions()
  const [menu, setMenu] = useState<{ id: string; place: SuggestionPlace } | null>(null)
  const [dragging, setDragging] = useState<{ id: string; place: SuggestionPlace; title: string } | null>(null)
  const [dropPlace, setDropPlace] = useState<SuggestionPlace | null>(null)
  const [searching, setSearching] = useState(false)
  const [limit, setLimit] = useState(() => loadSuggestionLimit(localStorage, SUGGESTIONS_COUNT, SUGGESTIONS_MIN, SUGGESTIONS_MAX))
  const touchDrag = useRef(false)
  const justDragged = useRef(false)

  const sensors = useSensors(
    // Maus: ab 6 Pixel Bewegung wird gezogen – ein Klick bleibt ein Klick.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Finger: kurz halten, dann ziehen (Scrollen bleibt normal).
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )

  const target = days[targetIndex]
  const onDay = (dayId: ID) => new Set(tasksOfDay(state, dayId).map((t) => recentKey(t.title)))
  const open = tasks.filter((t) => deferred[t.id] === undefined)
  const later = tasks.filter((t) => deferred[t.id] !== undefined)
  const pick = (list: ProjectTask[], dayId: ID, limit: number) =>
    suggestionsFor(list, shortTitles, hidden, onDay(dayId), recentKey, limit)
  const suggestions = pick(open, target.day.id, limit)
  // Wie viele warten noch hinter den gezeigten?
  const waiting = pick(open, target.day.id, Infinity).length - suggestions.length
  const deferredList = pick(later, target.day.id, Infinity)
  // Sobald Projekte offene Aufgaben hat, bleibt „Vorschläge“ sichtbar – mit „Aktualisieren“.
  const hasSuggestions = open.length > 0
  const hasDeferred = deferredList.length > 0 || pick(later, days[1 - targetIndex].day.id, 1).length > 0
  // Beim Ziehen ist die jeweils andere Ablage immer da – auch wenn sie noch leer ist.
  const showSuggestions = hasSuggestions || dragging?.place === 'deferred'
  const showDeferred = hasDeferred || dragging?.place === 'suggestions'
  if (!showSuggestions && !showDeferred) return null

  /**
   * „Aktualisieren“: Der Helfer auf dem Mac sucht im Second Brain und in den Mails nach neuen
   * Aufgaben (wie „Aktualisieren“ in Projekte), danach wird alles neu gelesen.
   */
  const refresh = async () => {
    if (searching) return
    setSearching(true)
    const before = new Set(tasks.map((t) => t.id))
    const result = await searchNewTasks(localStorage)
    setSearching(false)
    const added = reload().filter((t) => !before.has(t.id)).length
    if (!result.ok) onNotice(result.message)
    else onNotice(added > 0 ? T.plan.suggestionsUpdatedNew(added) : T.plan.suggestionsUpdated)
  }
  const changeLimit = (value: number) => {
    setLimit(value)
    saveSuggestionLimit(localStorage, value)
  }
  /** „Neue Vorschläge“: nur tauschen, wenn wirklich weitere warten – sonst bleibt alles stehen. */
  const next = () => {
    if (waiting <= 0) {
      onNotice(T.plan.suggestionsNoMore)
      return
    }
    hideAll(suggestions.map((x) => x.id))
  }

  const move = (id: string, to: SuggestionPlace, title: string) => {
    setMenu(null)
    defer(id, to === 'deferred')
    onNotice(to === 'deferred' ? T.plan.deferredMoved(title) : T.plan.deferredBack(title))
  }
  const add = (title: string) => {
    if (justDragged.current) return
    addTask(target.day.id, title)
    onNotice(T.plan.recentAdded(title, target.label))
  }
  const remove = (id: string) => {
    setMenu(null)
    hide(id)
  }

  const handleDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const data = active.data.current as { place: SuggestionPlace; title: string }
    touchDrag.current = 'touches' in activatorEvent
    justDragged.current = true
    setMenu(null)
    setDragging({ id: String(active.id), place: data.place, title: data.title })
  }
  const handleDragEnd = ({ active, over, delta }: DragEndEvent) => {
    const from = dragging?.place
    const title = dragging?.title ?? ''
    setDragging(null)
    setDropPlace(null)
    // Der Klick nach dem Loslassen soll nichts anlegen.
    setTimeout(() => (justDragged.current = false), 0)
    const to = over ? (String(over.id) as SuggestionPlace) : null
    if (from && to && to !== from) move(String(active.id), to, title)
    // Nur lange gedrückt, nicht gezogen (Finger): das kleine Menü öffnen.
    else if (from && touchDrag.current && Math.hypot(delta.x, delta.y) < 8) setMenu({ id: String(active.id), place: from })
  }

  const chipProps = (place: SuggestionPlace) => ({
    place,
    targetLabel: target.label,
    menuOpen: (id: string) => menu?.id === id,
    onMenu: (id: string) => setMenu((m) => (m?.id === id ? null : { id, place })),
    onCloseMenu: () => setMenu(null),
    onAdd: add,
    onRemove: remove,
    onMove: (id: string, title: string) => move(id, place === 'suggestions' ? 'deferred' : 'suggestions', title),
    draggingId: dragging?.id ?? null,
  })

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={({ over }) => setDropPlace(over ? (String(over.id) as SuggestionPlace) : null)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null)
        setDropPlace(null)
        setTimeout(() => (justDragged.current = false), 0)
      }}
    >
      {showSuggestions && (
        <SuggestionArea
          place="suggestions"
          title={T.plan.suggestionsTitle}
          isDropTarget={dragging?.place === 'deferred' && dropPlace === 'suggestions'}
          dropHint={dragging?.place === 'deferred' ? T.plan.deferredDropBack : null}
          head={
            <>
              {!dragging && (
                <span className="suggestions-actions">
                  <button
                    type="button"
                    className={`suggestions-refresh suggestions-reload${searching ? ' is-busy' : ''}`}
                    title={searching ? T.plan.suggestionsSearching : T.plan.suggestionsReloadHint}
                    aria-label={searching ? T.plan.suggestionsSearching : T.plan.suggestionsReload}
                    aria-busy={searching}
                    disabled={searching}
                    onClick={() => void refresh()}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M13.25 8a5.25 5.25 0 1 1-1.54-3.71" />
                      <path d="M13.25 2.75v2.5h-2.5" />
                    </svg>
                  </button>
                  {/* „(max. 5)“: sieht aus wie ein leiser Textknopf, darüber liegt unsichtbar die Auswahl 1–10. */}
                  <label className="suggestions-refresh suggestions-limit" title={T.plan.suggestionsLimitHint}>
                    {T.plan.suggestionsLimit(limit)}
                    <select
                      value={limit}
                      aria-label={T.plan.suggestionsLimitHint}
                      onChange={(e) => changeLimit(Number(e.target.value))}
                    >
                      {Array.from({ length: SUGGESTIONS_MAX - SUGGESTIONS_MIN + 1 }, (_, i) => SUGGESTIONS_MIN + i).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {suggestions.length > 0 && (
                    <button
                      type="button"
                      className="suggestions-refresh"
                      title={waiting > 0 ? T.plan.suggestionsRefreshHint(waiting) : T.plan.suggestionsNoMore}
                      onClick={next}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" />
                      </svg>
                      {T.plan.suggestionsRefresh}
                      {waiting > 0 && <span className="suggestions-count">{waiting}</span>}
                    </button>
                  )}
                  {/* „Reset“: alle Vorschläge ausblenden – erst nach kurzer Bestätigung. */}
                  {suggestions.length > 0 && (
                    <ResetButton
                      hint={T.plan.suggestionsResetHint}
                      confirm={T.plan.suggestionsResetQuestion}
                      onReset={() => {
                        hideAll(open.map((t) => t.id))
                        onNotice(T.plan.suggestionsResetDone)
                      }}
                    />
                  )}
                </span>
              )}
              {showTarget && <TargetSwitch days={days} targetIndex={targetIndex} onTargetChange={onTargetChange} />}
            </>
          }
        >
          {suggestions.length === 0 && hasSuggestions && !dragging && (
            <p className="muted small">
              {pick(open, target.day.id, 1).length === 0 && open.some((t) => hidden[t.id] === undefined)
                ? T.plan.recentNone(target.label)
                : T.plan.suggestionsNone}
            </p>
          )}
          {!hasSuggestions && <p className="suggestions-empty">{T.plan.deferredEmptyBack}</p>}
          <SuggestionList items={suggestions} {...chipProps('suggestions')} />
        </SuggestionArea>
      )}

      {showDeferred && (
        <SuggestionArea
          place="deferred"
          title={T.plan.deferredTitle}
          subtitle={T.plan.deferredSubtitle}
          isDropTarget={dragging?.place === 'suggestions' && dropPlace === 'deferred'}
          dropHint={dragging?.place === 'suggestions' ? T.plan.deferredDropHere : null}
          head={!showSuggestions && showTarget ? <TargetSwitch days={days} targetIndex={targetIndex} onTargetChange={onTargetChange} /> : null}
        >
          {deferredList.length === 0 && hasDeferred && <p className="muted small">{T.plan.recentNone(target.label)}</p>}
          {!hasDeferred && <p className="suggestions-empty">{T.plan.deferredEmpty}</p>}
          <SuggestionList items={deferredList} {...chipProps('deferred')} />
        </SuggestionArea>
      )}

      {/* Die Pille, die unter dem Finger bzw. der Maus mitwandert. */}
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <span className="recent-chip suggestion-chip is-dragged">
            <span className="recent-plus" aria-hidden="true">
              +
            </span>
            <span className="recent-chip-title">{dragging.title}</span>
          </span>
        )}
      </DragOverlay>
    </DndContext>
  )
}

/** Überschrift und Ablagefläche für „Vorschläge“ bzw. „Aufgeschoben“. */
function SuggestionArea(props: {
  place: SuggestionPlace
  title: string
  /** Leiser Zusatz neben der Überschrift. */
  subtitle?: string
  head: ReactNode
  isDropTarget: boolean
  /** Beim Ziehen aus dem anderen Bereich: kurzer Hinweis, dass man hier ablegen kann. */
  dropHint: string | null
  children: ReactNode
}) {
  const { place, title, subtitle, head, isDropTarget, dropHint, children } = props
  const { setNodeRef } = useDroppable({ id: place })
  return (
    <section
      ref={setNodeRef}
      className={`recent suggestions suggestions-${place}${dropHint ? ' is-drop-zone' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
      aria-label={title}
    >
      <div className="recent-head">
        <h2 className="recent-title">{title}</h2>
        {subtitle && <span className="recent-subtitle">{subtitle}</span>}
        {dropHint && <span className="drop-hint">{dropHint}</span>}
        {head}
      </div>
      {children}
    </section>
  )
}

interface SuggestionListProps {
  items: Suggestion[]
  place: SuggestionPlace
  targetLabel: string
  draggingId: string | null
  menuOpen: (id: string) => boolean
  onMenu: (id: string) => void
  onCloseMenu: () => void
  onAdd: (title: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, title: string) => void
}

function SuggestionList({ items, ...rest }: SuggestionListProps) {
  if (items.length === 0) return null
  // Alle Pillen gleich breit in einem ruhigen Raster; lange Titel brechen mit Bindestrich um.
  return (
    <ul className="recent-list suggestion-grid">
      {items.map((item) => (
        <SuggestionChip key={item.id} item={item} {...rest} />
      ))}
    </ul>
  )
}

/**
 * Eine Vorschlags-Pille: Klick legt an, ziehen verschiebt, Rechtsklick bzw. lange drücken öffnet
 * ein kleines Menü („Aufschieben“ bzw. „Zu den Vorschlägen“, „Entfernen“).
 */
function SuggestionChip({
  item,
  place,
  targetLabel,
  draggingId,
  menuOpen,
  onMenu,
  onCloseMenu,
  onAdd,
  onRemove,
  onMove,
}: Omit<SuggestionListProps, 'items'> & { item: Suggestion }) {
  const { setNodeRef, listeners } = useDraggable({ id: item.id, data: { place, title: item.title } })
  const isOpen = menuOpen(item.id)
  const menuRef = useRef<HTMLDivElement>(null)

  // Menü schließen: Klick daneben oder Escape.
  useEffect(() => {
    if (!isOpen) return
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onCloseMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMenu()
    }
    // Erst nach dem aktuellen Druck lauschen – sonst schließt das Loslassen das Menü gleich wieder.
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointer), 0)
    document.addEventListener('keydown', onKey)
    menuRef.current?.querySelector('button')?.focus()
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onCloseMenu])

  const moveLabel = place === 'suggestions' ? T.plan.deferredMove : T.plan.deferredMoveBack

  return (
    <li className={`recent-item${draggingId === item.id ? ' is-dragging' : ''}`}>
      <button
        ref={setNodeRef}
        type="button"
        className="recent-chip suggestion-chip"
        aria-label={T.plan.recentAdd(item.title, targetLabel)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={T.plan.suggestionSource(item.source)}
        onClick={() => onAdd(item.title)}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu(item.id)
        }}
        {...listeners}
      >
        <span className="recent-plus" aria-hidden="true">
          +
        </span>
        <span className="recent-chip-title">{item.title}</span>
      </button>
      {/* Kleiner, leiser Papierkorb oben rechts an der Pille. */}
      <button
        type="button"
        className="suggestion-remove"
        aria-label={T.plan.suggestionHide(item.title)}
        title={T.plan.suggestionHide(item.title)}
        onClick={() => onRemove(item.id)}
      >
        <TrashIcon />
      </button>
      {isOpen && (
        <div ref={menuRef} className="chip-menu" role="menu" aria-label={item.title}>
          <button type="button" role="menuitem" className="chip-menu-item" onClick={() => onMove(item.id, item.title)}>
            {place === 'suggestions' ? <LaterIcon /> : <BackIcon />}
            {moveLabel}
          </button>
          <button type="button" role="menuitem" className="chip-menu-item" onClick={() => onRemove(item.id)}>
            <TrashIcon />
            {T.plan.deferredRemove}
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * Leiser Textknopf „Reset“. Mit `confirm` fragt ein kleines Fenster darunter erst nach
 * („Ausblenden“ / „Abbrechen“); Klick daneben oder Escape schließt es.
 */
function ResetButton({ hint, confirm, onReset }: { hint: string; confirm?: string; onReset: () => void }) {
  const [asking, setAsking] = useState(false)
  const boxRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!asking) return
    const onPointer = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setAsking(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAsking(false)
    }
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointer), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [asking])

  return (
    <span ref={boxRef} className="reset-box">
      <button
        type="button"
        className="suggestions-refresh reset-button"
        title={hint}
        aria-expanded={confirm ? asking : undefined}
        onClick={() => (confirm ? setAsking((a) => !a) : onReset())}
      >
        {T.plan.listReset}
      </button>
      {asking && confirm && (
        <span className="chip-menu reset-confirm" role="dialog" aria-label={confirm}>
          <span className="reset-question">{confirm}</span>
          <span className="reset-actions">
            <button type="button" className="reset-cancel" onClick={() => setAsking(false)}>
              {T.plan.suggestionsResetCancel}
            </button>
            <button
              type="button"
              className="reset-ok"
              autoFocus
              onClick={() => {
                setAsking(false)
                onReset()
              }}
            >
              {T.plan.suggestionsResetConfirm}
            </button>
          </span>
        </span>
      )}
    </span>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.75 4.25h10.5" />
      <path d="M6.25 4.25V3a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v1.25" />
      <path d="M4 4.25l.65 8.6a1.2 1.2 0 0 0 1.2 1.15h4.3a1.2 1.2 0 0 0 1.2-1.15l.65-8.6" />
    </svg>
  )
}

/** Uhr – „Aufschieben“. */
function LaterIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 5v3.25l2 1.25" />
    </svg>
  )
}

/** Pfeil nach oben – „Zu den Vorschlägen“. */
function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 12.75V3.5M4.25 7.25L8 3.5l3.75 3.75" />
    </svg>
  )
}
