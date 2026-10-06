/**
 * MAC ODER HANDY?
 * Manches gibt es nur auf dem Mac (z. B. das Startsignal). „Handy“ heißt hier: die iPhone-App,
 * und im Browser iPhone, iPad und Android.
 */

/** Erkennt ein Handy oder Tablet am Browser-Kennzeichen (userAgent) und am Touchscreen. */
export function detectMobile(nativeApp: boolean, userAgent: string, maxTouchPoints: number): boolean {
  if (nativeApp) return true
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) return true
  // iPad gibt sich im Browser als Mac aus – hat aber einen Touchscreen.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

/** true auf iPhone, iPad und Android – false auf dem Mac (und anderen Computern). */
export const IS_MOBILE = detectMobile(
  __NATIVE_APP__,
  typeof navigator === 'undefined' ? '' : (navigator.userAgent ?? ''),
  typeof navigator === 'undefined' ? 0 : (navigator.maxTouchPoints ?? 0),
)

/** Startsignal („Ich starte, wenn …“): nur auf dem Mac. */
export const SHOWS_START_CUE = !IS_MOBILE
