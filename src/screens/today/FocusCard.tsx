/**
 * DIE GROSSE KARTE IN „HEUTE“
 * Die aktuelle Hauptaufgabe mit Block-Punkten, Titel und – je nach Phase – Startknopf,
 * laufendem Block (Ring, Rauschen, Pausieren/Früher fertig/Abbrechen), kurzer Pause oder
 * der Frage „Erledigt oder noch ein Block?“. Auch im Mini-Fenster.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { STEP_DONE_FEEDBACK_MS } from '../../config/defaults'
import { T } from '../../config/texts'
import { useNow } from '../../components/hooks'
import { Dialog } from '../../components/Dialog'
import { StepList } from '../../components/StepList'
import { TimerRing } from '../../components/TimerRing'
import { blockMarks, type Mark } from '../../logic/progress'
import * as timer from '../../logic/timer'
import { cleanStartCue, pick } from '../../logic/variety'
import { SHOWS_START_CUE } from '../../platform/device'
import type { ID, Task } from '../../model/types'
import { requestNotificationPermission } from '../../signals/notifications'
import { requestFocusFullscreen } from '../../platform/focusMode'
import {
  abortCurrentBlock,
  addExtraBlock,
  canExtendBlock,
  confirmBreak,
  extendBlock,
  finishBlockEarly,
  skipBlockAsDone,
  logBlockAsDone,
  finishTask,
  isInWarningTime,
  pauseCurrentBlock,
  resumeCurrentBlock,
  skipBreak,
  updateSettings,
  startBlock,
  toggleStep,
  undoExtraBlock,
} from '../../store/actions'
import {
  activeDay,
  blockMinutesFor,
  blocksDone,
  currentStep,
  needsLongPause,
  stepsOfTask,
  tasksOfDay,
} from '../../store/selectors'
import { focusNeedsClock, focusView } from '../../store/focusView'
import { useAppState } from '../../store/store'
import { useSpaceKey } from './useSpaceKey'

/** Die große Karte mit der aktuellen Hauptaufgabe. */
export function FocusCard({ task }: { task: Task }) {
  const state = useAppState()
  const t = state.timer
  const now = useNow(focusNeedsClock(state, task))
  const view = focusView(state, task, now)

  const tasks = tasksOfDay(state, activeDay(state).id)
  const number = tasks.findIndex((x) => x.id === task.id) + 1
  const done = blocksDone(state, task.id)
  const minutes = blockMinutesFor(state, task)

  // Der ganze Stand als Satz – für den Hinweis beim Drüberfahren und für Screenreader.
  let blockLine: string
  if (t.phase === 'block') blockLine = T.today.blockOf(done + 1, task.estimatedBlocks)
  else if (t.phase === 'break' || view.action === 'askDone') blockLine = T.today.blockDoneOf(done, task.estimatedBlocks)
  else blockLine = `${T.today.blockOf(done + 1, task.estimatedBlocks)} · ${T.today.minutes(minutes)}`

  // Leertaste: Start / Pausieren / Weiter – je nachdem, was gerade dran ist.
  useSpaceKey(() => {
    if (view.ring === 'running') pauseCurrentBlock()
    else if (view.ring === 'paused') {
      requestFocusFullscreen()
      resumeCurrentBlock()
    } else if (view.action === 'start' || view.action === 'askResume') {
      void requestNotificationPermission()
      requestFocusFullscreen()
      startBlock(task.id)
    }
  })

  return (
    <section className="card focus-card">
      {view.canUndoExtra && <BackToAsk />}
      {view.canSkipBreak && <SkipBreak />}
      <BlockDots
        marks={blockMarks(done, task.estimatedBlocks, view.highlightBlock)}
        suffix={t.phase === 'idle' && view.action !== 'askDone' ? T.today.perBlock(minutes) : null}
        sentence={`${T.today.taskOf(number, tasks.length)} · ${blockLine}`}
      />
      <h1 className="focus-title">{task.title}</h1>

      <div className="focus-phase" key={view.key}>
        {/* Erst ansehen, abhaken erst im Block. */}
        {t.phase !== 'block' && <StepsPreview task={task} />}

        {t.phase === 'block' && <RunningBlock timerState={t} now={now} />}

        {view.ring === 'breakOver' && t.phase === 'break' && (
          <TimerRing
            variant="break"
            remainingMs={0}
            totalMs={t.durationMs}
            center={<span className="timer-ring-label">{T.today.breakOver}</span>}
          />
        )}
        {(view.ring === 'break' || view.ring === 'breakNag') && t.phase === 'break' && (
          <>
            <TimerRing
              variant="break"
              remainingMs={timer.breakRemainingMs(t, now)}
              totalMs={t.durationMs}
              caption={T.today.breakTitle}
            />
            {view.ring === 'breakNag' ? (
              <BreakAsk question={T.today.ultraAsk} />
            ) : (
              <p className="phase-note">{pick(T.today.breakHints, t.startedAt)}</p>
            )}
          </>
        )}

        {t.phase === 'block' && <CurrentStep task={task} />}

        {/* Ganz unten, abgesetzt: Block schon ohne App gemacht → zählt als erledigt. */}
        {t.phase === 'block' && (
          <button type="button" className="gentle-line link-quiet" onClick={() => skipBlockAsDone()}>
            {T.today.skipAsDone}
          </button>
        )}

        {view.action === 'askDone' ? (
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
                  if (view.extraStartsNow) {
                    void requestNotificationPermission()
                    requestFocusFullscreen()
                  }
                  addExtraBlock(task.id)
                }}
              >
                {view.extraStartsNow ? T.today.oneMoreStart : T.today.oneMore}
              </button>
            </div>
          </div>
        ) : view.action === 'askResume' ? (
          <div className="ask-done">
            <p className="ask-done-question">{T.today.askResume}</p>
            <div className="ask-done-actions">
              <StartButton task={task} label={T.today.resumeTask} />
              <button type="button" className="btn btn-big" onClick={() => finishTask(task.id)}>
                {T.today.finishResume}
              </button>
            </div>
          </div>
        ) : (
          view.action === 'start' && <StartArea task={task} firstBlock={view.firstBlock} breakOver={view.ring === 'breakOver'} />
        )}
      </div>
    </section>
  )
}

/** Ultra-Modus: Die fällige Pause bestätigen, damit das Piepen aufhört. */
function BreakAsk({ question }: { question: string }) {
  return (
    <div className="ask-done">
      <p className="ask-done-question">{question}</p>
      <div className="ask-done-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={() => confirmBreak()}>
          {T.today.breakConfirm}
        </button>
      </div>
    </div>
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

/**
 * Ganz leise unten rechts in der Karte, solange die kurze Pause läuft (oder auf „Pause machen“
 * wartet): „Pause überspringen“. Erst ein kurzer Hinweis, dann wird wirklich übersprungen.
 */
function SkipBreak() {
  const [asking, setAsking] = useState(false)
  return (
    <>
      <button type="button" className="skip-break link-quiet" onClick={() => setAsking(true)}>
        {T.today.skipBreak}
      </button>
      {asking && (
        <Dialog title={T.today.skipBreakTitle} onClose={() => setAsking(false)}>
          <p className="dialog-text skip-break-text">{T.today.skipBreakText}</p>
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setAsking(false)}>
              {T.today.skipBreakNo}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setAsking(false)
                skipBreak()
              }}
            >
              {T.today.skipBreakYes}
            </button>
          </div>
        </Dialog>
      )}
    </>
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

/**
 * Rund um den Startknopf. Vor dem ersten Block einer Aufgabe:
 *  - darüber das Startsignal aus „Planen“ („Wenn der Kaffee auf dem Tisch steht → los.“), falls eingetragen,
 *  - darunter klein ein Startsatz („Du musst nur anfangen.“).
 * Danach nur noch der Knopf. Ganz unten immer leise „Habe ich bereits erledigt …“
 * (außer während der kurzen Pause).
 */
function StartArea({ task, firstBlock, breakOver }: { task: Task; firstBlock: boolean; breakOver: boolean }) {
  // Startsignal nur auf dem Mac (auf dem Handy gibt es kein Feld dafür).
  const cue = SHOWS_START_CUE && task.startCue ? cleanStartCue(task.startCue) : ''
  const timer = useAppState().timer
  // Pause nach einer erledigten Hauptaufgabe: zeigen, welche als Nächstes drankommt.
  const upNext = timer.phase === 'break' && timer.taskId !== task.id
  const inShortBreak = timer.phase === 'break' && timer.taskId === task.id && !breakOver
  return (
    <div className="start-area">
      {upNext && (
        <p className="up-next">
          <span className="up-next-label">{T.today.upNext}</span>
          <span>
            <strong>„{task.title}“</strong> · {T.plan.blocksMeta(task.estimatedBlocks)}
          </span>
        </p>
      )}
      {firstBlock && cue && <p className="start-cue">{T.today.startCue(cue)}</p>}
      <StartButton task={task} />
      {firstBlock && <p className="start-nudge">{pick(T.today.startNudges, task.createdAt)}</p>}
      {/* Block schon ohne App gemacht → gleich als erledigt eintragen (nicht mitten in der kurzen Pause). */}
      {!inShortBreak && (
        <button type="button" className="gentle-line link-quiet" onClick={() => logBlockAsDone(task.id)}>
          {T.today.skipAsDone}
        </button>
      )}
    </div>
  )
}

/**
 * Der große Startknopf. Vor der ersten Aufgabe des Tages „Block starten“, ab der zweiten
 * zweizeilig: klein die Frage „Lange Pause gemacht?“, darunter „Weiter mit „…““.
 * Mit `label` (z. B. „Weitermachen“ bei der Frage „Weitermachen oder abschließen?“) nur dieser Text.
 */
function StartButton({ task, label: ownLabel }: { task: Task; label?: string }) {
  const state = useAppState()
  let label: ReactNode = ownLabel ?? (state.timer.phase === 'break'
      ? state.timer.taskId === task.id ? T.today.nextBlock : T.today.nextTask
      : T.today.startBlock)
  // Mit eigener Beschriftung (z. B. „Weitermachen“) bleibt der Knopf bewusst einzeilig.
  if (!ownLabel && needsLongPause(state, task) && state.local.longPauseEndedFor !== task.id) {
    label = (
      <span className="long-pause-label">
        <span className="long-pause-ask">{T.today.longPauseAsk}</span>
        <span>{T.today.continueWith(task.title)}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-big"
      title={T.today.spaceHint}
      onClick={() => {
        // Beim ersten Mal fragt Chrome, ob Benachrichtigungen erlaubt sind.
        void requestNotificationPermission()
        // Handy: Vollbild für die Fokus-Ansicht (geht nur direkt im Tippen).
        requestFocusFullscreen()
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
      {/* „+2 Min.“ steht rechts neben dem Ring, mittig auf Höhe der Zeit. Der Ring bleibt dabei in der Mitte. */}
      <div className="ring-with-side">
        <TimerRing
          remainingMs={timer.blockRemainingMs(timerState, now)}
          totalMs={timerState.plannedMs}
          caption={paused ? T.nav.timerPaused : T.today.remaining}
          paused={paused}
          warm={isInWarningTime(timerState, now)}
        />
        {canExtendBlock(timerState, now) && (
          <button
            type="button"
            className="btn btn-small ring-side-action"
            title={T.today.extendBlockHint}
            onClick={() => extendBlock()}
          >
            {T.today.extendBlock}
          </button>
        )}
      </div>

      <NoiseToggle />

      {paused && (
        <>
          <p className="phase-note">{T.today.paused}</p>
          <button
            type="button"
            className="btn btn-primary btn-big"
            onClick={() => {
              requestFocusFullscreen()
              resumeCurrentBlock()
            }}
          >
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
          <span className="start-done-title">{T.today.startDone}</span>
          {/* Der Satz danach steht in einer eigenen Zeile darunter. */}
          <span className="start-done-text">
            {pick(T.today.keepGoingVariants, state.timer.phase === 'block' ? state.timer.startedAt : 0)}
          </span>
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
 * Zeigt immer deutlich den Zustand („Rauschen an“ / „Rauschen aus“). Unabhängig von der
 * Einstellung „Töne“.
 */
export function NoiseToggle() {
  const { settings } = useAppState()
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
