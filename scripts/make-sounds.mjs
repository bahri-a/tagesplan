/**
 * ERZEUGT DIE TÖNE FÜR DIE IPHONE-MITTEILUNGEN (WAV) – ohne Zusatz-Bibliotheken.
 *
 * In der App entstehen die Töne live im Browser (src/signals/sounds.ts). Eine Mitteilung auf
 * dem gesperrten iPhone braucht dagegen eine fertige Tondatei. Dieses Skript rechnet dieselben
 * weichen Glockenklänge nach und speichert sie als WAV-Dateien im iOS-Projekt.
 *
 * Aufruf (im Projektordner):   node scripts/make-sounds.mjs
 * Ändern sich die Noten in sounds.ts, hier ebenfalls anpassen und neu erzeugen.
 */

import { existsSync, writeFileSync } from 'node:fs'

const RATE = 44100

// Gleiche Noten wie in src/signals/sounds.ts (Frequenz in Hertz, Start in Sekunden).
const BLOCK_END_NOTES = [
  { freq: 1046.5, at: 0 },
  { freq: 784.0, at: 0.18 },
  { freq: 659.3, at: 0.36 },
]
const BREAK_END_NOTES = [
  { freq: 523.3, at: 0 },
  { freq: 659.3, at: 0.14 },
  { freq: 784.0, at: 0.28 },
]

/** Lautstärke der Datei (Spitze). Wie laut es klingt, regelt am iPhone die Klingel-Lautstärke. */
const PEAK = 0.6

/** Ein Glockenton wie in sounds.ts: Grundton + zwei leise Obertöne, weicher Einsatz, Ausklingen. */
function addBell(samples, freq, start) {
  const duration = 1.3
  const partials = [
    { ratio: 1, gain: 1 },
    { ratio: 2, gain: 0.25 },
    { ratio: 3, gain: 0.08 },
  ]
  for (const p of partials) {
    const fadeEnd = duration / p.ratio
    for (let i = 0; i < duration * RATE; i++) {
      const t = i / RATE
      let gain
      if (t < 0.015) gain = (t / 0.015) * p.gain
      else if (t < fadeEnd) gain = p.gain * Math.pow(0.0001 / p.gain, (t - 0.015) / (fadeEnd - 0.015))
      else gain = 0
      const index = Math.round((start + t) * RATE)
      if (index < samples.length) samples[index] += gain * Math.sin(2 * Math.PI * freq * p.ratio * t)
    }
  }
}

/** Leichter Tiefpass (wie in sounds.ts bei 3500 Hz) – nimmt die Schärfe aus dem Klang. */
function lowpass(samples, cutoff) {
  const w = (2 * Math.PI * cutoff) / RATE
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2)
  const cos = Math.cos(w)
  const a0 = 1 + alpha
  const b0 = (1 - cos) / 2 / a0
  const b1 = (1 - cos) / a0
  const b2 = b0
  const a1 = (-2 * cos) / a0
  const a2 = (1 - alpha) / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    samples[i] = y
  }
}

function render(notes) {
  const length = Math.ceil((notes.at(-1).at + 1.4) * RATE)
  const samples = new Float64Array(length)
  for (const note of notes) addBell(samples, note.freq, note.at + 0.02)
  lowpass(samples, 3500)
  const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0)
  return samples.map((v) => (v / peak) * PEAK)
}

/** 16-Bit-Mono-WAV */
function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // Länge des fmt-Abschnitts
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // Mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const outDir = new URL('../ios/App/App/', import.meta.url)
if (!existsSync(outDir)) {
  console.log('Kein iOS-Projekt gefunden (ios/App/App) – erst „npx cap add ios“.')
  process.exit(1)
}
const files = {
  'block_end.wav': render(BLOCK_END_NOTES),
  'break_end.wav': render(BREAK_END_NOTES),
}
for (const [name, samples] of Object.entries(files)) {
  writeFileSync(new URL(name, outDir), encodeWav(samples))
  console.log(`✓ ios/App/App/${name}`)
}
