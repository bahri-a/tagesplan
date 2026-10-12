/**
 * TÄGLICHE SICHERUNG (iPhone-App)
 * ===============================
 * Einmal am Tag legt die App still eine Sicherung in „Dateien › Auf meinem iPhone › Tagesplan ›
 * Sicherungen“ ab. Die letzten AUTO_BACKUP_KEEP bleiben, ältere werden gelöscht.
 * Hier steht nur die reine Logik (Dateinamen, was weg darf) – das Schreiben steht in
 * platform/autoBackup.ts.
 */

/** Ordner in den Dokumenten der App (in der Dateien-App unter „Tagesplan“). */
export const AUTO_BACKUP_DIR = 'Sicherungen'

/** So viele Tage bleiben liegen. */
export const AUTO_BACKUP_KEEP = 7

const NAME = /^tagesplan-(\d{4}-\d{2}-\d{2})\.json$/

/** Dateiname für einen Tag, z. B. „tagesplan-2026-10-12.json“. */
export function autoBackupName(day: string): string {
  return `tagesplan-${day}.json`
}

/**
 * Welche Dateien dürfen weg? Alle automatischen Sicherungen außer den neuesten `keep`.
 * Andere Dateien im Ordner (z. B. von Hand abgelegt) bleiben unberührt.
 */
export function autoBackupsToRemove(names: string[], keep = AUTO_BACKUP_KEEP): string[] {
  return names
    .filter((name) => NAME.test(name))
    .sort()
    .reverse()
    .slice(keep)
}
