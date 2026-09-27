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

import { SOUND_VOLUME } from '../config/defaults'

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

function play(notes: Note[]): void {
  unlockAudio()
  if (!ctx) return
  const master = ctx.createGain()
  master.gain.value = SOUND_VOLUME / notes.length
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
