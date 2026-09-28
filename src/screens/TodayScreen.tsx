/**
 * BILDSCHIRM „HEUTE“ (Durchführen)
 * ================================
 * Zeigt immer die oberste noch nicht erledigte Hauptaufgabe – groß und ruhig:
 *  - oben in der Karte: die Block-Punkte (mit „je 25 Min.“), darunter der Titel
 *  - vor dem Start: die ersten Schritte zum Ansehen (noch nicht abhakbar), „Block starten“
 *    (bzw. „Lange Pause gemacht – weiter mit …“ ab der zweiten Aufgabe)
 *  - während des Blocks: weicher Ring mit Restzeit, dezent „Pausieren“ und „Abbrechen“,
 *    und „Zum Einstieg: …“ zum Abhaken
 *  - in der kurzen Pause: blauer Ring, danach „Nächsten Block starten“
 *  - nach dem letzten geschätzten Block: „Erledigt oder noch ein Block?“
 *  - unter der Karte: schlanke Leiste mit den Aufgaben des Tages (nicht während eines Blocks)
 * Im Hintergrund liegt ein sehr zarter Farbschimmer: grünlich im Block, bläulich in der Pause.
 */

import { useEffect, useState } from 'react'
import { STEP_DONE_FEEDBACK_MS } from '../config/defaults'
import { T } from '../config/texts'
import { useNow } from '../components/hooks'
import { StepList } from '../components/StepList'
import { TimerRing } from '../components/TimerRing'
import { blockMarks, taskMark, type Mark } from '../logic/progress'
import * as timer from '../logic/timer'
import type { ID, Task, TimerState } from '../model/types'
import { requestNotificationPermission } from '../signals/notifications'
import {
  abortCurrentBlock,
  addExtraBlock,
  finishTask,
  pauseCurrentBlock,
  resumeCurrentBlock,
  startBlock,
  toggleStep,
} from '../store/actions'
import {
  activeDay,
  blockMinutesFor,
  blocksDone,
  currentStep,
  currentTask,
  isAskingDone,
  needsLongPause,
  stepsOfTask,
  tasksOfDay,
} from '../store/selectors'
import { useAppState } from '../store/store'
import './today.css'

interface Props {
  onPlan: () => void
  onEndDay: () => void
}

export function TodayScreen({ onPlan, onEndDay }: Props) {
  const state = useAppState()
  const t = state.timer
  const tasks = tasksOfDay(state, activeDay(state).id)
  // Während eines Blocks: dessen Aufgabe. Sonst: die oberste offene Aufgabe.
  const task = t.phase === 'block' ? state.tasks[t.taskId] : currentTask(state)

  return (
    <div className="today">
      <Ambient timerState={t} />

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
          <p className="message-text">{T.today.allDoneText}</p>
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

/** Sehr zarter Farbschimmer hinter allem – zeigt die Phase, wechselt langsam (siehe today.css). */
function Ambient({ timerState }: { timerState: TimerState }) {
  let phase = 'idle'
  if (timerState.phase === 'block') phase = timerState.pausedAt === null ? 'block' : 'paused'
  if (timerState.phase === 'break') phase = 'break'
  return <div className="ambient" data-phase={phase} aria-hidden="true" />
}

/** Die große Karte mit der aktuellen Hauptaufgabe. */
function FocusCard({ task }: { task: Task }) {
  const state = useAppState()
  const t = state.timer
  const now = useNow(t.phase !== 'idle')

  const tasks = tasksOfDay(state, activeDay(state).id)
  const number = tasks.findIndex((x) => x.id === task.id) + 1
  const done = blocksDone(state, task.id)
  const minutes = blockMinutesFor(state, task)
  const breakOver = t.phase === 'break' && (t.endSignaled || timer.isBreakOver(t, now))
  const asking = t.phase !== 'block' && isAskingDone(state, task)
  // Starten ist möglich, wenn nichts läuft oder die kurze Pause vorbei ist.
  const canStart = t.phase === 'idle' || breakOver

  // Der ganze Stand als Satz – für den Hinweis beim Drüberfahren und für Screenreader.
  let blockLine: string
  if (t.phase === 'block') blockLine = T.today.blockOf(done + 1, task.estimatedBlocks)
  else if (t.phase === 'break' || asking) blockLine = T.today.blockDoneOf(done, task.estimatedBlocks)
  else blockLine = `${T.today.blockOf(done + 1, task.estimatedBlocks)} · ${T.today.minutes(minutes)}`

  // „Jetzt dran“ ist ein Block, wenn er läuft oder gleich gestartet werden kann.
  const highlightBlock = t.phase === 'block' || (canStart && !asking)

  // Wechselt die Phase, wird der untere Teil der Karte neu (weich) eingeblendet.
  const paused = t.phase === 'block' && t.pausedAt !== null
  const phaseKey = `${t.phase}-${paused}-${breakOver}-${asking}`

  return (
    <section className="card focus-card">
      <BlockDots
        marks={blockMarks(done, task.estimatedBlocks, highlightBlock)}
        suffix={t.phase === 'idle' && !asking ? T.today.perBlock(minutes) : null}
        sentence={`${T.today.taskOf(number, tasks.length)} · ${blockLine}`}
      />
      <h1 className="focus-title">{task.title}</h1>

      <div className="focus-phase" key={phaseKey}>
        {/* Erst ansehen, abhaken erst im Block. */}
        {t.phase !== 'block' && <StepsPreview task={task} />}

        {t.phase === 'block' && <RunningBlock timerState={t} now={now} />}

        {t.phase === 'break' &&
          (breakOver ? (
            <TimerRing
              variant="break"
              remainingMs={0}
              totalMs={t.durationMs}
              center={<span className="timer-ring-label">{T.today.breakOver}</span>}
            />
          ) : (
            <>
              <TimerRing
                variant="break"
                remainingMs={timer.breakRemainingMs(t, now)}
                totalMs={t.durationMs}
                caption={T.today.breakTitle}
              />
              <p className="phase-note">{T.today.breakHint}</p>
            </>
          ))}

        {t.phase === 'block' && <CurrentStep task={task} />}

        {asking ? (
          <div className="ask-done">
            <p className="ask-done-question">{T.today.askDone}</p>
            <div className="ask-done-actions">
              <button type="button" className="btn btn-primary btn-big" onClick={() => finishTask(task.id)}>
                {T.today.done}
              </button>
              <button
                type="button"
                className="btn btn-big"
                onClick={() => {
                  if (canStart) void requestNotificationPermission()
                  addExtraBlock(task.id, canStart)
                }}
              >
                {canStart ? T.today.oneMoreStart : T.today.oneMore}
              </button>
            </div>
          </div>
        ) : (
          canStart && <StartButton task={task} />
        )}
      </div>
    </section>
  )
}

interface BlockDotsProps {
  marks: Mark[]
  /** Kleiner Zusatz hinter den Punkten, z. B. „je 25 Min.“ – oder `null`. */
  suffix: string | null
  sentence: string
}

/**
 * Oben in der Karte: die Blöcke der Aufgabe als Punkte.
 * Voller Punkt = geschafft, breiter Punkt = jetzt dran, nur Umriss = kommt noch.
 * Abgebrochene Blöcke sehen aus wie geschaffte (sie zählen mit, nichts soll nach Fehler aussehen).
 * Der ganze Satz („Aufgabe 1 von 2 · Block 1 von 3 …“) steht im Tooltip und für Screenreader.
 */
function BlockDots({ marks, suffix, sentence }: BlockDotsProps) {
  return (
    <div className="block-dots" title={sentence}>
      <span className="visually-hidden">{sentence}</span>
      <span className="block-dots-marks" aria-hidden="true">
        {marks.map((mark, index) => (
          <span key={index} className={`block-mark is-${mark}`} />
        ))}
      </span>
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </div>
  )
}

/** Schlanke Leiste unter der Karte: alle Aufgaben des Tages. ✓ = erledigt, Punkt = jetzt dran. */
function DayBar({ tasks, currentId }: { tasks: Task[]; currentId: ID | undefined }) {
  return (
    <nav className="day-bar" aria-label={T.today.dayList}>
      <ol className="surface">
        {tasks.map((item) => {
          const mark = taskMark(item.completedAt !== null, item.id === currentId)
          return (
            <li
              key={item.id}
              className={`is-${mark}`}
              title={item.title}
              aria-current={mark === 'current' ? 'step' : undefined}
            >
              <span className="day-mark" aria-hidden="true">
                {mark === 'done' && <CheckIcon />}
              </span>
              <span className="day-title">{item.title}</span>
              {mark === 'done' && <span className="visually-hidden"> ({T.today.stepDone})</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="M4.2 8.4l2.4 2.4 5.2-5.4" />
    </svg>
  )
}

/** Der große Startknopf – vor der ersten Aufgabe des Tages ohne, danach mit „Lange Pause gemacht“. */
function StartButton({ task }: { task: Task }) {
  const state = useAppState()
  let label = state.timer.phase === 'break' ? T.today.nextBlock : T.today.startBlock
  if (needsLongPause(state, task)) label = T.today.longPauseDone(task.title)

  return (
    <button
      type="button"
      className="btn btn-primary btn-big"
      onClick={() => {
        // Beim ersten Mal fragt Chrome, ob Benachrichtigungen erlaubt sind.
        void requestNotificationPermission()
        startBlock(task.id)
      }}
    >
      {label}
    </button>
  )
}

/** Der laufende (oder pausierte) Block: Ring mit Restzeit, Pausieren, Abbrechen. */
function RunningBlock({ timerState, now }: { timerState: timer.BlockTimer; now: number }) {
  const [confirmAbort, setConfirmAbort] = useState(false)
  const paused = timerState.pausedAt !== null

  return (
    <>
      <TimerRing
        remainingMs={timer.blockRemainingMs(timerState, now)}
        totalMs={timerState.plannedMs}
        caption={paused ? T.nav.timerPaused : T.today.remaining}
        paused={paused}
      />

      {paused && (
        <>
          <p className="phase-note">{T.today.paused}</p>
          <button type="button" className="btn btn-primary btn-big" onClick={resumeCurrentBlock}>
            {T.today.resume}
          </button>
        </>
      )}

      <div className="quiet-actions">
        {confirmAbort ? (
          <span className="confirm-inline">
            {T.today.abortConfirm}
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                setConfirmAbort(false)
                abortCurrentBlock()
              }}
            >
              {T.today.abortYes}
            </button>
            <button type="button" className="btn btn-small btn-quiet" onClick={() => setConfirmAbort(false)}>
              {T.today.abortNo}
            </button>
          </span>
        ) : (
          <>
            {!paused && (
              <button type="button" className="btn btn-quiet btn-small" onClick={pauseCurrentBlock}>
                {T.today.pause}
              </button>
            )}
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setConfirmAbort(true)}>
              {T.today.abort}
            </button>
          </>
        )}
      </div>
    </>
  )
}

/**
 * Vor dem Start und in der Pause: die ersten Schritte nur zum Ansehen – ohne Kästchen.
 * Deutlich als „Erste Schritte zum Einstieg“ gekennzeichnet (kein Thema des Blocks).
 * Abhaken geht erst, wenn der Block läuft (siehe CurrentStep). Sind alle erledigt, steht hier nichts.
 */
function StepsPreview({ task }: { task: Task }) {
  const state = useAppState()
  const steps = stepsOfTask(state, task.id)
  if (!steps.some((s) => s.doneAt === null)) return null
  return (
    <div className="steps-preview">
      <p className="steps-preview-label">{T.today.firstStepsPreview}</p>
      <ol className="steps-preview-list">
        {steps.map((step) => (
          <li key={step.id} className={step.doneAt !== null ? 'is-done' : undefined}>
            {step.text}
            {step.doneAt !== null && <span className="visually-hidden"> ({T.today.stepDone})</span>}
          </li>
        ))}
      </ol>
      <p className="steps-preview-hint">{T.today.firstStepsPreviewHint}</p>
    </div>
  )
}

/**
 * Im laufenden Block: „Zum Einstieg: …“ – immer der nächste offene Schritt zum direkten
 * Abhaken, dazu alle Schritte zum Aufklappen. Sie beenden keinen Block.
 *  - Beim Abhaken bleibt der Haken kurz stehen (kleines Erfolgserlebnis), dann gleitet die
 *    Zeile weg und der nächste Schritt gleitet herein (Zeiten passend zu STEP_DONE_FEEDBACK_MS).
 *  - Sind alle abgehakt, steht dort nur noch ein Satz („Einstieg geschafft! …“)
 *    – bewusst ohne Kästchen und Haken, damit er nicht wie ein weiterer Schritt aussieht.
 */
function CurrentStep({ task }: { task: Task }) {
  const state = useAppState()
  const [showAll, setShowAll] = useState(false)
  // Der gerade abgehakte Schritt, solange er noch mit Haken zu sehen ist.
  const [justDoneId, setJustDoneId] = useState<ID | null>(null)

  useEffect(() => {
    if (justDoneId === null) return
    const timeout = setTimeout(() => setJustDoneId(null), STEP_DONE_FEEDBACK_MS)
    return () => clearTimeout(timeout)
  }, [justDoneId])

  const steps = stepsOfTask(state, task.id)
  const next = currentStep(state, task.id)
  if (steps.length === 0) return null
  const doneCount = steps.filter((s) => s.doneAt !== null).length
  const justDone = steps.find((s) => s.id === justDoneId)
  const shown = justDone ?? next

  return (
    <div className="current-step">
      {shown && !showAll && (
        <label key={shown.id} className={`current-step-row${justDone ? ' is-done' : ''}`}>
          <input
            type="checkbox"
            className="checkbox is-round"
            checked={justDone !== undefined}
            onChange={() => {
              if (justDone) return // schon abgehakt, gleitet gleich weg
              toggleStep(shown.id)
              setJustDoneId(shown.id)
            }}
          />
          <span className="current-step-text">
            <span className="current-step-label">{T.today.firstStep}: </span>
            {shown.text}
          </span>
        </label>
      )}
      {!shown && !showAll && (
        <p className="start-done">
          <span className="start-done-title">{T.today.startDone}</span> {T.today.keepGoing}
        </p>
      )}
      {showAll && <StepList taskId={task.id} editable={false} highlightId={next?.id} />}
      <button type="button" className="btn btn-quiet btn-small" onClick={() => setShowAll(!showAll)}>
        {showAll ? T.today.hideSteps : T.today.allSteps(doneCount, steps.length)}
      </button>
    </div>
  )
}
