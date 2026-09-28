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
 *  - nach dem letzten geschätzten Block: „Erledigt oder noch ein Block?“ – nach „Noch ein Block“
 *    führt oben links ein leises „← Zurück“ wieder zu dieser Frage (falls es ein Versehen war)
 *  - unter der Karte: schlanke Leiste mit den Aufgaben des Tages (nicht während eines Blocks)
 * Im Hintergrund liegt ein sehr zarter Farbschimmer: grünlich im Block, bläulich in der Pause.
 */

import { useContext, useEffect, useRef, useState } from 'react'
import { GENTLE_LINE_EVERY, STEP_DONE_FEEDBACK_MS } from '../config/defaults'
import { T } from '../config/texts'
import { isTypingOrButton, useNow, WindowContext } from '../components/hooks'
import { StepList } from '../components/StepList'
import { TimerRing } from '../components/TimerRing'
import { blockMarks, taskMark, type Mark } from '../logic/progress'
import * as timer from '../logic/timer'
import { cleanStartCue, pick, showsGentleLine } from '../logic/variety'
import type { ID, Task, TimerState } from '../model/types'
import { requestNotificationPermission } from '../signals/notifications'
import {
  abortCurrentBlock,
  addExtraBlock,
  finishBlockEarly,
  finishTask,
  isInWarningTime,
  pauseCurrentBlock,
  resumeCurrentBlock,
  updateSettings,
  startBlock,
  toggleStep,
  undoExtraBlock,
} from '../store/actions'
import {
  activeDay,
  blockMinutesFor,
  blocksDone,
  canUndoExtraBlock,
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

  // Leertaste: Start / Pausieren / Weiter – je nachdem, was gerade dran ist.
  useSpaceKey(() => {
    if (t.phase === 'block') {
      if (t.pausedAt === null) pauseCurrentBlock()
      else resumeCurrentBlock()
    } else if (canStart && !asking) {
      void requestNotificationPermission()
      startBlock(task.id)
    }
  })

  return (
    <section className="card focus-card">
      {canUndoExtraBlock(state, task, now) && <BackToAsk />}
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
              <p className="phase-note">{pick(T.today.breakHints, t.startedAt)}</p>
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
          canStart && <StartArea task={task} firstBlock={t.phase === 'idle' && done === 0} />
        )}
      </div>
    </section>
  )
}

/**
 * Leises „← Zurück“ oben links in der Karte, nur kurz nach „Noch ein Block“:
 * Die Schätzung wird wie vorher, die Frage „Erledigt oder noch ein Block?“ ist wieder da.
 * Ein gerade erst gestarteter Zusatz-Block wird dabei verworfen.
 */
function BackToAsk() {
  return (
    <button
      type="button"
      className="btn btn-quiet btn-small back-to-ask"
      title={T.today.backToAskHint}
      aria-label={T.today.backToAskHint}
      onClick={() => undoExtraBlock()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3.5L5.5 8l4.5 4.5" />
      </svg>
      {T.today.backToAsk}
    </button>
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

/**
 * Leertaste als Abkürzung für den Hauptknopf. Nicht, während du in ein Feld tippst,
 * und nicht, wenn gerade ein Knopf den Fokus hat (dann drückt die Leertaste ohnehin ihn).
 */
function useSpaceKey(action: () => void) {
  const latest = useRef(action)
  // Im Mini-Fenster gilt die Leertaste dort (eigenes Dokument), sonst im App-Fenster.
  const { document } = useContext(WindowContext)
  useEffect(() => {
    latest.current = action
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingOrButton(e.target) || document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      latest.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [document])
}

/**
 * Rund um den Startknopf. Vor dem ersten Block einer Aufgabe:
 *  - darüber das Startsignal aus „Planen“ („Wenn der Kaffee auf dem Tisch steht → los.“), falls eingetragen,
 *  - darunter klein ein Startsatz („Du musst nur anfangen.“).
 * Danach nur noch der Knopf.
 */
function StartArea({ task, firstBlock }: { task: Task; firstBlock: boolean }) {
  const cue = task.startCue ? cleanStartCue(task.startCue) : ''
  return (
    <div className="start-area">
      {firstBlock && cue && <p className="start-cue">{T.today.startCue(cue)}</p>}
      <StartButton task={task} />
      {firstBlock && <p className="start-nudge">{pick(T.today.startNudges, task.createdAt)}</p>}
    </div>
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
      title={T.today.spaceHint}
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
        warm={isInWarningTime(timerState, now)}
      />

      <NoiseToggle />

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
            <button
              type="button"
              className="btn btn-quiet btn-small"
              title={T.today.finishEarlyHint}
              onClick={() => finishBlockEarly()}
            >
              {T.today.finishEarly}
            </button>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setConfirmAbort(true)}>
              {T.today.abort}
            </button>
          </>
        )}
      </div>

      {/* Ab und zu (nicht in jedem Block) ganz leise: Abschweifen ist okay. */}
      {!paused && showsGentleLine(timerState.startedAt, GENTLE_LINE_EVERY) && (
        <p className="gentle-line">{pick(T.today.gentleLines, timerState.startedAt)}</p>
      )}
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
          <span className="start-done-title">{T.today.startDone}</span>{' '}
          {pick(T.today.keepGoingVariants, state.timer.phase === 'block' ? state.timer.startedAt : 0)}
        </p>
      )}
      {showAll && <StepList taskId={task.id} editable={false} highlightId={next?.id} />}
      <button type="button" className="btn btn-quiet btn-small" onClick={() => setShowAll(!showAll)}>
        {showAll ? T.today.hideSteps : T.today.allSteps(doneCount, steps.length)}
      </button>
    </div>
  )
}

/**
 * Rauschen an/aus – ein einziger Knopf, gut sichtbar unter dem Ring (auch im Mini-Fenster).
 * Zeigt immer deutlich den Zustand („Rauschen an“ / „Rauschen aus“). Sind in den
 * Einstellungen alle Töne aus, erscheint er nicht.
 */
export function NoiseToggle() {
  const { settings } = useAppState()
  if (!settings.sounds) return null
  const on = settings.noiseOn
  return (
    <button
      type="button"
      className="noise-toggle"
      aria-pressed={on}
      aria-label={on ? T.today.noiseTurnOff : T.today.noiseTurnOn}
      title={on ? T.today.noiseTurnOff : T.today.noiseTurnOn}
      onClick={() => updateSettings({ noiseOn: !on })}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 8h3l4-3.5v11L6 12H3z" />
        {on ? (
          <>
            <path d="M13 7.5a3.5 3.5 0 0 1 0 5" />
            <path d="M15.3 5.3a6.6 6.6 0 0 1 0 9.4" />
          </>
        ) : (
          <path d="M13.5 8l4 4m0-4l-4 4" />
        )}
      </svg>
      <span>
        {T.today.noise} <span className="noise-toggle-state">{on ? T.today.noiseOn : T.today.noiseOff}</span>
      </span>
    </button>
  )
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
