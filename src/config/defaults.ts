/**
 * ZENTRALE STANDARDWERTE
 * ======================
 * Hier stehen alle Zahlen, die du vielleicht einmal ändern möchtest.
 * Die App liest diese Werte an allen Stellen von hier – du musst also
 * nur diese Datei anpassen.
 *
 * Hinweis: Die Werte unter DEFAULT_SETTINGS gelten nur beim allerersten
 * Start. Danach änderst du sie bequem in der App unter „Einstellungen“.
 */

import type { SettingsValues } from '../model/types'

/** Name der App (Fenstertitel, Sicherungsdatei …). */
export const APP_NAME = 'Tagesplan'

/** Startwerte für die Einstellungen (beim ersten Öffnen der App). */
export const DEFAULT_SETTINGS: SettingsValues = {
  /** Länge eines Arbeitsblocks in Minuten. */
  blockMinutes: 25,
  /** Länge der kurzen Pause nach einem Block in Minuten. */
  shortBreakMinutes: 7,
  /** Wie viele Blöcke eine neue Hauptaufgabe zunächst bekommt. */
  defaultBlocksPerTask: 3,
  /** Ab wie vielen Hauptaufgaben pro Tag ein sanfter Hinweis erscheint. */
  maxTasksPerDay: 3,
  /** Aussehen: 'system' (wie macOS), 'light' (hell) oder 'dark' (dunkel). */
  theme: 'system',
  /** Flächen: 'pur' (massiv) oder 'glass' (Milchglas). */
  surfaces: 'pur',
}

/** Erlaubte Bereiche für die Zahlen in den Einstellungen. */
export const SETTINGS_LIMITS = {
  blockMinutes: { min: 1, max: 240 },
  shortBreakMinutes: { min: 1, max: 60 },
  defaultBlocksPerTask: { min: 1, max: 20 },
  maxTasksPerDay: { min: 1, max: 20 },
} as const

/**
 * Ab welcher Uhrzeit ein neuer Kalendertag beginnt – NUR für die freundliche
 * Frage „Möchtest du den vorherigen Tag beenden?“. Mit 4 Uhr wird Arbeit
 * nach Mitternacht noch zum alten Tag gezählt. Der Tag endet trotzdem nie
 * automatisch.
 */
export const DAY_ROLLOVER_HOUR = 4

/**
 * Töne und Benachrichtigungen kommen nur, wenn das Ereignis (Block- oder
 * Pausenende) höchstens so lange her ist. War die App länger zu, gibt es
 * beim Öffnen keinen verspäteten Ton.
 */
export const SIGNAL_MAX_DELAY_MS = 90_000

/** Lautstärke der Töne (0 = stumm, 1 = sehr laut). */
export const SOUND_VOLUME = 0.22

/** Wie lange nach dem Tippen der Notizzettel gespeichert wird (Millisekunden). */
export const NOTE_SAVE_DELAY_MS = 400

/**
 * Wie lange ein abgehakter Schritt unter dem Timer noch mit Haken zu sehen ist,
 * bevor der nächste erscheint (Millisekunden) – ein kleines Erfolgserlebnis.
 */
export const STEP_DONE_FEEDBACK_MS = 900

/** Wie lange nach dem Löschen einer Aufgabe „Rückgängig“ angeboten wird (Millisekunden). */
export const UNDO_DELETE_MS = 8000
