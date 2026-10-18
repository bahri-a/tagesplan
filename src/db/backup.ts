/**
 * SICHERN UND WIEDERHERSTELLEN
 * ============================
 * „Sichern“ schreibt ALLE Daten in eine JSON-Datei (lesbarer Text).
 * „Wiederherstellen“ liest so eine Datei und ersetzt damit alle Daten.
 * Der laufende Timer wird dabei nicht mitgesichert.
 * Seit 2026-10: auch die Einstellungen der „Vorschläge“ aus dem Browser-Speicher
 * (ausgeblendet, aufgeschoben, Kurztitel, „max. N“) – als `deviceData`. Ältere Sicherungen
 * haben das nicht; dann bleiben diese Werte beim Wiederherstellen, wie sie sind.
 * Vor dem Ersetzen zeigt die Frage, was in der Sicherung und was in der App steckt
 * (`summarizeTables`), und ob die App neuere Daten hat (`latestChange`).
 */

import { APP_NAME } from '../config/defaults'
import { deviceStorage } from '../logic/deviceStorage'
import { tablesToV2 } from '../logic/migrations'
import { exportOwnData, importOwnData } from '../logic/projectSuggestions'
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
  /** Werte aus dem Browser-Speicher (Vorschläge). Fehlt in älteren Sicherungen. */
  deviceData?: Record<string, unknown>
}

/** Erstellt die Sicherung aus dem aktuellen Zustand (inkl. gelöschter Einträge). */
export function createBackup(state: AppState = getState(), storage: Storage = deviceStorage()): BackupFile {
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
    deviceData: exportOwnData(storage),
  }
}

/**
 * Lädt die Sicherung als Datei herunter (landet im Ordner „Downloads“).
 * In der iPhone-App öffnet sich stattdessen das Teilen-Menü („In Dateien sichern“, AirDrop …).
 */
export function downloadBackup(label = 'sicherung'): void {
  const json = JSON.stringify(createBackup(), null, 2)
  const fileName = `${APP_NAME.toLowerCase()}-${label}-${fileDate(Date.now())}.json`
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

type Check = (record: Record<string, unknown>) => boolean

const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const isString = (value: unknown) => typeof value === 'string'
const isNumberOrNull = (value: unknown) => value === null || isNumber(value)

/** Pflichtfelder je Tabelle – was die App zum Laufen braucht. Weitere Felder sind erlaubt. */
const RECORD_CHECKS: Record<keyof Tables, Check> = {
  days: (r) => ['active', 'planned', 'ended'].includes(r.status as string),
  tasks: (r) => isString(r.dayId) && isString(r.title) && isNumber(r.position) && isNumberOrNull(r.completedAt),
  steps: (r) => isString(r.taskId) && isString(r.text) && isNumber(r.position),
  blocks: (r) => isString(r.dayId) && isString(r.taskId) && isString(r.status) && isNumber(r.workedSeconds),
  settings: (r) => isNumber(r.blockMinutes) && isNumber(r.shortBreakMinutes),
  notes: (r) => isString(r.text),
}

/**
 * Prüft den Inhalt einer Sicherungsdatei – jeden Eintrag mit seinen Pflichtfeldern, genau eine
 * Einstellung und ein Notizzettel, ein „Heute“ und ein „Morgen“.
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
  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt))) return null
  if (!isObject(parsed.data)) return null
  if (parsed.deviceData !== undefined && !isObject(parsed.deviceData)) return null
  const data = parsed.data
  for (const name of TABLE_NAMES) {
    const table = data[name]
    if (!Array.isArray(table)) return null
    const valid = table.every(
      (record) =>
        isObject(record) &&
        isString(record.id) &&
        isNumber(record.updatedAt) &&
        isNumberOrNull(record.deletedAt ?? null) &&
        RECORD_CHECKS[name](record),
    )
    if (!valid) return null
  }
  if ((data.settings as unknown[]).length !== 1 || (data.notes as unknown[]).length !== 1) return null
  const liveDays = (data.days as Record<string, unknown>[]).filter((d) => (d.deletedAt ?? null) === null)
  if (!liveDays.some((d) => d.status === 'active') || !liveDays.some((d) => d.status === 'planned')) return null
  return parsed as unknown as BackupFile
}

/** Was steckt drin? Lebende Tage, Hauptaufgaben und durchgehaltene Blöcke. */
export interface TablesSummary {
  days: number
  tasks: number
  blocks: number
}

export function summarizeTables(data: Tables): TablesSummary {
  const live = <T extends { deletedAt: number | null }>(records: T[]) => records.filter((r) => r.deletedAt === null)
  return {
    days: live(data.days).length,
    tasks: live(data.tasks).length,
    blocks: live(data.blocks).filter((b) => b.status === 'completed').length,
  }
}

/** Die jüngste Änderung (größtes `updatedAt`) in allen Tabellen. */
export function latestChange(data: Tables): number {
  let latest = 0
  for (const name of TABLE_NAMES) for (const record of data[name]) latest = Math.max(latest, record.updatedAt)
  return latest
}

/** Hat die App neuere Daten als die Sicherung (geändert nach dem Zeitpunkt der Sicherung)? */
export function appIsNewer(backup: BackupFile, state: AppState = getState()): boolean {
  return latestChange(createBackup(state).data) > Date.parse(backup.exportedAt)
}

/** Ersetzt alle Daten durch die Sicherung und lädt die App-Daten neu. */
export async function restoreBackup(backup: BackupFile, storage: Storage = deviceStorage()): Promise<void> {
  // Ältere Sicherungen erst auf den aktuellen Stand bringen.
  const data = backup.schemaVersion < 2 ? tablesToV2(backup.data, Date.now()) : backup.data
  await replaceAll(data)
  if (backup.deviceData) importOwnData(storage, backup.deviceData)
  await reloadStore()
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
