import { describe, expect, it } from 'vitest'
import { blockMarks, taskMark } from './progress'

describe('Fortschritt als Symbole', () => {
  it('zeigt den laufenden Block als „jetzt dran“', () => {
    expect(blockMarks(0, 3, true)).toEqual(['current', 'open', 'open'])
    expect(blockMarks(1, 3, true)).toEqual(['done', 'current', 'open'])
  })

  it('hebt in der Pause nichts hervor', () => {
    expect(blockMarks(1, 3, false)).toEqual(['done', 'open', 'open'])
  })

  it('zeigt alle Blöcke als geschafft, wenn die Schätzung erreicht ist', () => {
    expect(blockMarks(3, 3, false)).toEqual(['done', 'done', 'done'])
  })

  it('zeigt mehr Punkte, wenn mehr Blöcke gemacht wurden als geschätzt', () => {
    expect(blockMarks(3, 2, true)).toEqual(['done', 'done', 'done', 'current'])
    expect(blockMarks(3, 2, false)).toEqual(['done', 'done', 'done'])
  })

  it('markiert die aktuelle Aufgabe vor allem anderen', () => {
    expect(taskMark(false, true)).toBe('current')
    expect(taskMark(true, false)).toBe('done')
    expect(taskMark(false, false)).toBe('open')
  })
})
