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
  /**
   * Startsignal „Ich starte, wenn …“ (z. B. „der Kaffee auf dem Tisch steht“) – oder `null`.
   * Seit 2026-09-28. Fehlt in älteren Daten → `null` (ergänzt beim Laden).
   */
  startCue: string | null
  /**
   * Die Blockanzahl, die beim Start des ersten Blocks geschätzt war – oder `null` (noch nicht
   * gestartet). „Noch ein Block“ ändert nur `estimatedBlocks`, dieser Wert bleibt. Für die
   * Statistik in Version 2 („geschätzt 3 · gebraucht 5“); wird jetzt nirgends angezeigt.
   */
  firstEstimatedBlocks: number | null
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
 * 'completed' = durchgehalten (lief bis zum Ende), 'aborted' = abgebrochen,
 * 'undone' = per „Zurück“ nach „Noch ein Block“ zurückgenommen: zählt NICHT als Block,
 * die gearbeiteten Minuten zählen aber trotzdem mit.
 */
export type BlockStatus = 'completed' | 'aborted' | 'undone'

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

/**
 * Art des Rauschens im Block: braun (tief, weich), rosa (mittel), weiß (hell) oder
 * 'mix' = „Ultra (Mix)“: braun, rosa, weiß im Wechsel (je 5 Sekunden), damit es nicht monoton wird.
 */
export type NoiseColor = 'brown' | 'pink' | 'white' | 'mix'

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
  /** Töne überhaupt an? `false` = komplett still (Timer-Töne, Vorwarnung, Rauschen). Seit 2026-09-28. */
  sounds: boolean
  /** Rauschen während eines laufenden Blocks an? (Knopf in „Heute“ und im Mini-Fenster) */
  noiseOn: boolean
  /** Welches Rauschen. */
  noiseColor: NoiseColor
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
      /** Kam die sanfte Vorwarnung kurz vor dem Ende schon? (Fehlt in älteren Daten = nein.) */
      warned?: boolean
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
  /**
   * Zuletzt per „Noch ein Block“ erhöhte Aufgabe und ihre Schätzung davor – damit man
   * zurück zur Frage „Erledigt oder noch ein Block?“ kann. Fehlt in älteren Daten.
   */
  extraBlock?: ExtraBlockMark | null
}

/** Merkzettel für „Zurück“ nach „Noch ein Block“ (siehe `canUndoExtraBlock`). */
export interface ExtraBlockMark {
  taskId: ID
  previousEstimate: number
}
