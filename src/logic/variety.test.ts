import { describe, expect, it } from 'vitest'
import { cleanStartCue, pick, showsGentleLine, stripStartCuePrefix } from './variety'

describe('kleine Abwechslung', () => {
  it('wählt für dieselbe Zahl immer denselben Satz', () => {
    const list = ['a', 'b', 'c']
    expect(pick(list, 5000)).toBe(pick(list, 5999))
    expect(new Set([0, 1000, 2000].map((seed) => pick(list, seed)))).toEqual(new Set(list))
  })

  it('zeigt den ruhigen Satz nur bei jedem n-ten Block', () => {
    const shown = Array.from({ length: 9 }, (_, i) => showsGentleLine(i * 1000, 3)).filter(Boolean)
    expect(shown).toHaveLength(3)
  })

  it('räumt das Startsignal auf', () => {
    expect(cleanStartCue('Wenn der Kaffee auf dem Tisch steht.')).toBe('der Kaffee auf dem Tisch steht')
    expect(cleanStartCue('  ich am Schreibtisch sitze ')).toBe('ich am Schreibtisch sitze')
    expect(cleanStartCue('Ich starte, wenn das Handy weg ist!')).toBe('das Handy weg ist')
    expect(stripStartCuePrefix('Ich starte wenn das Handy weg ist.')).toBe('das Handy weg ist.')
  })
})
