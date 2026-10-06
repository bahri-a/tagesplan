/**
 * Tabelle aller Phasen der großen Karte in „Heute“ (siehe focusView.ts):
 * Jede Zeile spielt einen Ablauf durch und prüft, was die Karte zeigt.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../config/defaults'
import { resetDatabaseForTests } from '../db/database'
import * as actions from './actions'
import { focusView, type FocusView } from './focusView'
import * as sel from './selectors'
import { getState, initStore, resetStoreForTests } from './store'

const MIN = 60_000
const BLOCK = DEFAULT_SETTINGS.blockMinutes * MIN
const BREAK = DEFAULT_SETTINGS.shortBreakMinutes * MIN
const START = new Date(2026, 8, 28, 9, 0).getTime()
const DAY = 24 * 60 * MIN

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

/** Legt eine Aufgabe mit zwei Blöcken an, spielt `setup` durch und liefert die Ansicht zum Zeitpunkt `now`. */
function viewAfter(setup: (taskId: string) => number): FocusView {
  const task = actions.addTask(sel.activeDay(getState()).id, 'Kapitel 3')
  actions.updateTask(task.id, { estimatedBlocks: 2 })
  const now = setup(task.id)
  return focusView(getState(), getState().tasks[task.id], now)
}

type Row = [name: string, setup: (id: string) => number, expected: Partial<FocusView>]

const rows: Row[] = [
  ['vor dem ersten Block', () => at(0), { ring: 'none', action: 'start', firstBlock: true, highlightBlock: true, showStepsPreview: true }],
  [
    'Block läuft',
    (id) => {
      actions.startBlock(id)
      return at(5 * MIN)
    },
    { ring: 'running', action: 'none', firstBlock: false, canSkipBreak: false, showStepsPreview: false },
  ],
  [
    'Block pausiert',
    (id) => {
      actions.startBlock(id)
      at(5 * MIN)
      actions.pauseCurrentBlock()
      return at(6 * MIN)
    },
    { ring: 'paused', action: 'none' },
  ],
  [
    'kurze Pause läuft',
    (id) => {
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      return at(BLOCK + MIN)
    },
    { ring: 'break', action: 'none', canSkipBreak: true, highlightBlock: false, showStepsPreview: false },
  ],
  [
    'Ultra-Modus: Pause wartet auf „Pause machen“',
    (id) => {
      actions.updateSettings({ ultraMode: true })
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      return at(BLOCK + 1000)
    },
    { ring: 'breakNag', action: 'none', canSkipBreak: true },
  ],
  [
    'kurze Pause vorbei',
    (id) => {
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      actions.checkTimer(at(BLOCK + BREAK))
      return at(BLOCK + BREAK + MIN)
    },
    { ring: 'breakOver', action: 'start', canSkipBreak: false, highlightBlock: true, firstBlock: false, showStepsPreview: false },
  ],
  [
    'nach dem letzten Block, kurz danach: „Noch ein Block“ wartet den Rest der Pause ab',
    (id) => {
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      actions.skipBreak()
      actions.startBlock(id)
      actions.checkTimer(at(2 * BLOCK))
      return at(2 * BLOCK + MIN)
    },
    { ring: 'none', action: 'askDone', extraStartsNow: false, highlightBlock: false, showStepsPreview: false },
  ],
  [
    'nach dem letzten Block, lange danach: „Noch einen Block starten“',
    (id) => {
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      actions.skipBreak()
      actions.startBlock(id)
      actions.checkTimer(at(2 * BLOCK))
      return at(2 * BLOCK + BREAK + MIN)
    },
    { ring: 'none', action: 'askDone', extraStartsNow: true },
  ],
  [
    'nach „Noch ein Block“: Zurück ist möglich',
    (id) => {
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      actions.skipBreak()
      actions.startBlock(id)
      actions.checkTimer(at(2 * BLOCK))
      actions.addExtraBlock(id, at(2 * BLOCK + MIN))
      return at(2 * BLOCK + 2 * MIN)
    },
    { ring: 'break', action: 'none', canUndoExtra: true },
  ],
  [
    'an einem früheren Tag angefangen: „Weitermachen oder abschließen?“',
    (id) => {
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      actions.skipBreak()
      at(DAY)
      actions.endDay()
      return at(DAY + MIN)
    },
    { ring: 'none', action: 'askResume', firstBlock: false, showStepsPreview: false },
  ],
]

describe('Große Karte in „Heute“: welche Phase?', () => {
  it.each(rows)('%s', (_name, setup, expected) => {
    expect(viewAfter(setup)).toMatchObject(expected)
  })

  it('die ersten Schritte der nächsten Aufgabe stehen wieder da, bis ihr erster Block geschafft ist', () => {
    const a = actions.addTask(sel.activeDay(getState()).id, 'A')
    const b = actions.addTask(sel.activeDay(getState()).id, 'B')
    actions.updateTask(a.id, { estimatedBlocks: 1 })
    actions.startBlock(a.id)
    actions.checkTimer(at(BLOCK))
    actions.finishTask(a.id)
    actions.endLongPause(b.id)
    expect(focusView(getState(), getState().tasks[b.id], at(BLOCK + MIN)).showStepsPreview).toBe(true)
    actions.startBlock(b.id)
    actions.checkTimer(at(2 * BLOCK + MIN))
    expect(focusView(getState(), getState().tasks[b.id], at(2 * BLOCK + 2 * MIN)).showStepsPreview).toBe(false)
  })

  it('„Pause machen“ (Ultra) blendet die Karte nicht neu ein, Ende der Pause schon', () => {
    const nag = viewAfter((id) => {
      actions.updateSettings({ ultraMode: true })
      actions.startBlock(id)
      actions.checkTimer(at(BLOCK))
      return at(BLOCK + 1000)
    })
    actions.confirmBreak(at(BLOCK + 2000))
    const task = sel.currentTask(getState())!
    const running = focusView(getState(), task, at(BLOCK + 3000))
    expect(running.ring).toBe('break')
    expect(running.key).toBe(nag.key)
    const over = focusView(getState(), task, at(BLOCK + 2000 + BREAK + 1000))
    expect(over.key).not.toBe(running.key)
  })
})
