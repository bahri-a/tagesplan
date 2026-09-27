import { describe, expect, it } from 'vitest'
import type { Task } from '../model/types'
import { mergeCarryOver } from './carryOver'

function task(id: string, position: number, done = false): Task {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    dayId: 'd',
    title: id,
    position,
    estimatedBlocks: 3,
    blockMinutesOverride: null,
    completedAt: done ? 1 : null,
  }
}

const ids = (tasks: Task[]) => tasks.map((t) => t.id)

describe('mergeCarryOver', () => {
  it('übernimmt nur den Plan, wenn alles erledigt war', () => {
    const r = mergeCarryOver([task('A', 0, true)], [task('X', 0), task('Y', 1)])
    expect(ids(r.order)).toEqual(['X', 'Y'])
    expect(r.conflicts).toEqual([])
  })

  it('legt offene Aufgaben auf freie Plätze ohne Konflikt', () => {
    // A erledigt, B (Platz 2) offen; geplant ist nur X (Platz 1)
    const r = mergeCarryOver([task('A', 0, true), task('B', 1)], [task('X', 0)])
    expect(ids(r.order)).toEqual(['X', 'B'])
    expect(r.conflicts).toEqual([])
  })

  it('meldet einen Konflikt, wenn der Platz belegt ist – Standard: übertragene zuerst', () => {
    const r = mergeCarryOver([task('A', 0, true), task('B', 1)], [task('X', 0), task('Y', 1)])
    expect(r.conflicts).toHaveLength(1)
    expect(r.conflicts[0].place).toBe(2)
    expect(r.conflicts[0].carried.id).toBe('B')
    expect(r.conflicts[0].planned.id).toBe('Y')
    expect(ids(r.order)).toEqual(['X', 'B', 'Y'])
  })

  it('beachtet die Wahl: die andere rutscht auf den nächsten Platz', () => {
    const r = mergeCarryOver(
      [task('A', 0, true), task('B', 1), task('C', 2)],
      [task('X', 0), task('Y', 1)],
      { B: 'planned' },
    )
    expect(ids(r.order)).toEqual(['X', 'Y', 'B', 'C'])
  })

  it('behält die alte Reihenfolge, wenn morgen leer ist', () => {
    const r = mergeCarryOver([task('A', 0), task('B', 1), task('C', 2, true)], [])
    expect(ids(r.order)).toEqual(['A', 'B'])
  })

  it('findet mehrere Konflikte mit korrekten Plätzen', () => {
    const r = mergeCarryOver([task('A', 0), task('B', 1)], [task('X', 0), task('Y', 1)], {
      A: 'planned',
      B: 'carried',
    })
    expect(r.conflicts.map((c) => c.place)).toEqual([1, 3])
    expect(ids(r.order)).toEqual(['X', 'A', 'B', 'Y'])
  })
})
