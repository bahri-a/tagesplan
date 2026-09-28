/**
 * RAUSCHEN BERECHNEN (reine Rechnung, ohne Ton-Ausgabe – deshalb testbar)
 * ======================================================================
 * Liefert die Tonwerte für ein Stück Rauschen, das sich nahtlos endlos wiederholen lässt.
 *  - braun: tief und weich (aufsummiertes weißes Rauschen)
 *  - rosa:  mittel (gefiltert nach Paul Kellet)
 *  - weiß:  hell
 *  - mix („Ultra“): braun → rosa → weiß, jedes NOISE_MIX_SEGMENT_S Sekunden, mit weichen
 *    Übergängen, damit es für das Gehirn nicht zu gleichförmig wird.
 * Die Lautstärken der drei Arten sind grob aneinander angeglichen.
 */

import type { NoiseColor } from '../model/types'

type PureColor = Exclude<NoiseColor, 'mix'>

/** Wie lange ein reines Rauschen berechnet und dann wiederholt wird (Sekunden). */
export const NOISE_LOOP_S = 12
/** Beim Mix: so lange läuft jede Art, bevor die nächste kommt (Sekunden). */
export const NOISE_MIX_SEGMENT_S = 12
/** Weicher Übergang beim Wiederholen und zwischen den Arten im Mix (Sekunden). */
export const NOISE_CROSSFADE_S = 0.3

/** Reihenfolge im Mix. */
export const MIX_ORDER: PureColor[] = ['brown', 'pink', 'white']

/** Rohes Rauschen einer Art (ohne Übergänge). `random` ist austauschbar für Tests. */
export function rawNoise(color: PureColor, length: number, random: () => number = Math.random): Float32Array<ArrayBuffer> {
  const data = new Float32Array(length)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  let brown = 0
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1
    if (color === 'white') {
      data[i] = white * 0.35
    } else if (color === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09
      b6 = white * 0.115926
    } else {
      brown = (brown + 0.02 * white) / 1.02
      data[i] = brown * 3.2
    }
  }
  return data
}

/**
 * Legt Stücke hintereinander in eine Schleife der Länge `segmentLength × Anzahl`.
 * Jedes Stück ist `fade` Werte länger und blendet über diese Länge in das nächste über
 * (am Ende zurück in das erste) – so gibt es nirgends einen harten Sprung.
 */
export function loopSegments(pieces: Float32Array[], segmentLength: number, fade: number): Float32Array<ArrayBuffer> {
  const total = segmentLength * pieces.length
  const out = new Float32Array(total)
  pieces.forEach((piece, s) => {
    for (let j = 0; j < segmentLength + fade; j++) {
      // Einblenden am Anfang, Ausblenden im überstehenden Ende – beides zusammen ergibt 1.
      let gain = 1
      if (j < fade) gain = j / fade
      else if (j >= segmentLength) gain = 1 - (j - segmentLength) / fade
      out[(s * segmentLength + j) % total] += piece[j] * gain
    }
  })
  return out
}

/** Fertige, nahtlos wiederholbare Tonwerte für die gewählte Art. */
export function noiseSamples(color: NoiseColor, sampleRate: number, random: () => number = Math.random): Float32Array<ArrayBuffer> {
  const fade = Math.floor(sampleRate * NOISE_CROSSFADE_S)
  if (color === 'mix') {
    const segment = Math.floor(sampleRate * NOISE_MIX_SEGMENT_S)
    return loopSegments(
      MIX_ORDER.map((c) => rawNoise(c, segment + fade, random)),
      segment,
      fade,
    )
  }
  const length = Math.floor(sampleRate * NOISE_LOOP_S)
  return loopSegments([rawNoise(color, length + fade, random)], length, fade)
}
