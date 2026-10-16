import { describe, expect, it } from 'vitest'
import { ULTRA_RAMP_RINGS, ULTRA_VOLUME, ULTRA_VOLUME_START } from '../config/defaults'
import { ultraVolume } from './sounds'

describe('Ultra-Ton: fängt leise an und wird langsam lauter', () => {
  it('beginnt leise, steigt mit jedem Piepen und bleibt dann bei der Höchstlautstärke', () => {
    expect(ultraVolume(0)).toBeCloseTo(ULTRA_VOLUME_START)
    for (let ring = 1; ring < ULTRA_RAMP_RINGS; ring++) expect(ultraVolume(ring)).toBeGreaterThan(ultraVolume(ring - 1))
    expect(ultraVolume(ULTRA_RAMP_RINGS - 1)).toBeCloseTo(ULTRA_VOLUME)
    expect(ultraVolume(50)).toBeCloseTo(ULTRA_VOLUME)
  })

  it('jeder Schritt ist fürs Ohr gleich groß (immer derselbe Faktor)', () => {
    const factor = ultraVolume(1) / ultraVolume(0)
    for (let ring = 2; ring < ULTRA_RAMP_RINGS; ring++) {
      expect(ultraVolume(ring) / ultraVolume(ring - 1)).toBeCloseTo(factor)
    }
  })
})
