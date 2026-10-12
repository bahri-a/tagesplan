import { describe, expect, it } from 'vitest'
import { MAX_SCALE, textScale } from './textSize'

describe('Schriftgröße vom iPhone', () => {
  it('Standardgröße (17 pt) ändert nichts', () => {
    expect(textScale(17)).toBe(1)
  })
  it('kleinere Systemschrift macht die App nicht kleiner', () => {
    expect(textScale(14)).toBe(1)
  })
  it('eine Stufe größer (19 pt) wird übernommen', () => {
    expect(textScale(19)).toBeCloseTo(19 / 17)
  })
  it('sehr große Schrift ist auf zwei Stufen gedeckelt', () => {
    expect(textScale(28)).toBe(MAX_SCALE)
  })
  it('unbrauchbare Werte ändern nichts', () => {
    expect(textScale(Number.NaN)).toBe(1)
    expect(textScale(0)).toBe(1)
  })
})
