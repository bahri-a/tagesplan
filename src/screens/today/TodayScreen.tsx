/**
 * BILDSCHIRM „HEUTE“ (Durchführen)
 * ================================
 * Zeigt immer die oberste noch nicht erledigte Hauptaufgabe – groß und ruhig:
 *  - oben in der Karte: die Block-Punkte (mit „je 25 Min.“), darunter der Titel
 *  - vor dem Start: die ersten Schritte zum Ansehen (noch nicht abhakbar), „Block starten“
 *    (ab der zweiten Aufgabe zweizeilig: „Lange Pause gemacht?“ / „Weiter mit „…““)
 *  - während des Blocks: weicher Ring mit Restzeit, dezent „Pausieren“ und „Abbrechen“,
 *    und „Zum Einstieg: …“ zum Abhaken; ab und zu ganz unten, abgesetzt, ein leiser Tipp
 *  - in der kurzen Pause: blauer Ring, danach „Nächsten Block starten“
 *  - nach dem letzten geschätzten Block: KEINE kurze Pause, gleich „Erledigt oder noch ein Block?“
 *  - an einem früheren Tag angefangen, noch nicht fertig: „Weitermachen oder abschließen?“ – nach „Noch ein Block“
 *    führt oben links ein leises „← Zurück“ wieder zu dieser Frage (falls es ein Versehen war)
 *  - am nächsten Kalendertag, solange der alte Tag noch offen ist: ganz oben leise „Neuen Tag beginnen →“
 *  - über der Karte: für jede heute erledigte Hauptaufgabe eine kleine Karte mit ✓ (motiviert)
 *  - unter der Karte: schlanke Leiste mit den Aufgaben des Tages (nicht während eines Blocks)
 * Im Hintergrund liegt ein sehr zarter Farbschimmer: grünlich im Block, bläulich in der Pause.
 */

import { T } from '../../config/texts'
import { useNow } from '../../components/hooks'
import { formatDayName } from '../../logic/time'
import { pick } from '../../logic/variety'
import type { Task, TimerState } from '../../model/types'
import {
  activeDay,
  canStartNewDay,
  currentTask,
  isOnLongPause,
  tasksOfDay,
  taskWork,
} from '../../store/selectors'
import { endLongPause } from '../../store/actions'
import { useAppState } from '../../store/store'
import { FocusCard } from './FocusCard'
import { DayBar } from './DayBar'
import { CheckIcon, SunriseIcon } from '../../components/icons'
import { useSpaceKey } from './useSpaceKey'
import './today.css'

interface Props {
  onPlan: () => void
  onEndDay: () => void
  onStartNewDay: () => void
}

export function TodayScreen({ onPlan, onEndDay, onStartNewDay }: Props) {
  const state = useAppState()
  const t = state.timer
  const tasks = tasksOfDay(state, activeDay(state).id)
  // Während eines Blocks: dessen Aufgabe. Sonst: die oberste offene Aufgabe.
  const task = t.phase === 'block' ? state.tasks[t.taskId] : currentTask(state)
  // Nach einer erledigten Hauptaufgabe: erst die lange Pause, die nächste Aufgabe nur leise als „Danach: …“.
  const onLongPause = !!task && isOnLongPause(state, task)

  return (
    <div className="today">
      <Ambient timerState={t} longPause={onLongPause} />

      <NewDayLink onClick={onStartNewDay} />

      {/* Schon geschafft: erledigte Hauptaufgaben stehen als eigene Karten oben (nicht im Block). */}
      {t.phase !== 'block' && <DoneCards tasks={tasks.filter((x) => x.completedAt !== null)} />}

      {tasks.length === 0 ? (
        <section className="card focus-card is-message">
          <div className="message-mark" aria-hidden="true">
            <svg viewBox="0 0 76 76">
              <circle className="message-mark-dashed" cx="38" cy="38" r="33" />
              <path className="message-mark-plus" d="M38 29v18M29 38h18" />
            </svg>
          </div>
          <h1 className="message-title">{T.today.emptyTitle}</h1>
          <p className="message-text">{T.today.emptyText}</p>
          <button type="button" className="btn btn-primary" onClick={onPlan}>
            {T.today.goPlan}
          </button>
        </section>
      ) : task && onLongPause ? (
        <LongPauseCard task={task} onEnd={() => endLongPause(task.id)} />
      ) : task ? (
        <FocusCard task={task} />
      ) : (
        <section className="card focus-card is-message">
          <div className="message-mark" aria-hidden="true">
            <svg viewBox="0 0 76 76">
              <defs>
                <linearGradient id="all-done-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" className="timer-ring-stop-a" />
                  <stop offset="1" className="timer-ring-stop-b" />
                </linearGradient>
              </defs>
              <circle className="message-mark-ring" cx="38" cy="38" r="33" stroke="url(#all-done-gradient)" />
              <path className="message-mark-check" d="M27 39l7.5 7.5L50 31" />
            </svg>
          </div>
          <h1 className="message-title">{T.today.allDoneTitle}</h1>
          <p className="message-text">{pick(T.today.allDoneTexts, activeDay(state).createdAt)}</p>
        </section>
      )}

      {/* Während ein Block läuft, bleibt nur das Wichtigste sichtbar. */}
      {t.phase !== 'block' && tasks.length > 0 && <DayBar tasks={tasks} currentId={task?.id} />}

      {t.phase !== 'block' && (
        <div className="end-day">
          <button type="button" className="btn btn-quiet" onClick={onEndDay}>
            {T.today.endDay}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * „Neuen Tag beginnen →“: erscheint oben, wenn du die App an einem neuen Kalendertag öffnest
 * und der alte Tag noch offen ist. Es wird nichts gefragt – du arbeitest einfach weiter,
 * bis du den Link anklickst. Geprüft wird jede Minute und beim Zurückkehren ins Fenster.
 */
function NewDayLink({ onClick }: { onClick: () => void }) {
  const state = useAppState()
  const now = useNow(true, 60_000)
  if (!canStartNewDay(state, now)) return null
  const firstWorkAt = activeDay(state).firstWorkAt
  const dayName = firstWorkAt === null ? '' : formatDayName(firstWorkAt).split(',')[0]
  return (
    <div className="new-day">
      <button type="button" className="new-day-link" onClick={onClick} title={T.newDay.hint(dayName)}>
        <SunriseIcon />
        <span className="new-day-label">{T.newDay.link}</span>
        <span className="new-day-arrow" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  )
}

/**
 * Heute erledigte Hauptaufgaben: je eine ruhige Karte mit Haken, Titel und dem, was du daran
 * gearbeitet hast („Erledigt · 3 Blöcke · 1 Std. 15 Min.“). Die aktuelle Aufgabe steht darunter.
 */
function DoneCards({ tasks }: { tasks: Task[] }) {
  const state = useAppState()
  if (tasks.length === 0) return null
  return (
    <ul className="done-cards" aria-label={T.today.doneCardsLabel}>
      {tasks.map((task) => {
        const work = taskWork(state, task.id)
        const parts = [T.today.doneCard]
        if (work.blocks > 0) parts.push(T.endDay.yieldBlocks(work.blocks))
        if (work.minutes > 0) parts.push(T.endDay.yieldTime(work.minutes))
        return (
          <li key={task.id} className="card done-card">
            <span className="done-card-mark" aria-hidden="true">
              <CheckIcon />
            </span>
            <span className="done-card-text">
              <span className="done-card-title">{task.title}</span>
              <span className="done-card-meta">{parts.join(' · ')}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Lange Pause nach einer erledigten Hauptaufgabe: ruhige Karte statt der nächsten Aufgabe.
 * Erst „Pause beenden“ (oder Leertaste) zeigt die nächste Aufgabe – die steht vorher nur leise
 * als „Danach: …“ darunter, damit sie nicht überrascht.
 */
function LongPauseCard({ task, onEnd }: { task: Task; onEnd: () => void }) {
  useSpaceKey(onEnd)
  return (
    <section className="card focus-card is-message long-pause-card">
      <div className="message-mark" aria-hidden="true">
        <svg viewBox="0 0 76 76">
          <circle className="long-pause-ring" cx="38" cy="38" r="33" />
          <path className="long-pause-moon" d="M44 26a13 13 0 1 0 8 20a11 11 0 0 1-8-20z" />
        </svg>
      </div>
      <h1 className="message-title">{T.today.longPauseTitle}</h1>
      <p className="message-text">{T.today.longPauseText}</p>
      <button type="button" className="btn btn-primary btn-big" title={T.today.spaceHint} onClick={onEnd}>
        {T.today.longPauseEnd}
      </button>
      <p className="long-pause-next">
        <span className="long-pause-next-label">{T.today.longPauseNext}</span> {task.title}
      </p>
    </section>
  )
}

/** Sehr zarter Farbschimmer hinter allem – zeigt die Phase, wechselt langsam (siehe today.css). */
function Ambient({ timerState, longPause = false }: { timerState: TimerState; longPause?: boolean }) {
  let phase = longPause ? 'break' : 'idle'
  if (timerState.phase === 'block') phase = timerState.pausedAt === null ? 'block' : 'paused'
  if (timerState.phase === 'break') phase = 'break'
  return <div className="ambient" data-phase={phase} aria-hidden="true" />
}

/**
 * Inhalt des Mini-Fensters: dieselbe Karte wie in „Heute“, nur kompakt (siehe mini.css –
 * erste Schritte, Punkte und leise Sätze sind dort ausgeblendet). Ring, Rauschen-Knopf,
 * Start/Pausieren/Weiter und das Startsignal bleiben.
 */
export function MiniToday() {
  const state = useAppState()
  const t = state.timer
  const task = t.phase === 'block' ? state.tasks[t.taskId] : currentTask(state)
  return (
    <div className="today mini-today">
      <Ambient timerState={t} />
      {task ? <FocusCard task={task} /> : <p className="mini-message">{T.mini.nothing}</p>}
    </div>
  )
}
