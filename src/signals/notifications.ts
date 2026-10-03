/**
 * CHROME-BENACHRICHTIGUNGEN
 * =========================
 * Am Ende von Block und Pause erscheint eine Benachrichtigung – aber nur,
 * wenn die App gerade im Hintergrund ist (sonst reicht der Ton).
 */

export type PermissionState = NotificationPermission | 'unsupported'

/**
 * iPhone-App: Dort gibt es keine Chrome-Benachrichtigungen, sondern iPhone-Mitteilungen
 * (signals/nativeNotifications.ts). Ihr Stand wird beim Start abgefragt und hier gemerkt.
 */
let nativePermission: PermissionState = 'default'

export function setNativeNotificationPermission(state: PermissionState): void {
  nativePermission = state
}

/** iPhone-App: Wann wurde die App zuletzt wieder geöffnet? */
let becameVisibleAt = 0
if (__NATIVE_APP__) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') becameVisibleAt = Date.now()
  })
}

/**
 * iPhone-App: Hat die Mitteilung auf dem gesperrten iPhone schon geklingelt? Dann soll die App
 * beim Öffnen nicht noch einmal denselben Ton spielen. (Während die App im Hintergrund ist oder
 * gerade erst wieder geöffnet wurde, kam das Signal von der Mitteilung.)
 */
export function phoneAlreadySignaled(): boolean {
  if (!__NATIVE_APP__ || nativePermission !== 'granted') return false
  return document.visibilityState === 'hidden' || Date.now() - becameVisibleAt < 2000
}

export function notificationPermission(): PermissionState {
  if (__NATIVE_APP__) return nativePermission
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

/** Fragt Chrome (bzw. das iPhone) einmalig um Erlaubnis (nur, solange noch nicht entschieden). */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (__NATIVE_APP__) {
    const { requestNativePermission } = await import('./nativeNotifications')
    return requestNativePermission()
  }
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
  // iPhone-App: Die Mitteilungen sind dort schon im Voraus geplant (nativeNotifications.ts).
  if (__NATIVE_APP__) return
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
