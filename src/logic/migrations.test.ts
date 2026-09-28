import { describe, expect, it } from 'vitest'
import type { Settings, Task } from '../model/types'
import { settingsToV2, taskToV2 } from './migrations'

function settings(blockMinutes: number, shortBreakMinutes: number): Settings {
  return {
    id: 'settings',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    blockMinutes,
    shortBreakMinutes,
    defaultBlocksPerTask: 3,
    maxTasksPerDay: 3,
    theme: 'system',
    surfaces: 'pur',
  }
}

function task(shortBreakMinutesOverride: number | null): Task {
  return {
    id: 't',
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    dayId: 'd',
    title: 'A',
    position: 0,
    estimatedBlocks: 3,
    blockMinutesOverride: 10,
    shortBreakMinutesOverride,
    completedAt: null,
  }
}

describe('Daten-Update auf Version 2', () => {
  it('gibt alten Aufgaben „Standard“ für die kurze Pause', () => {
    const oldTask: Partial<Task> = task(null)
    delete oldTask.shortBreakMinutesOverride
    expect(taskToV2(oldTask as Task)).toEqual(task(null))
  })

  it('lässt eine schon vorhandene individuelle Pause in Ruhe', () => {
    expect(taskToV2(task(3)).shortBreakMinutesOverride).toBe(3)
  })

  it('stellt die alten Standardwerte 15/5 auf 25/7 um', () => {
    const next = settingsToV2(settings(15, 5), 1000)
    expect(next.blockMinutes).toBe(25)
    expect(next.shortBreakMinutes).toBe(7)
    expect(next.updatedAt).toBe(1000)
  })

  it('lässt selbst geänderte Werte, wie sie sind', () => {
    expect(settingsToV2(settings(20, 5), 1000)).toMatchObject({ blockMinutes: 20, shortBreakMinutes: 7 })
    const own = settings(30, 10)
    expect(settingsToV2(own, 1000)).toBe(own)
  })
})
