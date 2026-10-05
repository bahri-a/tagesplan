/**
 * „Vorschläge“ aus der App Projekte und „Aufgeschoben“ (für später beiseitegelegte Vorschläge).
 * Daten liegen im Browser-Speicher, siehe logic/projectSuggestions.ts.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SUGGESTIONS_COUNT, SUGGESTIONS_MAX, SUGGESTIONS_MIN } from '../../config/defaults'
import { T } from '../../config/texts'
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
} from '../../logic/projectSuggestions'
import type { ID } from '../../model/types'
import { addTask } from '../../store/actions'
import { recentKey, tasksOfDay } from '../../store/selectors'
import { useAppState } from '../../store/store'
import { deviceStorage } from '../../logic/deviceStorage'
import { BackIcon, LaterIcon, TrashSmallIcon } from '../../components/icons'
import { ResetButton, TargetSwitch, type TargetProps } from './shared'

/** Liest die offenen Aufgaben aus Projekte – neu, sobald Projekte (in einem anderen Tab) speichert
 * oder das Fenster wieder in den Vordergrund kommt. Fehlende Kurztitel lässt es von Claude
 * formulieren (jeden Titel nur einmal pro Sitzung). */
function useProjectSuggestions() {
  const [tasks, setTasks] = useState<ProjectTask[]>(() => readProjectTasks(deviceStorage()))
  const [shortTitles, setShortTitles] = useState(() => loadShortTitles(deviceStorage()))
  const [hidden, setHidden] = useState(() => loadHidden(deviceStorage()))
  const [deferred, setDeferredState] = useState(() => loadDeferred(deviceStorage()))
  const asked = useRef(new Set<string>())

  /** Alles frisch aus dem Speicher lesen. Liefert die offenen Projekte-Aufgaben. */
  const reload = useCallback(() => {
    const fresh = readProjectTasks(deviceStorage())
    setTasks(fresh)
    setShortTitles(loadShortTitles(deviceStorage()))
    setHidden(loadHidden(deviceStorage()))
    setDeferredState(loadDeferred(deviceStorage()))
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
      const saved = saveShortTitles(deviceStorage(), found)
      if (mounted.current) setShortTitles(saved)
    })
  }, [tasks, shortTitles])

  const hide = (id: string) => setHidden(hideSuggestion(deviceStorage(), id))
  const hideAll = (ids: string[]) => setHidden(hideSuggestions(deviceStorage(), ids))
  const defer = (id: string, value: boolean) => setDeferredState(setDeferred(deviceStorage(), id, value))
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
export function ProjectSuggestions({ days, targetIndex, onTargetChange, showTarget, onNotice }: TargetProps & { showTarget: boolean }) {
  const state = useAppState()
  const { tasks, shortTitles, hidden, hide, hideAll, deferred, defer, reload } = useProjectSuggestions()
  const [menu, setMenu] = useState<{ id: string; place: SuggestionPlace } | null>(null)
  const [dragging, setDragging] = useState<{ id: string; place: SuggestionPlace; title: string } | null>(null)
  const [dropPlace, setDropPlace] = useState<SuggestionPlace | null>(null)
  const [searching, setSearching] = useState(false)
  const [limit, setLimit] = useState(() => loadSuggestionLimit(deviceStorage(), SUGGESTIONS_COUNT, SUGGESTIONS_MIN, SUGGESTIONS_MAX))
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
    const result = await searchNewTasks(deviceStorage())
    setSearching(false)
    const added = reload().filter((t) => !before.has(t.id)).length
    if (!result.ok) onNotice(result.message)
    else onNotice(added > 0 ? T.plan.suggestionsUpdatedNew(added) : T.plan.suggestionsUpdated)
  }
  const changeLimit = (value: number) => {
    setLimit(value)
    saveSuggestionLimit(deviceStorage(), value)
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
                  {/* „max. 5 ⌄“: kleine Auswahl-Pille direkt neben der Überschrift, darüber liegt unsichtbar die Auswahl 1–10. */}
                  <label className="suggestions-limit" title={T.plan.suggestionsLimitHint}>
                    {T.plan.suggestionsLimit(limit)}
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3 4.75 6 7.75l3-3" />
                    </svg>
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
        <TrashSmallIcon />
      </button>
      {isOpen && (
        <div ref={menuRef} className="chip-menu" role="menu" aria-label={item.title}>
          <button type="button" role="menuitem" className="chip-menu-item" onClick={() => onMove(item.id, item.title)}>
            {place === 'suggestions' ? <LaterIcon /> : <BackIcon />}
            {moveLabel}
          </button>
          <button type="button" role="menuitem" className="chip-menu-item" onClick={() => onRemove(item.id)}>
            <TrashSmallIcon />
            {T.plan.deferredRemove}
          </button>
        </div>
      )}
    </li>
  )
}
