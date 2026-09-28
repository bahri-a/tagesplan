/**
 * TÖNE
 * ====
 * Die Töne werden direkt im Browser erzeugt (Web Audio), es gibt keine
 * Tondateien. Jeder Ton ist ein weicher Glockenklang aus mehreren
 * Sinusschwingungen, der sanft ausklingt (ca. 1,5 Sekunden).
 *
 * Zum Anpassen: Die Noten stehen in BLOCK_END_NOTES und BREAK_END_NOTES
 * (Frequenz in Hertz, Startzeit in Sekunden). Lautstärke: SOUND_VOLUME
 * in config/defaults.ts.
 */

import { NOISE_FADE_S, NOISE_VOLUME, SOUND_VOLUME, WARNING_VOLUME } from '../config/defaults'
import type { NoiseColor } from '../model/types'
import { getState } from '../store/store'

/** Einstellung „Töne“: Ist sie aus, bleibt die App komplett still (auch das Rauschen). */
function soundsEnabled(): boolean {
  try {
    return getState().settings.sounds
  } catch {
    return true // Store noch nicht geladen
  }
}

interface Note {
  /** Tonhöhe in Hertz (z. B. 523 = c'') */
  freq: number
  /** Start in Sekunden nach Beginn */
  at: number
}

// Block vorbei: sanft absteigend – „durchatmen“ (c''' → g'' → e'')
const BLOCK_END_NOTES: Note[] = [
  { freq: 1046.5, at: 0 },
  { freq: 784.0, at: 0.18 },
  { freq: 659.3, at: 0.36 },
]

// Pause vorbei: aufsteigend – „los geht's“ (c'' → e'' → g'')
const BREAK_END_NOTES: Note[] = [
  { freq: 523.3, at: 0 },
  { freq: 659.3, at: 0.14 },
  { freq: 784.0, at: 0.28 },
]

// Vorwarnung kurz vor dem Blockende: ein einzelner, tiefer, sehr leiser Ton (g').
const WARNING_NOTES: Note[] = [{ freq: 392.0, at: 0 }]

let ctx: AudioContext | null = null

/**
 * Chrome erlaubt Ton erst nach einem Klick. Deshalb wird diese Funktion
 * bei jedem Klick aufgerufen (siehe App.tsx) – danach klappen Töne auch,
 * wenn das Fenster im Hintergrund ist.
 */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Ohne Ton geht es auch – die Benachrichtigung kommt trotzdem.
  }
}

/** Ein einzelner weicher Glockenton. */
function bell(audio: AudioContext, out: AudioNode, freq: number, start: number) {
  const duration = 1.3
  // Grundton + zwei leise Obertöne ergeben den Glockenklang.
  const partials = [
    { ratio: 1, gain: 1 },
    { ratio: 2, gain: 0.25 },
    { ratio: 3, gain: 0.08 },
  ]
  for (const p of partials) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq * p.ratio
    // Weicher Einsatz (kein Knacken), dann langsames Ausklingen.
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(p.gain, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration / p.ratio)
    osc.connect(gain).connect(out)
    osc.start(start)
    osc.stop(start + duration)
  }
}

function play(notes: Note[], volume = SOUND_VOLUME): void {
  if (!soundsEnabled()) return
  unlockAudio()
  if (!ctx) return
  const master = ctx.createGain()
  master.gain.value = volume / notes.length
  // Leichter Tiefpass: nimmt die Schärfe aus dem Klang.
  const soften = ctx.createBiquadFilter()
  soften.type = 'lowpass'
  soften.frequency.value = 3500
  master.connect(soften).connect(ctx.destination)
  const now = ctx.currentTime + 0.02
  for (const note of notes) bell(ctx, master, note.freq, now + note.at)
}

export function playBlockEnd(): void {
  play(BLOCK_END_NOTES)
}

export function playBreakEnd(): void {
  play(BREAK_END_NOTES)
}

/** Sanfte Vorwarnung: kurz vor dem Blockende, deutlich leiser als die anderen Töne. */
export function playBlockWarning(): void {
  play(WARNING_NOTES, WARNING_VOLUME)
}

/* ------------------------------------------------------------------ */
/* Rauschen im Block                                                  */
/* ------------------------------------------------------------------ */

/**
 * Das Rauschen wird einmal als 12 Sekunden langes Stück berechnet und dann endlos
 * wiederholt (keine Tondatei). Braun = tief und weich, rosa = mittel, weiß = hell.
 */
const NOISE_SECONDS = 12
const noiseBuffers = new Map<NoiseColor, AudioBuffer>()
let noiseSource: AudioBufferSourceNode | null = null
let noiseGain: GainNode | null = null
let noiseColorPlaying: NoiseColor | null = null

function makeNoise(audio: AudioContext, color: NoiseColor): AudioBuffer {
  const length = audio.sampleRate * NOISE_SECONDS
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  // Werte für die Filter von rosa (Paul Kellet) und braun (aufsummiert)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  let brown = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
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
  // Anfang und Ende weich ineinander übergehen lassen, damit beim Wiederholen nichts knackt.
  const fade = Math.floor(audio.sampleRate * 0.05)
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    data[i] = data[i] * k + data[length - fade + i] * (1 - k)
  }
  return buffer
}

/**
 * Schaltet das Rauschen weich ein oder aus. `play = false` blendet aus.
 * Wird mit jeder Änderung von Timer oder Einstellungen aufgerufen (siehe useNoise).
 */
export function setNoise(play: boolean, color: NoiseColor): void {
  const shouldPlay = play && soundsEnabled()
  if (!shouldPlay) {
    stopNoise()
    return
  }
  unlockAudio()
  if (!ctx) return
  if (noiseSource && noiseColorPlaying === color) return
  stopNoise()

  let buffer = noiseBuffers.get(color)
  if (!buffer) {
    buffer = makeNoise(ctx, color)
    noiseBuffers.set(color, buffer)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = ctx.createGain()
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(NOISE_VOLUME, now + NOISE_FADE_S)
  source.connect(gain).connect(ctx.destination)
  source.start()
  noiseSource = source
  noiseGain = gain
  noiseColorPlaying = color
}

function stopNoise(): void {
  if (!ctx || !noiseSource || !noiseGain) return
  const source = noiseSource
  const now = ctx.currentTime
  noiseGain.gain.cancelScheduledValues(now)
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, now)
  noiseGain.gain.linearRampToValueAtTime(0, now + NOISE_FADE_S)
  source.stop(now + NOISE_FADE_S + 0.05)
  noiseSource = null
  noiseGain = null
  noiseColorPlaying = null
}
