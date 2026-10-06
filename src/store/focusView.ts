/**
 * WAS ZEIGT DIE GROSSE KARTE IN „HEUTE“?
 * =====================================
 * Eine einzige Stelle entscheidet, in welcher Phase die Karte gerade ist. Die Karte (und das
 * Mini-Fenster) zeichnet nur noch danach – so kann keine Bedingung an zwei Stellen
 * auseinanderlaufen. Getestet in focusView.test.ts (eine Tabelle aller Phasen).
 *
 * Zwei Teile, weil sie unabhängig voneinander sind:
 *  - `ring`: was in der Mitte läuft (nichts, Block, pausierter Block, kurze Pause …)
 *  - `action`: was darunter gefragt oder angeboten wird (Starten, „Erledigt oder noch ein Block?“ …)
 */

import { isBreakOver } from '../logic/timer'
import type { Task } from '../model/types'
import {
  blocksDone,
  canUndoExtraBlock,
  extraBlockStartsNow,
  isAskingDone,
  isAskingResume,
} from './selectors'
import type { AppState } from './store'

export type RingView =
  /** Nichts läuft – vor dem Start oder bei einer Frage. */
  | 'none'
  /** Ein Block läuft. */
  | 'running'
  /** Ein Block ist pausiert. */
  | 'paused'
  /** Ultra-Modus: Die kurze Pause wartet auf „Pause machen“ (es piept). */
  | 'breakNag'
  /** Die kurze Pause läuft. */
  | 'break'
  /** Die kurze Pause ist vorbei – der nächste Block kann starten. */
  | 'breakOver'

export type ActionView =
  /** Nichts darunter (z. B. während Block oder laufender Pause). */
  | 'none'
  /** Nach dem letzten geschätzten Block: „Hauptaufgabe erledigt oder noch ein Block?“ */
  | 'askDone'
  /** An einem früheren Tag angefangen: „Weitermachen oder abschließen?“ */
  | 'askResume'
  /** Der Startknopf (erster Block, nächster Block oder nächste Aufgabe). */
  | 'start'

export interface FocusView {
  ring: RingView
  action: ActionView
  /** Vor dem allerersten Block der Aufgabe (dann stehen Startsignal und Startsatz dabei). */
  firstBlock: boolean
  /** Nur bei 'askDone': Startet „Noch ein Block“ sofort (sonst erst der Rest der Pause)? */
  extraStartsNow: boolean
  /** Leises „Zurück“ zur Frage „Erledigt oder noch ein Block?“ anbieten? */
  canUndoExtra: boolean
  /** Leises „Pause überspringen“ anbieten? */
  canSkipBreak: boolean
  /** Ist bei den Block-Punkten ein Block „jetzt dran“ (läuft oder kann gleich starten)? */
  highlightBlock: boolean
  /** Ändert sich dieser Schlüssel, blendet die Karte ihren unteren Teil weich neu ein. */
  key: string
}

/** Braucht die Karte eine tickende Uhr? (Timer läuft – oder die Frage nach dem letzten Block hängt von der Zeit ab.) */
export function focusNeedsClock(s: AppState, task: Task): boolean {
  return s.timer.phase !== 'idle' || isAskingDone(s, task)
}

export function focusView(s: AppState, task: Task, now: number): FocusView {
  const t = s.timer
  const asking = t.phase !== 'block' && isAskingDone(s, task)
  const breakOver = t.phase === 'break' && (t.endSignaled || isBreakOver(t, now))

  let ring: RingView = 'none'
  if (t.phase === 'block') ring = t.pausedAt === null ? 'running' : 'paused'
  else if (t.phase === 'break') ring = breakOver ? 'breakOver' : t.nagging && s.settings.ultraMode ? 'breakNag' : 'break'

  // Starten geht, wenn nichts läuft oder die kurze Pause vorbei ist.
  const canStart = t.phase === 'idle' || breakOver
  let action: ActionView = 'none'
  if (asking) action = 'askDone'
  else if (t.phase === 'idle' && isAskingResume(s, task)) action = 'askResume'
  else if (canStart) action = 'start'

  return {
    ring,
    action,
    firstBlock: t.phase === 'idle' && blocksDone(s, task.id) === 0,
    extraStartsNow: asking && extraBlockStartsNow(s, task, now),
    canUndoExtra: canUndoExtraBlock(s, task, now),
    canSkipBreak: t.phase === 'break' && !breakOver,
    highlightBlock: t.phase === 'block' || (canStart && !asking),
    // „Pause machen“ (breakNag → break) blendet nicht neu ein – es bleibt dieselbe Pause.
    key: `${ring === 'breakNag' ? 'break' : ring}-${action}`,
  }
}
