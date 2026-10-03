/**
 * IPHONE-APP: DATEI TEILEN
 * Schreibt eine Textdatei in den Zwischenspeicher der App und öffnet das Teilen-Menü
 * des iPhones (dort z. B. „In Dateien sichern“ oder AirDrop zum Mac).
 * Wird nur in der iPhone-App geladen.
 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { T } from '../config/texts'

export async function shareTextFile(fileName: string, text: string): Promise<void> {
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  try {
    await Share.share({ title: T.settings.backupShareTitle, files: [uri] })
  } catch {
    // Teilen abgebrochen – nichts zu tun.
  }
}
