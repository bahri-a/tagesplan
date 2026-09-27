/**
 * ERZEUGT DIE APP-ICONS (PNG) – ohne Zusatz-Bibliotheken.
 *
 * Motiv: ein ruhiger Timer-Ring mit Punkt in der Mitte.
 * Aufruf (im Projektordner):   node scripts/make-icons.mjs
 * Die Bilder landen in public/icons/. Farben unten anpassbar.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BACKGROUND = [59, 118, 103] // #3b7667 (Akzentfarbe der App)
const FOREGROUND = [255, 255, 255]

/* ---------- Formen (Koordinaten von 0 bis 1) ---------- */

const RING_RADIUS = 0.2
const RING_WIDTH = 0.055
const ARC_DEGREES = 300 // wie weit der Ring „gefüllt“ ist
const DOT_RADIUS = 0.045

/** Liegt der Punkt (x, y) auf dem Ring-Bogen oder dem Mittelpunkt? */
function isForeground(x, y) {
  const dx = x - 0.5
  const dy = y - 0.5
  const dist = Math.hypot(dx, dy)
  if (dist <= DOT_RADIUS) return true

  // Winkel im Uhrzeigersinn, beginnend oben (0° = 12 Uhr).
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI
  const clockwise = (angle + 360) % 360
  if (clockwise <= ARC_DEGREES && Math.abs(dist - RING_RADIUS) <= RING_WIDTH / 2) return true

  // Runde Enden des Bogens.
  for (const deg of [0, ARC_DEGREES]) {
    const rad = (deg * Math.PI) / 180
    const ex = 0.5 + RING_RADIUS * Math.sin(rad)
    const ey = 0.5 - RING_RADIUS * Math.cos(rad)
    if (Math.hypot(x - ex, y - ey) <= RING_WIDTH / 2) return true
  }
  return false
}

/** Abgerundetes Quadrat (für das normale Icon mit transparentem Rand). */
function inRoundedSquare(x, y, inset, radius) {
  const min = inset
  const max = 1 - inset
  if (x < min || x > max || y < min || y > max) return false
  const cx = Math.min(Math.max(x, min + radius), max - radius)
  const cy = Math.min(Math.max(y, min + radius), max - radius)
  return Math.hypot(x - cx, y - cy) <= radius
}

/**
 * Zeichnet ein Icon. Jeder Pixel wird 4×4-fach abgetastet – das ergibt
 * weiche, glatte Kanten.
 * @param fullBleed true = Hintergrund füllt alles (für „maskable“-Icons)
 */
function render(size, fullBleed) {
  const samples = 4
  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0
      let fg = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size
          const y = (py + (sy + 0.5) / samples) / size
          const inside = fullBleed || inRoundedSquare(x, y, 0.09, 0.18)
          if (!inside) continue
          bg++
          if (isForeground(x, y)) fg++
        }
      }
      const total = samples * samples
      const alpha = bg / total
      const mix = bg === 0 ? 0 : fg / bg
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c++) {
        pixels[i + c] = Math.round(BACKGROUND[c] * (1 - mix) + FOREGROUND[c] * mix)
      }
      pixels[i + 3] = Math.round(alpha * 255)
    }
  }
  return encodePng(size, size, pixels)
}

/* ---------- Minimaler PNG-Encoder ---------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // 8 Bit pro Kanal
  header[9] = 6 // RGBA
  // Jede Bildzeile beginnt mit Filter-Byte 0 („kein Filter“).
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- Dateien schreiben ---------- */

const outDir = new URL('../public/icons/', import.meta.url)
mkdirSync(outDir, { recursive: true })

const files = {
  'icon-192.png': render(192, false),
  'icon-512.png': render(512, false),
  'maskable-512.png': render(512, true),
  'apple-touch-icon.png': render(180, true),
}
for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, outDir), data)
  console.log(`✓ public/icons/${name}`)
}
