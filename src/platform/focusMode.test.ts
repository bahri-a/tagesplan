import { describe, expect, it } from 'vitest'
import { FOCUS_DIM_MAX } from '../config/defaults'
import type { TimerState } from '../model/types'
import { focusDim } from './focusMode'

const MIN = 60_000
const block: TimerState = {
  phase: 'block',
  taskId: 't',
  dayId: 'd',
  startedAt: 0,
  plannedMs: 20 * MIN,
  pausedAt: null,
  pausedMs: 0,
}

describe('Fokus-Ansicht: langsam dunkler', () => {
  it('beginnt hell, ist zur Hälfte halb so dunkel und am Ende am dunkelsten', () => {
    expect(focusDim(block, 0)).toBe(0)
    expect(focusDim(block, 10 * MIN)).toBeCloseTo(FOCUS_DIM_MAX / 2)
    expect(focusDim(block, 20 * MIN)).toBe(FOCUS_DIM_MAX)
    expect(focusDim(block, 40 * MIN)).toBe(FOCUS_DIM_MAX) // nie dunkler als das Maximum
  })

  it('pausierte Zeit zählt nicht mit, außerhalb eines Blocks bleibt es hell', () => {
    expect(focusDim({ ...block, pausedMs: 10 * MIN }, 10 * MIN)).toBe(0)
    expect(focusDim({ phase: 'idle' }, 10 * MIN)).toBe(0)
  })
})
