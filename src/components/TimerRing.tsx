/**
 * Große, ruhige Timer-Anzeige: Restzeit in der Mitte, darum ein Ring,
 * der sich langsam füllt.
 */

import { formatCountdown } from '../logic/time'
import { progress } from '../logic/timer'

interface Props {
  remainingMs: number
  totalMs: number
  /** Kleiner Text unter der Zeit, z. B. „Pausiert“. */
  caption?: string
  variant?: 'block' | 'break'
}

const SIZE = 260
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function TimerRing({ remainingMs, totalMs, caption, variant = 'block' }: Props) {
  const done = progress(totalMs, remainingMs)
  return (
    <div className={`timer-ring is-${variant}`} role="timer" aria-live="off">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle className="timer-ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={STROKE} />
        <circle
          className="timer-ring-progress"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - done)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="timer-ring-center">
        <span className="timer-ring-time">{formatCountdown(remainingMs)}</span>
        {caption && <span className="timer-ring-caption">{caption}</span>}
      </div>
    </div>
  )
}
