/**
 * Hilfsfunktionen rund um Datum und Zeit.
 */

import { DAY_ROLLOVER_HOUR } from '../config/defaults'

const HOUR_MS = 60 * 60 * 1000

/**
 * Gibt den „Kalendertag“ eines Zeitpunkts als 'JJJJ-MM-TT' zurück.
 * Der Tageswechsel liegt dabei nicht um Mitternacht, sondern um
 * DAY_ROLLOVER_HOUR (Standard: 4 Uhr). 2:30 Uhr nachts zählt also noch
 * zum Vortag.
 */
export function dayKey(timestamp: number, rolloverHour = DAY_ROLLOVER_HOUR): string {
  const shifted = new Date(timestamp - rolloverHour * HOUR_MS)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const d = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Formatiert Millisekunden als Countdown „mm:ss“ (bzw. „h:mm:ss“). */
export function formatCountdown(ms: number): string {
  // Aufrunden, damit „0:00“ erst am echten Ende erscheint.
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
  return `${minutes}:${ss}`
}

/** z. B. „Montag, 27. September“ – für den Rückblick auf den Tag, der anhand
 *  von dayKey() bestimmt wurde. */
export function formatDayName(timestamp: number, rolloverHour = DAY_ROLLOVER_HOUR): string {
  const shifted = new Date(timestamp - rolloverHour * HOUR_MS)
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(shifted)
}

/** Datum für Dateinamen, z. B. „2026-09-28“ (echter Kalendertag, ohne 4-Uhr-Regel). */
export function fileDate(timestamp: number): string {
  return dayKey(timestamp, 0)
}
