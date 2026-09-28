import { describe, expect, it } from 'vitest'
import { loopSegments, NOISE_LOOP_S, NOISE_MIX_SEGMENT_S, noiseSamples } from './noise'

const RATE = 8000

/** Wie stark sich benachbarte Werte unterscheiden: hell (weiß) groß, tief (braun) klein. */
function roughness(data: Float32Array, from: number, to: number): number {
  let sum = 0
  // Auf ganze Stellen runden (z. B. 96000 · 2,2 ergibt sonst 211200,00000000003).
  from = Math.round(from)
  to = Math.round(to)
  for (let i = from + 1; i < to; i++) sum += Math.abs(data[i] - data[i - 1])
  return sum / (to - from)
}

describe('Rauschen', () => {
  it('ein reines Rauschen ist eine Schleife von 12 Sekunden', () => {
    expect(noiseSamples('brown', RATE)).toHaveLength(RATE * NOISE_LOOP_S)
  })

  it('Ultra (Mix): braun, rosa, weiß – je 12 Sekunden hintereinander', () => {
    const mix = noiseSamples('mix', RATE)
    const seg = RATE * NOISE_MIX_SEGMENT_S
    expect(mix).toHaveLength(3 * seg)
    // Mitte jedes Abschnitts ansehen (ohne die Übergänge)
    const brown = roughness(mix, seg * 0.2, seg * 0.8)
    const pink = roughness(mix, seg * 1.2, seg * 1.8)
    const white = roughness(mix, seg * 2.2, seg * 2.8)
    expect(brown).toBeLessThan(pink)
    expect(pink).toBeLessThan(white)
    expect(mix.every((v) => Number.isFinite(v) && Math.abs(v) < 2)).toBe(true)
  })

  it('Übergänge sind weich: ein gleichbleibendes Signal bleibt überall gleich', () => {
    const one = () => new Float32Array(15).fill(1)
    // 3 Stücke à 10 Werte, 5 Werte Übergang → überall genau 1, auch an der Nahtstelle zum Anfang
    expect(Array.from(loopSegments([one(), one(), one()], 10, 5))).toEqual(new Array(30).fill(1))
  })
})
