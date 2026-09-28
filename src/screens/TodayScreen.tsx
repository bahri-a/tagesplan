/**
 * BILDSCHIRM „HEUTE“ (Durchführen)
 * ================================
 * Zeigt immer die oberste noch nicht erledigte Hauptaufgabe – groß und ruhig:
 *  - ganz oben: Fortschritt als Symbole (Aufgaben des Tages, Blöcke der Aufgabe)
 *  - vor dem Start: Aufgabe, aktueller Schritt, „Block starten“
 *    (bzw. „Lange Pause gemacht – weiter mit …“ ab der zweiten Aufgabe)
 *  - während des Blocks: große Restzeit, dezent „Pausieren“ und „Abbrechen“
 *  - in der kurzen Pause: Restzeit der Pause, danach „Nächsten Block starten“
 *  - nach dem letzten geschätzten Block: „Erledigt oder noch ein Block?“
 */

import { useState } from 'react'
import { T } from '../config/texts'
import { useNow } from '../components/hooks'
import { StepList } from '../components/StepList'
import { TimerRing } from '../components/TimerRing'
import { blockMarks, taskMark, type Mark } from '../logic/progress'
import * as timer from '../logic/timer'
import type { Task } from '../model/types'
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
      {tasks.length === 0 ? (
        <section className="card focus-card focus-card-message">
          <h1 className="focus-title">{T.today.emptyTitle}</h1>
          <p className="muted">{T.today.emptyText}</p>
          <button type="button" className="btn btn-primary" onClick={onPlan}>
            {T.today.goPlan}
          </button>
        </section>
      ) : task ? (
        <FocusCard task={task} />
      ) : (
        <section className="card focus-card focus-card-message">
          <div className="all-done-mark" aria-hidden="true">
            ✓
          </div>
          <h1 className="focus-title">{T.today.allDoneTitle}</h1>
          <p className="muted">{T.today.allDoneText}</p>
        </section>
      )}

      {/* Während ein Block läuft, bleibt nur das Wichtigste sichtbar. */}
      {t.phase !== 'block' && tasks.length > 0 && (
        <section className="day-overview" aria-label={T.today.dayList}>
          <ol className="day-list">
            {tasks.map((item, index) => (
              <li
                key={item.id}
                className={`day-list-item${item.completedAt !== null ? ' is-done' : ''}${item.id === task?.id ? ' is-current' : ''}`}
              >
                <span className="day-list-number">{item.completedAt !== null ? '✓' : `${index + 1}.`}</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

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

  // Derselbe Stand als ganzer Satz – für den Hinweis beim Drüberfahren und für Screenreader.
  let blockLine: string
  if (t.phase === 'block') blockLine = T.today.blockOf(done + 1, task.estimatedBlocks)
  else if (t.phase === 'break' || asking) blockLine = T.today.blockDoneOf(done, task.estimatedBlocks)
  else blockLine = `${T.today.blockOf(done + 1, task.estimatedBlocks)} · ${T.today.minutes(minutes)}`

  // „Jetzt dran“ ist ein Block, wenn er läuft oder gleich gestartet werden kann.
  const highlightBlock = t.phase === 'block' || (canStart && !asking)

  return (
    <section className={`card focus-card is-${t.phase}`}>
      <ProgressRows
        tasks={tasks}
        currentId={task.id}
        blocks={blockMarks(done, task.estimatedBlocks, highlightBlock)}
        suffix={t.phase === 'idle' && !asking ? T.today.perBlock(minutes) : null}
        sentence={`${T.today.taskOf(number, tasks.length)} · ${blockLine}`}
      />
      <h1 className="focus-title">{task.title}</h1>

      {t.phase === 'block' && <RunningBlock timerState={t} now={now} />}

      {t.phase === 'break' && (
        <div className="break-panel">
          {breakOver ? (
            <p className="break-over">{T.today.breakOver}</p>
          ) : (
            <>
              <TimerRing
                variant="break"
                remainingMs={timer.breakRemainingMs(t, now)}
                totalMs={t.durationMs}
                caption={T.today.breakTitle}
              />
              <p className="muted">{T.today.breakHint}</p>
            </>
          )}
        </div>
      )}

      <CurrentStep task={task} />

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
    </section>
  )
}

interface ProgressRowsProps {
  tasks: Task[]
  currentId: string
  blocks: Mark[]
  /** Kleiner Zusatz hinter den Block-Punkten, z. B. „je 15 Min.“ – oder `null`. */
  suffix: string | null
  sentence: string
}

/**
 * Oben in der Karte: wo du gerade stehst – zwei kurze Zeilen mit Symbolen statt eines langen Satzes.
 *  - Aufgabe: ✓ = erledigt, hervorgehoben = jetzt dran, nur Umriss = kommt noch
 *  - Block:   voller Punkt = geschafft, breiter Punkt = jetzt dran, nur Umriss = kommt noch
 * Abgebrochene Blöcke sehen aus wie geschaffte (sie zählen mit, nichts soll nach Fehler aussehen).
 */
function ProgressRows({ tasks, currentId, blocks, suffix, sentence }: ProgressRowsProps) {
  return (
    <div className="progress" title={sentence}>
      <span className="visually-hidden">{sentence}</span>

      <span className="progress-label" aria-hidden="true">
        {T.today.progressTask}
      </span>
      <span className="progress-marks" aria-hidden="true">
        {tasks.map((item, index) => {
          const mark = taskMark(item.completedAt !== null, item.id === currentId)
          return (
            <span key={item.id} className={`task-mark is-${mark}`}>
              {mark === 'done' ? '✓' : index + 1}
            </span>
          )
        })}
      </span>

      <span className="progress-label" aria-hidden="true">
        {T.today.progressBlock}
      </span>
      <span className="progress-marks" aria-hidden="true">
        {blocks.map((mark, index) => (
          <span key={index} className={`block-mark is-${mark}`} />
        ))}
        {suffix && <span className="progress-suffix">{suffix}</span>}
      </span>
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
      className="btn btn-primary btn-big start-button"
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

/** Der laufende (oder pausierte) Block: Restzeit, Pausieren, Abbrechen. */
function RunningBlock({ timerState, now }: { timerState: timer.BlockTimer; now: number }) {
  const [confirmAbort, setConfirmAbort] = useState(false)
  const paused = timerState.pausedAt !== null

  return (
    <div className="running-block">
      <TimerRing
        remainingMs={timer.blockRemainingMs(timerState, now)}
        totalMs={timerState.plannedMs}
        caption={paused ? T.nav.timerPaused : T.today.remaining}
      />

      {paused && (
        <>
          <p className="muted">{T.today.paused}</p>
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
    </div>
  )
}

/** „Jetzt: …“ – der aktuelle Schritt zum direkten Abhaken, dazu alle Schritte zum Aufklappen. */
function CurrentStep({ task }: { task: Task }) {
  const state = useAppState()
  const [showAll, setShowAll] = useState(false)
  const steps = stepsOfTask(state, task.id)
  const step = currentStep(state, task.id)
  if (steps.length === 0) return null
  const doneCount = steps.filter((s) => s.doneAt !== null).length

  return (
    <div className="current-step">
      {step && !showAll && (
        <label className="current-step-row">
          <input type="checkbox" className="checkbox" checked={false} onChange={() => toggleStep(step.id)} />
          <span>
            <span className="current-step-label">{T.today.now}: </span>
            {step.text}
          </span>
        </label>
      )}
      {showAll && <StepList taskId={task.id} editable={false} highlightId={step?.id} />}
      <button type="button" className="btn btn-quiet btn-small" onClick={() => setShowAll(!showAll)}>
        {showAll ? T.today.hideSteps : T.today.allSteps(doneCount, steps.length)}
      </button>
    </div>
  )
}
