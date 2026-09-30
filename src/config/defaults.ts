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
  /** Farbwelt: 'salbei' (Standard), 'fjord', 'rose' oder 'lavendel'. */
  palette: 'salbei',
  /** Töne an (Timer-Töne, Vorwarnung, Rauschen). */
  sounds: true,
  /** Rauschen im Block – anfangs aus, der Knopf in „Heute“ schaltet es an. */
  noiseOn: false,
  /** Braunes Rauschen: tief und weich. */
  noiseColor: 'brown',
  /** Ultra-Modus (nerviger Ton bei fälliger Pause) – anfangs aus. */
  ultraMode: false,
  /** In „Zuletzt verwendet“ ausgeblendete Aufgaben – am Anfang keine. */
  recentHidden: {},
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

/**
 * Sanfte Vorwarnung: so lange vor dem Blockende (Millisekunden) kommt ein ganz leiser Ton,
 * und der Ring wird etwas wärmer. Bei sehr kurzen Blöcken (höchstens doppelt so lang) entfällt sie.
 */
export const BLOCK_WARNING_MS = 2 * 60_000

/** Lautstärke der Vorwarnung (deutlich leiser als die anderen Töne). */
export const WARNING_VOLUME = 0.08

/** Ultra-Modus: so oft (Millisekunden) piept es, bis die Pause bestätigt ist. */
export const ULTRA_REPEAT_MS = 2000

/** Um so viel (Millisekunden) schiebt „+2 Min.“ die kurze Pause auf (in jedem Modus). */
export const BREAK_SNOOZE_MS = 2 * 60_000

/** Lautstärke des Ultra-Tons (bewusst deutlich lauter und schärfer als die Glocken). */
export const ULTRA_VOLUME = 0.3

/** Lautstärke des Rauschens (0 = stumm, 1 = sehr laut). */
export const NOISE_VOLUME = 0.12

/** Probehören des Rauschens in den Einstellungen: so lange (Sekunden). */
export const NOISE_PREVIEW_S = 2.5

/** Wie lange das Rauschen beim Ein- und Ausschalten weich ein-/ausblendet (Sekunden). */
export const NOISE_FADE_S = 1.5

/**
 * Der Startsatz „Abschweifen ist okay …“ erscheint im Block nicht immer, sondern ab und zu:
 * ungefähr bei jedem so-vielten Block (gewählt nach der Startzeit – also zufällig, aber stabil).
 */
export const GENTLE_LINE_EVERY = 3

/** Wie lange nach Taste N die Meldung „Geparkt“ zu sehen ist (Millisekunden). */
export const PARKED_TOAST_MS = 2500

/** Größe des Mini-Fensters (Bild-im-Bild) beim Öffnen – danach frei ziehbar. */
export const MINI_WINDOW_SIZE = { width: 300, height: 380 }

/**
 * Nach „Noch ein Block“ gibt es oben links in der Karte „Zurück“ zur Frage „Erledigt oder
 * noch ein Block?“ – bis der Block startet und danach noch so lange, wie in diesem Block
 * gearbeitet wurde (ohne Pausen, Millisekunden). Später hilft „Früher fertig“.
 */
export const UNDO_EXTRA_BLOCK_MS = 3 * 60_000

/** Wie viele Hauptaufgaben „Zuletzt verwendet“ in „Planen“ zeigt. */
export const RECENT_TASKS_COUNT = 5

/** Wie viele „Vorschläge“ aus der App „Projekte“ in „Planen“ höchstens stehen. */
export const SUGGESTIONS_COUNT = 8

/** Wie lange nach dem Löschen einer Aufgabe „Rückgängig“ angeboten wird (Millisekunden). */
export const UNDO_DELETE_MS = 8000
