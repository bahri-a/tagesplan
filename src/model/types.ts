/**
 * DATENMODELL
 * ===========
 * So sehen die gespeicherten Daten aus.
 *
 * Damit später eine Synchronisierung (z. B. mit Firebase) möglich ist, gilt:
 *  - Jeder Eintrag hat eine zufällige, weltweit eindeutige ID (UUID).
 *  - Jeder Eintrag merkt sich, wann er erstellt und zuletzt geändert wurde.
 *  - Gelöscht wird nur „weich“: Der Eintrag bekommt `deletedAt` und bleibt
 *    gespeichert. So kann ein anderes Gerät später erfahren, dass er weg ist.
 *  - Alle Tabellen sind flach. Verknüpfungen laufen nur über IDs
 *    (z. B. `taskId` in einem Schritt).
 *
 * Alle Zeitpunkte sind Millisekunden seit 1970 (wie `Date.now()`).
 */

export type ID = string

/** Felder, die JEDER gespeicherte Eintrag hat. */
export interface BaseRecord {
  id: ID
  createdAt: number
  updatedAt: number
  /** Gesetzt, wenn der Eintrag gelöscht wurde. Sonst `null`. */
  deletedAt: number | null
}

/**
 * Ein Tag.
 * Es gibt immer genau einen aktiven Tag („heute“) und genau einen geplanten
 * Tag („morgen“). Beendete Tage bleiben für die Statistik erhalten.
 */
export type DayStatus = 'active' | 'planned' | 'ended'

export interface Day extends BaseRecord {
  status: DayStatus
  /** Wann der Tag zu „heute“ wurde. */
  startedAt: number | null
  /** Wann du auf „Tag beenden“ geklickt hast. */
  endedAt: number | null
  /** Wann an diesem Tag der erste Block gestartet wurde. */
  firstWorkAt: number | null
}

/** Eine Hauptaufgabe – das WAS. */
export interface Task extends BaseRecord {
  /** Zu welchem Tag die Aufgabe gerade gehört (wechselt beim Übertrag). */
  dayId: ID
  title: string
  /** Reihenfolge innerhalb des Tages, beginnend bei 0. */
  position: number
  /** Geschätzte Anzahl Blöcke. */
  estimatedBlocks: number
  /** Individuelle Blocklänge in Minuten – oder `null` für den Standard. */
  blockMinutesOverride: number | null
  /** Individuelle Länge der kurzen Pause in Minuten – oder `null` für den Standard. (Seit Datenbank-Version 2) */
  shortBreakMinutesOverride: number | null
  /** Wann die Aufgabe als erledigt markiert wurde – oder `null`. */
  completedAt: number | null
}

/** Ein kleiner Schritt einer Hauptaufgabe (Checkliste). */
export interface Step extends BaseRecord {
  taskId: ID
  text: string
  position: number
  /** Wann der Schritt abgehakt wurde – oder `null`. */
  doneAt: number | null
}

/**
 * Ein Arbeitsblock – das WIE LANGE.
 * 'completed' = durchgehalten (lief bis zum Ende), 'aborted' = abgebrochen.
 */
export type BlockStatus = 'completed' | 'aborted'

export interface Block extends BaseRecord {
  taskId: ID
  /** An welchem Tag gearbeitet wurde. */
  dayId: ID
  startedAt: number
  endedAt: number
  /** Geplante Länge in Minuten. */
  plannedMinutes: number
  /** Wie lange der Block pausiert war (zählt NICHT als Arbeitszeit). */
  pausedMs: number
  /** Tatsächlich gearbeitete Zeit in Sekunden (ohne Pausen). */
  workedSeconds: number
  status: BlockStatus
}

export type ThemeSetting = 'system' | 'light' | 'dark'

/** Aussehen der Flächen: 'pur' (massiv) oder 'glass' (Milchglas, leicht durchscheinend). */
export type SurfaceSetting = 'pur' | 'glass'

/** Die änderbaren Einstellungen. */
export interface SettingsValues {
  blockMinutes: number
  shortBreakMinutes: number
  defaultBlocksPerTask: number
  maxTasksPerDay: number
  theme: ThemeSetting
  /** Seit 2026-09-28. Fehlt in älteren Daten → Standard aus DEFAULT_SETTINGS. */
  surfaces: SurfaceSetting
}

/** Einstellungen als gespeicherter Eintrag (es gibt genau einen). */
export interface Settings extends BaseRecord, SettingsValues {}

/** Der Notizzettel (es gibt genau einen). */
export interface Note extends BaseRecord {
  text: string
}

/* ------------------------------------------------------------------ */
/* Nur auf diesem Gerät (wird später NICHT synchronisiert)            */
/* ------------------------------------------------------------------ */

/**
 * Der Zustand des Timers. Er wird gespeichert, damit ein laufender Block
 * auch nach dem Schließen oder Neuladen des Fensters korrekt weiterläuft.
 * Der Timer rechnet nur mit Zeitpunkten, nicht mit mitgezählten Sekunden.
 */
export type TimerState =
  | { phase: 'idle' }
  | {
      phase: 'block'
      taskId: ID
      dayId: ID
      startedAt: number
      /** Geplante Blocklänge in Millisekunden. */
      plannedMs: number
      /** Seit wann pausiert – oder `null`, wenn der Block läuft. */
      pausedAt: number | null
      /** Summe aller bisherigen (abgeschlossenen) Pausen. */
      pausedMs: number
    }
  | {
      phase: 'break'
      taskId: ID
      startedAt: number
      durationMs: number
      /** Wurde das Pausenende schon mit Ton gemeldet? */
      endSignaled: boolean
    }

/** Sonstige gerätebezogene Werte. */
export interface LocalState {
  /**
   * An welchem (Kalender-)Tag du bei der Frage „Vorherigen Tag beenden?“
   * auf „Nein“ geklickt hast. Format 'JJJJ-MM-TT'.
   */
  endDayPromptDismissedOn: string | null
}
