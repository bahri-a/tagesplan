/**
 * LINK TEILEN
 * Für „Weiterempfehlen“ und die Fokus-Einladung: das Teilen-Menü des Geräts (iPhone-App,
 * Safari, Handy-Browser). Wo es keins gibt (z. B. Chrome am Mac), wird der Link kopiert.
 */

import { T } from '../config/texts'

/** shared = Teilen-Menü war offen (auch wenn dort abgebrochen), copied = Link liegt in der Zwischenablage. */
export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareLink(text: string, url: string): Promise<ShareResult> {
  if (__NATIVE_APP__) {
    const { shareLinkNative } = await import('./nativeShare')
    return (await shareLinkNative(text, url)) ? 'shared' : 'failed'
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: T.share.title, text, url })
      return 'shared'
    } catch (error) {
      // Abgebrochen: nichts weiter tun. Andere Fehler: lieber kopieren.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
