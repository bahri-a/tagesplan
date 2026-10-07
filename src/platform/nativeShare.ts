/**
 * IPHONE-APP: TEILEN
 * Schreibt eine Textdatei in den Zwischenspeicher der App und öffnet das Teilen-Menü
 * des iPhones (dort z. B. „In Dateien sichern“ oder AirDrop zum Mac). Auch für Links
 * (Weiterempfehlen, Fokus-Einladung).
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

/** Teilen-Menü mit Text und Link. false, wenn es nicht aufging. */
export async function shareLinkNative(text: string, url: string): Promise<boolean> {
  try {
    await Share.share({ title: T.share.title, text, url })
  } catch (error) {
    // Abgebrochen zählt nicht als Fehler – nur, wenn Teilen gar nicht geht.
    return /cancel/i.test(String(error))
  }
  return true
}
