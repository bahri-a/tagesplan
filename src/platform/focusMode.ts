/**
 * FOKUS-ANSICHT AM HANDY
 * ======================
 * Läuft ein Block (und du bist in „Heute“), wird das Handy ganz ruhig:
 *  - nur Titel, Ring und der nächste Schritt; die Knöpfe erscheinen nach einem Tippen für ein paar
 *    Sekunden (am Anfang einmal von selbst, damit man es sieht)
 *  - der Bildschirm bleibt an, oben verschwindet die Statusleiste (iPhone-App) bzw. die Seite
 *    läuft im Vollbild (Android im Browser)
 *  - der Ring „atmet“ ganz langsam, und der Bildschirm wird im Lauf des Blocks etwas dunkler
 * Pausiert, in der Pause oder auf einem anderen Reiter ist alles wieder wie gewohnt.
 * Am Mac ändert sich nichts.
 */

import { useEffect } from 'react'
import { FOCUS_CONTROLS_MS, FOCUS_DIM_MAX } from '../config/defaults'
import * as timer from '../logic/timer'
import type { TimerState } from '../model/types'
import { IS_MOBILE } from './device'

/** Ist die Fokus-Ansicht gerade an? (Nur am Handy, nur im laufenden Block, nur in „Heute“.) */
export function isFocusActive(t: TimerState, onToday: boolean): boolean {
  return IS_MOBILE && onToday && t.phase === 'block' && t.pausedAt === null
}

/** Wie dunkel der Bildschirm gerade ist: 0 am Anfang des Blocks, FOCUS_DIM_MAX am Ende. */
export function focusDim(t: TimerState, now: number): number {
  if (t.phase !== 'block' || t.plannedMs <= 0) return 0
  const done = Math.min(1, Math.max(0, timer.blockWorkedMs(t, now) / t.plannedMs))
  return Math.round(done * FOCUS_DIM_MAX * 1000) / 1000
}

/**
 * Vollbild beim Start eines Blocks (Android im Browser). Muss direkt im Klick aufgerufen werden –
 * Browser erlauben Vollbild nur als Antwort auf ein Tippen. iPhone-Safari kann das nicht, die
 * iPhone-App blendet stattdessen die Statusleiste aus.
 */
export function requestFocusFullscreen(): void {
  if (!IS_MOBILE || __NATIVE_APP__) return
  const root = document.documentElement
  if (document.fullscreenElement || typeof root.requestFullscreen !== 'function') return
  root.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined)
}

/** Kurzes Vibrieren am Block- oder Pausenende (iPhone-App und Android). */
export function buzz(): void {
  if (__NATIVE_APP__) {
    void import('./nativeApp').then((m) => m.buzz())
    return
  }
  if (IS_MOBILE) navigator.vibrate?.([160, 110, 160])
}

/** Schaltet die Fokus-Ansicht passend zum Timer an und aus (einmal in App.tsx). */
export function useFocusMode(t: TimerState, onToday: boolean): void {
  const active = isFocusActive(t, onToday)

  // An/aus: Kennzeichen am <html>, Statusleiste, Bildschirm wach halten, Vollbild beenden.
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    root.dataset.focus = 'on'
    const release = keepScreenOn()
    return () => {
      delete root.dataset.focus
      delete root.dataset.focusControls
      root.style.removeProperty('--focus-dim')
      release()
      if (!__NATIVE_APP__ && document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
    }
  }, [active])

  // Knöpfe: nach einem Tippen (und einmal am Anfang) kurz sichtbar.
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    let hideTimer = 0
    const show = () => {
      root.dataset.focusControls = 'shown'
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => delete root.dataset.focusControls, FOCUS_CONTROLS_MS)
    }
    show()
    document.addEventListener('pointerdown', show, true)
    return () => {
      window.clearTimeout(hideTimer)
      document.removeEventListener('pointerdown', show, true)
    }
  }, [active])

  // Langsam dunkler werden: alle 20 Sekunden ein kleines Stück (der Übergang ist weich).
  const dimSource = t.phase === 'block' ? t : null
  useEffect(() => {
    if (!active || !dimSource) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--focus-dim', String(focusDim(dimSource, Date.now())))
    update()
    const id = window.setInterval(update, 20_000)
    return () => window.clearInterval(id)
  }, [active, dimSource])
}

/** Bildschirm bleibt an: iPhone-App über das Plugin, im Browser über die „Wake Lock“-Schnittstelle. */
function keepScreenOn(): () => void {
  if (__NATIVE_APP__) {
    void import('./nativeApp').then((m) => m.setFocusChrome(true))
    return () => void import('./nativeApp').then((m) => m.setFocusChrome(false))
  }
  let lock: WakeLockSentinel | null = null
  let released = false
  const request = () => {
    if (released || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
    navigator.wakeLock.request('screen').then(
      (l) => {
        if (released) void l.release()
        else lock = l
      },
      () => undefined,
    )
  }
  // Beim Zurückkehren in die App ist die Sperre weg – dann neu anfordern.
  const onVisible = () => {
    if (document.visibilityState === 'visible') request()
  }
  request()
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    released = true
    document.removeEventListener('visibilitychange', onVisible)
    void lock?.release().catch(() => undefined)
  }
}
