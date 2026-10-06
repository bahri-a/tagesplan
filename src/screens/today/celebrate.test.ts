import { describe, expect, it } from 'vitest'
import { JUST_FINISHED_MS } from '../../config/defaults'
import { noteFinished, wasJustFinished } from './celebrate'

describe('Kleine Belohnung nach „Erledigt“', () => {
  it('gilt nur für die gerade erledigte Aufgabe und nur kurz', () => {
    noteFinished('a', 1000)
    expect(wasJustFinished('a', 1000)).toBe(true)
    expect(wasJustFinished('b', 1000)).toBe(false)
    expect(wasJustFinished('a', 1000 + JUST_FINISHED_MS)).toBe(false)
  })
})
