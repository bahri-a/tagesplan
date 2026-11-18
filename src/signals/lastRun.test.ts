/** S2: Der letzte Takt eines laufenden Blocks übersteht einen Neustart – aber nur für diesen Block. */
import { describe, expect, it } from 'vitest'
import { memoryStorage } from '../logic/deviceStorage'
import type { TimerState } from '../model/types'
import { readLastRun } from './timerEngine'

const block = (over: Partial<Extract<TimerState, { phase: 'block' }>> = {}) =>
  ({ phase: 'block', taskId: 't', dayId: 'd', startedAt: 1000, plannedMs: 1_500_000, pausedMs: 0, pausedAt: null, ...over }) as TimerState

describe('readLastRun', () => {
  it('liefert den gemerkten Takt des laufenden Blocks', () => {
    expect(readLastRun(block(), memoryStorage({ 'tagesplan-letzter-takt': '5000' }))).toBe(5000)
  })
  it('ignoriert einen Takt von einem früheren Block', () => {
    expect(readLastRun(block({ startedAt: 9000 }), memoryStorage({ 'tagesplan-letzter-takt': '5000' }))).toBeNull()
  })
  it('nichts, wenn der Block pausiert ist oder gar keiner läuft', () => {
    const storage = memoryStorage({ 'tagesplan-letzter-takt': '5000' })
    expect(readLastRun(block({ pausedAt: 4000 }), storage)).toBeNull()
    expect(readLastRun({ phase: 'idle' }, storage)).toBeNull()
  })
  it('nichts, wenn nichts gemerkt ist', () => {
    expect(readLastRun(block(), memoryStorage())).toBeNull()
  })
})
