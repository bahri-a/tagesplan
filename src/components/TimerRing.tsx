/**
 * Der „weiche Ring“: große, feine Restzeit in der Mitte, darum ein dicker Ring
 * mit sanftem Farbverlauf, der sich langsam füllt. Am Ende des Fortschritts
 * sitzt ein leuchtender Punkt. Grün im Block, blau in der Pause.
 * Bewusst ohne Pulsieren – auch in der Pause „atmet“ der Ring nicht.
 */

import { useId, type ReactNode } from 'react'
import { formatCountdown } from '../logic/time'
import { progress } from '../logic/timer'

interface Props {
  remainingMs: number
  totalMs: number
  /** Kleiner Text unter der Zeit, z. B. „noch“ oder „Pausiert“. */
  caption?: string
  variant?: 'block' | 'break'
  /** Pausierter Block: Ring blasser, der Punkt leuchtet nicht. */
  paused?: boolean
  /** Statt der Zeit etwas anderes in der Mitte zeigen (z. B. „Pause vorbei“). */
  center?: ReactNode
}

const SIZE = 280
const STROKE = 14
/** Etwas Rand lassen, damit das Leuchten des Punktes nicht abgeschnitten wird. */
const RADIUS = SIZE / 2 - 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const C = SIZE / 2

export function TimerRing({ remainingMs, totalMs, caption, variant = 'block', paused = false, center }: Props) {
  // Eindeutige ID für Verlauf und Leuchten (nur Buchstaben/Ziffern, damit url(#…) sicher klappt).
  const id = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const done = progress(totalMs, remainingMs)
  const time = formatCountdown(remainingMs)
  const classes = ['timer-ring', `is-${variant}`]
  if (paused) classes.push('is-paused')

  return (
    <div className={classes.join(' ')} role="timer" aria-live="off">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <defs>
          {/* Verlauf von oben (hell) nach unten (kräftig) – der Kreis ist um -90° gedreht. */}
          <linearGradient id={`${id}-gradient`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" className="timer-ring-stop-a" />
            <stop offset="1" className="timer-ring-stop-b" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
        </defs>
        <circle className="timer-ring-track" cx={C} cy={C} r={RADIUS} strokeWidth={STROKE} />
        <circle
          className="timer-ring-progress"
          cx={C}
          cy={C}
          r={RADIUS}
          strokeWidth={STROKE}
          stroke={`url(#${id}-gradient)`}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - done)}
          transform={`rotate(-90 ${C} ${C})`}
        />
        {/* Der leuchtende Punkt dreht sich mit – so gleitet er flüssig auf dem Ring entlang. */}
        <g className="timer-ring-dot" style={{ transform: `rotate(${done * 360}deg)` }}>
          <circle className="timer-ring-halo" cx={C} cy={C - RADIUS} r={11} filter={`url(#${id}-glow)`} />
          <circle className="timer-ring-core" cx={C} cy={C - RADIUS} r={4.5} />
        </g>
      </svg>
      <div className="timer-ring-center">
        {center ?? (
          <>
            {/* Mit Stunden (z. B. „1:30:00“) etwas kleiner, damit es in den Ring passt. */}
            <span className={`timer-ring-time${time.length > 5 ? ' is-long' : ''}`}>{time}</span>
            {caption && <span className="timer-ring-caption">{caption}</span>}
          </>
        )}
      </div>
    </div>
  )
}
