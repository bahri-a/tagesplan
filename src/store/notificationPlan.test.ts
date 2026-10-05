/**
 * Tests: Welche Mitteilungen soll die iPhone-App beim System bestellen?
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../config/defaults'
import { resetDatabaseForTests } from '../db/database'
import * as actions from './actions'
import { keepDeliveredNotifications, plannedNotifications } from './notificationPlan'
import * as sel from './selectors'
import { getState, initStore, resetStoreForTests } from './store'

const MIN = 60_000
const BLOCK = DEFAULT_SETTINGS.blockMinutes * MIN
const BREAK = DEFAULT_SETTINGS.shortBreakMinutes * MIN
const START = new Date(2026, 9, 5, 9, 0).getTime()

function at(ms: number) {
  vi.setSystemTime(START + ms)
  return START + ms
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseForTests()
  resetStoreForTests()
  vi.useFakeTimers({ toFake: ['Date'] })
  at(0)
  await initStore()
})

afterEach(() => {
  vi.useRealTimers()
})

const today = () => sel.activeDay(getState()).id
const plan = () => plannedNotifications(getState()).map((n) => ({ kind: n.kind, at: n.at - START }))

describe('Mitteilungen der iPhone-App', () => {
  it('ohne Timer ist nichts geplant', () => {
    actions.addTask(today(), 'A')
    expect(plan()).toEqual([])
  })

  it('Block läuft → Blockende und Ende der anschließenden kurzen Pause', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    expect(plan()).toEqual([
      { kind: 'blockEnd', at: BLOCK },
      { kind: 'breakEnd', at: BLOCK + BREAK },
    ])
  })

  it('pausiert → nichts; weiter → Zeitpunkte verschieben sich um die Pausenzeit', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    at(5 * MIN)
    actions.pauseCurrentBlock()
    expect(plan()).toEqual([])
    at(8 * MIN)
    actions.resumeCurrentBlock()
    expect(plan()[0]).toEqual({ kind: 'blockEnd', at: BLOCK + 3 * MIN })
  })

  it('letzter geschätzter Block → nur Blockende mit eigenem Text, keine Pause', () => {
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 1 })
    actions.startBlock(task.id)
    const list = plannedNotifications(getState())
    expect(list.map((n) => n.kind)).toEqual(['blockEnd'])
    expect(list[0].body).toContain('Alle geplanten Blöcke geschafft')
  })

  it('kurze Pause läuft → nur ihr Ende; danach nichts mehr', () => {
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK + 1000))
    expect(plan()).toEqual([{ kind: 'breakEnd', at: BLOCK + BREAK }])
    actions.checkTimer(at(BLOCK + BREAK + 1000))
    expect(plan()).toEqual([])
  })

  it('Ultra-Modus → nur das Blockende; die Mitteilung bleibt bis „Pause machen“', () => {
    actions.updateSettings({ ultraMode: true })
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    expect(plan()).toEqual([{ kind: 'blockEnd', at: BLOCK }])

    actions.checkTimer(at(BLOCK + 1000))
    expect(plan()).toEqual([])
    expect(keepDeliveredNotifications(getState())).toBe(true)

    actions.confirmBreak(at(BLOCK + 2 * MIN))
    expect(keepDeliveredNotifications(getState())).toBe(false)
    expect(plan()).toEqual([{ kind: 'breakEnd', at: BLOCK + 2 * MIN + BREAK }])
  })

  it('Ultra-Modus nach dem letzten Block → Mitteilung muss nicht stehen bleiben', () => {
    actions.updateSettings({ ultraMode: true })
    const task = actions.addTask(today(), 'A')
    actions.updateTask(task.id, { estimatedBlocks: 1 })
    actions.startBlock(task.id)
    actions.checkTimer(at(BLOCK + 1000))
    expect(keepDeliveredNotifications(getState())).toBe(false)
  })

  it('Ultra-Modus mit Tönen aus → Pause wartet trotzdem auf „Pause machen“', () => {
    actions.updateSettings({ ultraMode: true, sounds: false })
    const task = actions.addTask(today(), 'A')
    actions.startBlock(task.id)
    expect(plan().map((n) => n.kind)).toEqual(['blockEnd'])
  })
})
