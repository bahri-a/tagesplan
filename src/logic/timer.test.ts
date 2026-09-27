import { describe, expect, it } from 'vitest'
import { dayKey, formatCountdown } from './time'
import * as timer from './timer'

const MIN = 60_000

function block(startedAt = 0): timer.BlockTimer {
  return { phase: 'block', taskId: 't', dayId: 'd', startedAt, plannedMs: 15 * MIN, pausedAt: null, pausedMs: 0 }
}

describe('Block-Timer', () => {
  it('rechnet die Restzeit aus Zeitpunkten', () => {
    expect(timer.blockRemainingMs(block(), 5 * MIN)).toBe(10 * MIN)
    expect(timer.isBlockFinished(block(), 15 * MIN)).toBe(true)
    expect(timer.isBlockFinished(block(), 15 * MIN - 1)).toBe(false)
  })

  it('hält die Zeit während einer Pause an und verlängert den Block danach', () => {
    let t = timer.pauseBlock(block(), 5 * MIN)
    expect(timer.blockRemainingMs(t, 9 * MIN)).toBe(10 * MIN)
    expect(timer.isBlockFinished(t, 60 * MIN)).toBe(false)
    t = timer.resumeBlock(t, 8 * MIN) // 3 Minuten pausiert
    expect(t.pausedMs).toBe(3 * MIN)
    expect(timer.blockEndsAt(t)).toBe(18 * MIN)
  })

  it('zählt Pausen nicht als Arbeitszeit', () => {
    let t = timer.pauseBlock(block(), 5 * MIN)
    t = timer.resumeBlock(t, 8 * MIN)
    expect(timer.blockWorkedMs(t, 10 * MIN)).toBe(7 * MIN)
    // auch eine gerade laufende Pause zählt nicht
    t = timer.pauseBlock(t, 12 * MIN)
    expect(timer.blockWorkedMs(t, 20 * MIN)).toBe(9 * MIN)
  })

  it('gibt nie mehr als die geplante Zeit als gearbeitet an', () => {
    expect(timer.blockWorkedMs(block(), 99 * MIN)).toBe(15 * MIN)
  })
})

describe('Zeit-Hilfen', () => {
  it('formatiert den Countdown', () => {
    expect(formatCountdown(15 * MIN)).toBe('15:00')
    expect(formatCountdown(61_500)).toBe('1:02')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(90 * MIN)).toBe('1:30:00')
  })

  it('zählt Zeit vor 4 Uhr nachts noch zum Vortag', () => {
    expect(dayKey(new Date(2026, 8, 28, 2, 30).getTime())).toBe('2026-09-27')
    expect(dayKey(new Date(2026, 8, 28, 4, 0).getTime())).toBe('2026-09-28')
    expect(dayKey(new Date(2026, 8, 28, 23, 59).getTime())).toBe('2026-09-28')
  })
})
