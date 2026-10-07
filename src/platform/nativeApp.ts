/**
 * IPHONE-APP: START
 * =================
 * Alles, was nur in der iPhone-App (Capacitor) gebraucht wird. Wird in main.tsx nur dann
 * geladen – die Web-App am Mac enthält diesen Code gar nicht.
 */
import { KeepAwake } from '@capacitor-community/keep-awake'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { Animation, StatusBar, Style } from '@capacitor/status-bar'
import { startNativeNotifications } from '../signals/nativeNotifications'

export function initNativeApp(): void {
  // Kein Hineinzoomen beim Tippen in Felder und kein Zoomen mit zwei Fingern – wie eine echte App.
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
  const root = document.documentElement
  root.dataset.native = 'ios'
  // Ohne die Leiste „˄ ˅ ✓“ über der Tastatur – ruhiger, „Fertig“ gibt es über Enter.
  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => undefined)
  // Ist die Tastatur offen, verschwinden die Eckknöpfe (sie lägen sonst über den Feldern).
  void Keyboard.addListener('keyboardWillShow', () => (root.dataset.keyboard = 'open'))
  void Keyboard.addListener('keyboardWillHide', () => delete root.dataset.keyboard)
  void startNativeNotifications()
}

/** Startbildschirm ausblenden – sobald die App zum ersten Mal gezeichnet ist. */
export function hideSplash(): void {
  requestAnimationFrame(() => void SplashScreen.hide())
}

/**
 * Uhrzeit und Akku oben passend einfärben: helle Schrift auf dunklem Hintergrund und umgekehrt.
 * `background` ist die fertig berechnete Hintergrundfarbe, z. B. „rgb(244, 242, 238)“.
 */
export function updateStatusBar(background: string): void {
  const [r, g, b] = (background.match(/\d+(\.\d+)?/g) ?? ['255', '255', '255']).map(Number)
  const isDark = 0.299 * r + 0.587 * g + 0.114 * b < 128
  void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => undefined)
}

/**
 * Fokus-Ansicht im Block: Statusleiste (Uhrzeit, Akku) ausblenden und den Bildschirm wach halten –
 * danach wieder wie gewohnt. Braucht keine Erlaubnis.
 */
export function setFocusChrome(on: boolean): void {
  if (on) {
    void StatusBar.hide({ animation: Animation.Fade }).catch(() => undefined)
    void KeepAwake.keepAwake().catch(() => undefined)
  } else {
    void StatusBar.show({ animation: Animation.Fade }).catch(() => undefined)
    void KeepAwake.allowSleep().catch(() => undefined)
  }
}

/** Kurzes, deutliches Vibrieren (Block- oder Pausenende). */
export function buzz(): void {
  void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined)
}

/** Leichtes Antippen (Starten, Schritt abhaken) oder kleines Erfolgs-Vibrieren (Erledigt). */
export function haptic(kind: 'tap' | 'success'): void {
  const done =
    kind === 'tap'
      ? Haptics.impact({ style: ImpactStyle.Light })
      : Haptics.notification({ type: NotificationType.Success })
  void done.catch(() => undefined)
}
