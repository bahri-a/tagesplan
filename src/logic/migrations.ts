/**
 * DATEN-UPDATES (Migrationen)
 * ===========================
 * Ändert sich das Datenmodell, bringen diese Funktionen ältere Daten auf den
 * neuen Stand – beim Öffnen der Datenbank (siehe `db/database.ts`) und beim
 * Wiederherstellen einer älteren Sicherung (siehe `db/backup.ts`).
 */

import type { Tables } from '../db/database'
import type { Settings, Task } from '../model/types'

/** Eine Aufgabe, wie sie vor Version 2 gespeichert wurde (ohne individuelle Pause). */
type TaskBeforeV2 = Omit<Task, 'shortBreakMinutesOverride'> & { shortBreakMinutesOverride?: number | null }

/** Standardwerte von Version 1 … */
const V1_DEFAULTS = { blockMinutes: 15, shortBreakMinutes: 5 }
/** … und die neuen Standardwerte ab Version 2 (Wunsch vom 28.09.2026). */
const V2_DEFAULTS = { blockMinutes: 25, shortBreakMinutes: 7 }

/** Version 1 → 2: Aufgaben bekommen das Feld für eine individuelle kurze Pause (erst einmal „Standard“). */
export function taskToV2(task: TaskBeforeV2): Task {
  if (task.shortBreakMinutesOverride !== undefined) return task as Task
  return { ...task, shortBreakMinutesOverride: null }
}

/**
 * Version 1 → 2: neue Standardwerte 25 Min. Block und 7 Min. Pause.
 * Angepasst wird nur, was noch auf dem alten Standard (15 bzw. 5) steht –
 * selbst geänderte Werte bleiben, wie sie sind.
 */
export function settingsToV2(settings: Settings, now: number): Settings {
  const blockMinutes =
    settings.blockMinutes === V1_DEFAULTS.blockMinutes ? V2_DEFAULTS.blockMinutes : settings.blockMinutes
  const shortBreakMinutes =
    settings.shortBreakMinutes === V1_DEFAULTS.shortBreakMinutes
      ? V2_DEFAULTS.shortBreakMinutes
      : settings.shortBreakMinutes
  if (blockMinutes === settings.blockMinutes && shortBreakMinutes === settings.shortBreakMinutes) return settings
  return { ...settings, blockMinutes, shortBreakMinutes, updatedAt: now }
}

/** Alle Tabellen einer Sicherung von Version 1 auf Version 2 bringen. */
export function tablesToV2(tables: Tables, now: number): Tables {
  return {
    ...tables,
    tasks: tables.tasks.map(taskToV2),
    settings: tables.settings.map((s) => settingsToV2(s, now)),
  }
}
