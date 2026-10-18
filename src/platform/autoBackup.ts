/**
 * IPHONE-APP: TÄGLICHE SICHERUNG
 * Schreibt einmal am Tag die Sicherung in die Dokumente der App (in der Dateien-App sichtbar,
 * weil Info.plist UIFileSharingEnabled setzt) und räumt alte auf. Kommt auch ins iCloud-Backup.
 * Wird nur in der iPhone-App geladen.
 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { createBackup } from '../db/backup'
import { AUTO_BACKUP_DIR, autoBackupName, autoBackupsToRemove, safetyCopyName } from '../logic/autoBackup'
import { fileDate } from '../logic/time'
import { getState } from '../store/store'
import { markBackupMade } from '../store/actions'

let running = false

/** Heute schon gesichert? Sonst jetzt. Fehler bleiben still – morgen gibt es den nächsten Versuch. */
export async function runDailyBackup(now = Date.now()): Promise<void> {
  if (running) return
  const state = getState()
  // Leere App (z. B. frisch installiert): keine leere Sicherung, die gute verdrängen würde.
  if (Object.keys(state.tasks).length === 0) return
  running = true
  try {
    const name = autoBackupName(fileDate(now))
    const { files } = await Filesystem.readdir({ path: AUTO_BACKUP_DIR, directory: Directory.Documents }).catch(
      () => ({ files: [] }),
    )
    const names = files.map((file) => file.name)
    if (!names.includes(name)) {
      await Filesystem.writeFile({
        path: `${AUTO_BACKUP_DIR}/${name}`,
        data: JSON.stringify(createBackup(state), null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      markBackupMade(now)
      names.push(name)
    }
    for (const old of autoBackupsToRemove(names)) {
      await Filesystem.deleteFile({ path: `${AUTO_BACKUP_DIR}/${old}`, directory: Directory.Documents })
    }
  } catch {
    // Kein Platz o. Ä. – Sichern von Hand geht weiterhin.
  } finally {
    running = false
  }
}

/**
 * Vor dem Wiederherstellen: den jetzigen Stand als Sicherheitskopie in „Sicherungen“ ablegen
 * („tagesplan-vor-wiederherstellen-2026-10-18.json“ – die tägliche Aufräumung lässt sie liegen).
 * Gibt zurück, ob das geklappt hat.
 */
export async function writeSafetyCopy(now = Date.now()): Promise<boolean> {
  try {
    await Filesystem.writeFile({
      path: `${AUTO_BACKUP_DIR}/${safetyCopyName(fileDate(now))}`,
      data: JSON.stringify(createBackup(getState()), null, 2),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return true
  } catch {
    return false
  }
}

/** Beim Start und jedes Mal, wenn die App wieder nach vorn kommt (z. B. am nächsten Morgen). */
export function startDailyBackup(): void {
  void runDailyBackup()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runDailyBackup()
  })
}
