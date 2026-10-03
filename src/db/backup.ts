/**
 * SICHERN UND WIEDERHERSTELLEN
 * ============================
 * „Sichern“ schreibt ALLE Daten in eine JSON-Datei (lesbarer Text).
 * „Wiederherstellen“ liest so eine Datei und ersetzt damit alle Daten.
 * Der laufende Timer wird dabei nicht mitgesichert.
 */

import { APP_NAME } from '../config/defaults'
import { tablesToV2 } from '../logic/migrations'
import { fileDate } from '../logic/time'
import { getState, reloadStore, type AppState } from '../store/store'
import { replaceAll, TABLE_NAMES, type Tables } from './database'

/** Kennung, damit wir nur echte Tagesplan-Sicherungen einlesen. */
const BACKUP_APP_ID = 'tagesplan'

/**
 * Version des Sicherungsformats. Erhöhen, wenn sich das Datenmodell ändert.
 * 2 = mit individueller kurzer Pause pro Aufgabe (ältere Sicherungen werden beim Wiederherstellen angepasst).
 */
const BACKUP_SCHEMA_VERSION = 2

export interface BackupFile {
  app: typeof BACKUP_APP_ID
  schemaVersion: number
  /** Zeitpunkt der Sicherung (ISO-Format) */
  exportedAt: string
  data: Tables
}

/** Erstellt die Sicherung aus dem aktuellen Zustand (inkl. gelöschter Einträge). */
export function createBackup(state: AppState = getState()): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      days: Object.values(state.days),
      tasks: Object.values(state.tasks),
      steps: Object.values(state.steps),
      blocks: Object.values(state.blocks),
      settings: [state.settings],
      notes: [state.note],
    },
  }
}

/**
 * Lädt die Sicherung als Datei herunter (landet im Ordner „Downloads“).
 * In der iPhone-App öffnet sich stattdessen das Teilen-Menü („In Dateien sichern“, AirDrop …).
 */
export function downloadBackup(): void {
  const json = JSON.stringify(createBackup(), null, 2)
  const fileName = `${APP_NAME.toLowerCase()}-sicherung-${fileDate(Date.now())}.json`
  if (__NATIVE_APP__) {
    void import('../platform/nativeShare').then((m) => m.shareTextFile(fileName, json))
    return
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Kurz warten, damit Chrome den Download sicher gestartet hat.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Prüft den Inhalt einer Sicherungsdatei.
 * Gibt die Sicherung zurück – oder `null`, wenn die Datei nicht passt.
 */
export function parseBackup(text: string): BackupFile | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!isObject(parsed) || parsed.app !== BACKUP_APP_ID) return null
  if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion > BACKUP_SCHEMA_VERSION) return null
  if (typeof parsed.exportedAt !== 'string' || !isObject(parsed.data)) return null
  const data = parsed.data
  for (const name of TABLE_NAMES) {
    const table = data[name]
    if (!Array.isArray(table)) return null
    if (!table.every((record) => isObject(record) && typeof record.id === 'string')) return null
  }
  return parsed as unknown as BackupFile
}

/** Ersetzt alle Daten durch die Sicherung und lädt die App-Daten neu. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  // Ältere Sicherungen erst auf den aktuellen Stand bringen.
  const data = backup.schemaVersion < 2 ? tablesToV2(backup.data, Date.now()) : backup.data
  await replaceAll(data)
  await reloadStore()
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
