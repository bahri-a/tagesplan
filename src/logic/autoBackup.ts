/**
 * TÄGLICHE SICHERUNG (iPhone-App)
 * ===============================
 * Einmal am Tag legt die App still eine Sicherung in „Dateien › Auf meinem iPhone › Tagesplan ›
 * Sicherungen“ ab. Es bleiben die letzten 7 Tage, dazu je die neueste der letzten 4 Wochen und der
 * letzten 6 Monate (höchstens 17 Dateien) – so reicht es weit zurück, falls ein Fehler spät auffällt.
 * Hier steht nur die reine Logik (Dateinamen, was weg darf) – das Schreiben steht in
 * platform/autoBackup.ts.
 */

/** Ordner in den Dokumenten der App (in der Dateien-App unter „Tagesplan“). */
export const AUTO_BACKUP_DIR = 'Sicherungen'

/** So viele bleiben liegen: die neuesten Tage, dazu je die neueste Datei so vieler Wochen und Monate. */
export const AUTO_BACKUP_KEEP = { daily: 7, weekly: 4, monthly: 6 }

const NAME = /^tagesplan-(\d{4}-\d{2}-\d{2})\.json$/

/** Dateiname für einen Tag, z. B. „tagesplan-2026-10-12.json“. */
export function autoBackupName(day: string): string {
  return `tagesplan-${day}.json`
}

/** Sicherheitskopie vor dem Wiederherstellen, z. B. „tagesplan-vor-wiederherstellen-2026-10-18.json“. */
export function safetyCopyName(day: string): string {
  return `tagesplan-vor-wiederherstellen-${day}.json`
}

/** Montag der Woche eines Tages („2026-10-14“ → „2026-10-12“) – Wochen beginnen am Montag. */
function weekOf(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

/**
 * Welche Dateien dürfen weg? Alle automatischen Sicherungen außer den neuesten `daily`, der
 * neuesten je Woche der letzten `weekly` Wochen und der neuesten je Monat der letzten `monthly`
 * Monate (gezählt werden Wochen und Monate, in denen es eine Sicherung gibt).
 * Andere Dateien im Ordner (z. B. von Hand abgelegt) bleiben unberührt.
 */
export function autoBackupsToRemove(names: string[], keep = AUTO_BACKUP_KEEP): string[] {
  const newestFirst = names.filter((name) => NAME.test(name)).sort().reverse()
  const kept = new Set(newestFirst.slice(0, keep.daily))
  const newestPer = (period: (day: string) => string, count: number) => {
    const seen = new Set<string>()
    for (const name of newestFirst) {
      const key = period(NAME.exec(name)![1])
      if (seen.has(key)) continue
      if (seen.size === count) break
      seen.add(key)
      kept.add(name)
    }
  }
  newestPer(weekOf, keep.weekly)
  newestPer((day) => day.slice(0, 7), keep.monthly)
  return newestFirst.filter((name) => !kept.has(name))
}
