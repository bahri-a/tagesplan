/**
 * BILDSCHIRM „HEUTE“ (Durchführen)
 * ================================
 * Zeigt immer die oberste noch nicht erledigte Hauptaufgabe – groß und ruhig:
 *  - oben in der Karte: die Block-Punkte (mit „je 25 Min.“), darunter der Titel
 *  - vor dem Start: die ersten Schritte zum Ansehen (noch nicht abhakbar), „Block starten“
 *    (ab der zweiten Aufgabe zweizeilig: „Lange Pause gemacht?“ / „Weiter mit „…““)
 *  - während des Blocks: weicher Ring mit Restzeit, dezent „Pausieren“ und „Abbrechen“,
 *    und „Zum Einstieg: …“ zum Abhaken; ganz unten, abgesetzt, leise „Schon ohne App erledigt?“
 *  - in der kurzen Pause: blauer Ring, danach „Nächsten Block starten“
 *  - nach dem letzten geschätzten Block: KEINE kurze Pause, gleich „Erledigt oder noch ein Block?“
 *  - an einem früheren Tag angefangen, noch nicht fertig: „Weitermachen oder abschließen?“ – nach „Noch ein Block“
 *    führt oben links ein leises „← Zurück“ wieder zu dieser Frage (falls es ein Versehen war)
 *  - am nächsten Kalendertag, solange der alte Tag noch offen ist: ganz oben leise „Neuen Tag beginnen →“
 *    (dann ohne das untere „Tag beenden“ – es gibt immer nur einen Weg zum neuen Tag)
 *  - noch nichts für heute: direkt in der Karte eintippen (Enter → „Starten“ steht da), darunter
 *    bis zu drei aus „Zuletzt verwendet“ – ohne „Tag beenden“, es gibt ja noch nichts zu beenden
 *  - alles erledigt: Feierabend-Moment mit den Tageszahlen, „Morgen planen“ und leise „Tag beenden“
 *  - über der Karte: für jede heute erledigte Hauptaufgabe eine kleine Karte mit ✓ (motiviert)
 *  - unter der Karte: schlanke Leiste mit den Aufgaben des Tages (nicht während eines Blocks;
 *    am Mac auch nicht bei „Alles erledigt“ – dort stehen die Aufgaben schon als Karten oben)
 * Im Hintergrund liegt ein sehr zarter Farbschimmer: grünlich im Block, bläulich in der Pause.
 */

import { useEffect, useState } from 'react'
import { EMPTY_TODAY_RECENT_COUNT } from '../../config/defaults'
import { T } from '../../config/texts'
import { useNow } from '../../components/hooks'
import { formatDayName } from '../../logic/time'
import { cleanStartCue, pick } from '../../logic/variety'
import { IS_MOBILE, SHOWS_START_CUE } from '../../platform/device'
import { haptic, requestFocusFullscreen } from '../../platform/focusMode'
import { primeNotifications } from '../../signals/notifications'
import type { Task, TimerState } from '../../model/types'
import {
  activeDay,
  blocksDone,
  canStartNewDay,
  currentTask,
  dayYield,
  isAskingDone,
  isOnLongPause,
  lifetimeWork,
  recentTasks,
  tasksOfDay,
  taskWork,
  undoableFinish,
} from '../../store/selectors'
import { addTask, copyTask, startAfterLongPause, undoFinishTask } from '../../store/actions'
import { shallowEqual, useAppSelector } from '../../store/store'
import { FocusCard } from './FocusCard'
import { DayBar } from './DayBar'
import { CheckIcon, SunriseIcon } from '../../components/icons'
import { forgetFinished, useCountUp, wasJustFinished } from './celebrate'
import { useSpaceKey } from './useSpaceKey'

interface Props {
  /** Zum Planer – mit `tomorrow` gleich auf „Morgen“ (am Handy). */
  onPlan: (tomorrow?: boolean) => void
  onEndDay: () => void
  onStartNewDay: () => void
}

export function TodayScreen({ onPlan, onEndDay, onStartNewDay }: Props) {
  const t = useAppSelector((s) => s.timer)
  const tasks = useAppSelector((s) => tasksOfDay(s, activeDay(s).id), shallowEqual)
  // Während eines Blocks: dessen Aufgabe. Sonst: die oberste offene Aufgabe.
  const task = useAppSelector((s) => (s.timer.phase === 'block' ? s.tasks[s.timer.taskId] : currentTask(s)))
  // Nach einer erledigten Hauptaufgabe: erst die lange Pause – ihr Knopf startet gleich die nächste Aufgabe.
  const onLongPause = useAppSelector((s) => !!task && isOnLongPause(s, task))
  // Am nächsten Kalendertag steht oben „Neuen Tag beginnen“ – dann gibt es unten kein zweites „Tag beenden“.
  const now = useNow(true, 60_000)
  const newDayOpen = useAppSelector((s) => canStartNewDay(s, now))
  // Alles erledigt: „Tag beenden“ steht dann in der Karte selbst.
  const allDone = tasks.length > 0 && !task
  // Leerer Tag (nichts geplant, nichts gearbeitet): Es gibt noch nichts zu beenden.
  const emptyDay = useAppSelector((s) => activeDay(s).firstWorkAt === null) && tasks.length === 0
  // Wer „Heute“ verlässt, hat den Haken schon gesehen – beim Zurückkommen zeichnet er sich nicht noch einmal.
  useEffect(() => forgetFinished, [])

  return (
    <div className="today">
      <Ambient timerState={t} longPause={onLongPause} />

      <NewDayLink onClick={onStartNewDay} />

      {/* Schon geschafft: erledigte Hauptaufgaben stehen als eigene Karten oben (nicht im Block). */}
      {t.phase !== 'block' && <DoneCards tasks={tasks.filter((x) => x.completedAt !== null)} />}

      {tasks.length === 0 ? (
        <EmptyToday onPlan={() => onPlan()} />
      ) : task && onLongPause ? (
        <LongPauseCard task={task} />
      ) : task ? (
        <FocusCard task={task} />
      ) : (
        <AllDoneCard tasks={tasks} onPlanTomorrow={() => onPlan(true)} onEndDay={newDayOpen ? null : onEndDay} />
      )}

      {/* Während ein Block läuft, bleibt nur das Wichtigste sichtbar. Am Mac stehen erledigte
          Aufgaben schon als Karten oben – bei „Alles erledigt“ also keine zweite Liste darunter. */}
      {t.phase !== 'block' && tasks.length > 0 && !(allDone && !IS_MOBILE) && (
        <DayBar tasks={tasks} currentId={task?.id} />
      )}

      {t.phase !== 'block' && !newDayOpen && !allDone && !emptyDay && (
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
 * Noch nichts für heute: gleich hier loslegen. Enter (oder das Plus) legt die Hauptaufgabe für
 * heute an – dann steht sofort „Starten“ da. Darunter bis zu drei aus „Zuletzt verwendet“: ein
 * Tippen legt sie (mit ihren ersten Schritten) für heute an. Ausführlich planen geht im Planer.
 */
function EmptyToday({ onPlan }: { onPlan: () => void }) {
  const [title, setTitle] = useState('')
  const today = useAppSelector((s) => activeDay(s).id)
  const recent = useAppSelector((s) => recentTasks(s, today, EMPTY_TODAY_RECENT_COUNT), shallowEqual)

  return (
    <section className="card focus-card is-message empty-today">
      <div className="message-mark" aria-hidden="true">
        <svg viewBox="0 0 76 76">
          <circle className="message-mark-dashed" cx="38" cy="38" r="33" />
          <path className="message-mark-plus" d="M38 29v18M29 38h18" />
        </svg>
      </div>
      <h1 className="message-title">{T.today.emptyTitle}</h1>
      <p className="message-text">{T.today.emptyText}</p>
      <form
        className="new-task empty-today-new"
        onSubmit={(e) => {
          e.preventDefault()
          if (title.trim()) addTask(today, title)
        }}
      >
        <input
          className="input"
          value={title}
          placeholder={T.plan.newTask}
          aria-label={`${T.plan.newTask} (${T.plan.today})`}
          enterKeyHint="go"
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn new-task-add" disabled={!title.trim()} aria-label={T.plan.add} title={T.plan.add}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3.25v9.5M3.25 8h9.5" />
          </svg>
        </button>
      </form>
      {recent.length > 0 && (
        <div className="empty-today-recent">
          <p className="empty-today-recent-title">{T.plan.recentTitle}</p>
          <ul className="recent-list">
            {recent.map((item) => (
              <li key={item.id} className="recent-item">
                <button
                  type="button"
                  className="recent-chip"
                  aria-label={T.plan.recentAdd(item.title, T.plan.today)}
                  title={T.plan.recentAdd(item.title, T.plan.today)}
                  onClick={() => copyTask(item.id, today, { learn: true })}
                >
                  <span className="recent-plus" aria-hidden="true">
                    +
                  </span>
                  <span className="recent-chip-title">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="btn btn-quiet btn-small empty-today-plan" onClick={onPlan}>
        {T.today.goPlan}
      </button>
    </section>
  )
}

/**
 * Alles erledigt: ein kleiner Feierabend-Moment. Oben die Tageszahlen („9 Blöcke · 3 Std. 45 Min.“),
 * leise die Gesamtzahl seit Beginn („Bisher insgesamt: 214 Blöcke“), darunter ein Satz und die zwei Wege weiter: „Morgen planen“ und leise „Tag beenden“
 * (`onEndDay` = null, wenn oben schon „Neuen Tag beginnen“ steht). Direkt nach dem letzten
 * „Erledigt“ zeichnet sich der Haken, und die Zahlen zählen kurz hoch.
 */
function AllDoneCard({
  tasks,
  onPlanTomorrow,
  onEndDay,
}: {
  tasks: Task[]
  onPlanTomorrow: () => void
  onEndDay: (() => void) | null
}) {
  const day = useAppSelector(activeDay)
  // Kein Block läuft – die Zahlen ändern sich nicht mehr, ein fester Zeitpunkt genügt.
  const [now] = useState(Date.now)
  const [fresh] = useState(() => tasks.some((x) => wasJustFinished(x.id)))
  const result = useAppSelector((s) => {
    const { completedBlocks, minutes } = dayYield(s, day.id, now)
    return { completedBlocks, minutes }
  }, shallowEqual)
  const blocks = useCountUp(result.completedBlocks, fresh)
  const minutes = useCountUp(result.minutes, fresh)
  const hasNumbers = result.completedBlocks > 0 || result.minutes > 0
  // Sammeln statt Serie: die Gesamtzahl seit Beginn, leise darunter.
  const lifetime = useAppSelector((s) => lifetimeWork(s).blocks)

  return (
    <section className={`card focus-card is-message all-done${fresh ? ' is-fresh' : ''}`}>
      <UndoFinish />
      <div className="message-mark" aria-hidden="true">
        <svg viewBox="0 0 76 76">
          <defs>
            <linearGradient id="all-done-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="timer-ring-stop-a" />
              <stop offset="1" className="timer-ring-stop-b" />
            </linearGradient>
          </defs>
          <circle className="message-mark-ring" cx="38" cy="38" r="33" stroke="url(#all-done-gradient)" />
          <path className="message-mark-check" d="M27 39l7.5 7.5L50 31" pathLength={1} />
        </svg>
      </div>
      <h1 className="message-title">{T.today.allDoneTitle}</h1>
      {hasNumbers && (
        <p className="all-done-numbers">
          <span className="visually-hidden">{T.endDay.yieldTitle}: </span>
          {T.endDay.yieldBlocks(blocks)} · {T.endDay.yieldTime(minutes)}
        </p>
      )}
      {lifetime > 0 && <p className="lifetime-line">{T.endDay.lifetime(lifetime)}</p>}
      <p className="message-text">{pick(T.today.allDoneTexts, day.createdAt)}</p>
      <div className="all-done-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={onPlanTomorrow}>
          {T.today.planTomorrow}
        </button>
        {onEndDay && (
          <button type="button" className="btn btn-quiet" onClick={onEndDay}>
            {T.today.endDay}
          </button>
        )}
      </div>
    </section>
  )
}

/**
 * „Neuen Tag beginnen →“: erscheint oben, wenn du die App an einem neuen Kalendertag öffnest
 * und der alte Tag noch offen ist. Es wird nichts gefragt – du arbeitest einfach weiter,
 * bis du den Link anklickst. Geprüft wird jede Minute und beim Zurückkehren ins Fenster.
 */
function NewDayLink({ onClick }: { onClick: () => void }) {
  const now = useNow(true, 60_000)
  const open = useAppSelector((s) => canStartNewDay(s, now))
  const firstWorkAt = useAppSelector((s) => activeDay(s).firstWorkAt)
  if (!open) return null
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
  const works = useAppSelector((s) => tasks.map((task) => taskWork(s, task.id)), (a, b) =>
    a.length === b.length && a.every((work, i) => shallowEqual(work, b[i])),
  )
  if (tasks.length === 0) return null
  return (
    <ul className="done-cards" aria-label={T.today.doneCardsLabel}>
      {tasks.map((task, index) => {
        const work = works[index]
        const parts = [T.today.doneCard]
        if (work.blocks > 0) parts.push(T.endDay.yieldBlocks(work.blocks))
        if (work.minutes > 0) parts.push(T.endDay.yieldTime(work.minutes))
        return (
          <li key={task.id} className={`card done-card${wasJustFinished(task.id) ? ' is-fresh' : ''}`}>
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
 * Darunter steht schon, was als Nächstes kommt – und ein einziger Knopf beendet die Pause und
 * startet gleich den ersten Block (oder Leertaste). Kein zweiter Klick auf „Starten“ nötig.
 * Steht bei der nächsten Aufgabe noch „Erledigt oder noch ein Block?“ an, heißt der Knopf „Weiter“.
 */
function LongPauseCard({ task }: { task: Task }) {
  const asking = useAppSelector((s) => isAskingDone(s, task))
  const firstBlock = useAppSelector((s) => blocksDone(s, task.id) === 0)
  // Startsignal nur auf dem Mac (auf dem Handy gibt es kein Feld dafür).
  const cue = SHOWS_START_CUE && task.startCue && firstBlock ? cleanStartCue(task.startCue) : ''
  const start = () => {
    if (!asking) {
      // Erst die Erklärung zu Mitteilungen – dann kein Vollbild, es läge sonst darüber.
      if (!primeNotifications()) requestFocusFullscreen()
      haptic('tap')
    }
    startAfterLongPause(task.id)
  }
  useSpaceKey(start)
  return (
    <section className="card focus-card is-message long-pause-card">
      <UndoFinish />
      <div className="message-mark" aria-hidden="true">
        <svg viewBox="0 0 76 76">
          <circle className="long-pause-ring" cx="38" cy="38" r="33" />
          <path className="long-pause-moon" d="M44 26a13 13 0 1 0 8 20a11 11 0 0 1-8-20z" />
        </svg>
      </div>
      <h1 className="message-title">{T.today.longPauseTitle}</h1>
      <p className="message-text">{T.today.longPauseText}</p>
      <p className="up-next">
        <span className="up-next-label">{T.today.upNext}</span>
        <span>
          <strong>„{task.title}“</strong> · {T.plan.blocksMeta(task.estimatedBlocks)}
        </span>
      </p>
      {cue && <p className="start-cue">{T.today.startCue(cue)}</p>}
      <button type="button" className="btn btn-primary btn-big" title={T.today.spaceHint} onClick={start}>
        {asking ? T.today.longPauseEnd : T.today.nextTask}
      </button>
    </section>
  )
}

/**
 * Leises „← Doch nicht erledigt“ oben links in der Karte, nur kurz nach „Erledigt“ (verklickt):
 * Die Aufgabe ist wieder offen und steht wieder mit ihrer Frage da. Verschwindet von selbst.
 */
function UndoFinish() {
  const [now, setNow] = useState(Date.now)
  const undo = useAppSelector((s) => undoableFinish(s, now), (a, b) => a?.task === b?.task && a?.until === b?.until)
  const until = undo?.until
  // Nach Ablauf einmal neu zeichnen – dann ist der Link weg.
  useEffect(() => {
    if (until === undefined) return
    const id = setTimeout(() => setNow(Date.now()), Math.max(0, until - Date.now()) + 50)
    return () => clearTimeout(id)
  }, [until])
  if (!undo) return null
  return (
    <button
      type="button"
      className="btn btn-quiet btn-small back-to-ask"
      title={T.today.undoFinishHint}
      aria-label={T.today.undoFinishHint}
      onClick={() => {
        forgetFinished()
        undoFinishTask(undo.task.id)
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3.5L5.5 8l4.5 4.5" />
      </svg>
      {T.today.undoFinish}
    </button>
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
  const t = useAppSelector((s) => s.timer)
  const task = useAppSelector((s) => (s.timer.phase === 'block' ? s.tasks[s.timer.taskId] : currentTask(s)))
  return (
    <div className="today mini-today">
      <Ambient timerState={t} />
      {task ? <FocusCard task={task} /> : <p className="mini-message">{T.mini.nothing}</p>}
    </div>
  )
}
