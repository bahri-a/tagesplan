/**
 * CHROME-BENACHRICHTIGUNGEN
 * =========================
 * Am Ende von Block und Pause erscheint eine Benachrichtigung – aber nur,
 * wenn die App gerade im Hintergrund ist (sonst reicht der Ton).
 */

export type PermissionState = NotificationPermission | 'unsupported'

export function notificationPermission(): PermissionState {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

/** Fragt Chrome einmalig um Erlaubnis (nur, solange noch nicht entschieden). */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (notificationPermission() !== 'default') return notificationPermission()
  try {
    return await Notification.requestPermission()
  } catch {
    return notificationPermission()
  }
}

/** Ist die App gerade nicht im Blick (anderes Fenster vorne oder minimiert)? */
export function appIsInBackground(): boolean {
  return document.visibilityState === 'hidden' || !document.hasFocus()
}

export function showNotification(title: string, body: string): void {
  if (notificationPermission() !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      // Wir spielen unseren eigenen, sanften Ton – macOS soll keinen zweiten spielen.
      silent: true,
      // Eine neue Benachrichtigung ersetzt die vorige.
      tag: 'tagesplan-timer',
    })
    // Klick auf die Benachrichtigung holt die App nach vorne.
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Benachrichtigungen sind ein Extra – ohne geht es auch.
  }
}
