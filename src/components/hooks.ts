/**
 * Kleine React-Hilfen, die an mehreren Stellen gebraucht werden.
 */

import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { T } from '../config/texts'
import { ULTRA_REPEAT_MS } from '../config/defaults'
import { checkTimer, isUltraRinging, type TimerEvent } from '../store/actions'
import { getState, subscribeToStore } from '../store/store'
import { appIsInBackground, showNotification } from '../signals/notifications'
import { playBlockEnd, playBlockWarning, playBreakEnd, playUltraAlarm, setNoise } from '../signals/sounds'

/**
 * In welchem Fenster wird gerade gezeichnet? Normalerweise im App-Fenster; im Mini-Fenster
 * (Bild-im-Bild) in diesem. Wichtig für den Takt: Chrome bremst Zeitgeber in verdeckten
 * Fenstern stark – das Mini-Fenster ist aber immer sichtbar und tickt deshalb selbst.
 */
export const WindowContext = createContext<Window>(window)

/**
 * Liefert die aktuelle Uhrzeit (Millisekunden) und aktualisiert sie
 * regelmäßig (Standard: 4× pro Sekunde), solange `active` wahr ist.
 * Die Restzeit wird daraus immer frisch aus Zeitpunkten berechnet.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  const win = useContext(WindowContext)
  // useLayoutEffect: aktualisiert noch bevor Chrome das Bild zeichnet – kein Flackern.
  useLayoutEffect(() => {
    if (!active) return
    const update = () => setNow(Date.now())
    update()
    const id = win.setInterval(update, intervalMs)
    // Beim Zurückkehren ins Fenster sofort aktualisieren.
    win.document.addEventListener('visibilitychange', update)
    return () => {
      win.clearInterval(id)
      win.document.removeEventListener('visibilitychange', update)
    }
  }, [active, intervalMs, win])
  return now
}

/** Ton + (im Hintergrund) Benachrichtigung für ein Timer-Ereignis. */
function signal(event: TimerEvent): void {
  if (!event.fresh) return
  if (event.type === 'blockWarning') {
    playBlockWarning() // nur ein leiser Ton, keine Benachrichtigung
  } else if (event.type === 'blockEnd') {
    playBlockEnd()
    if (appIsInBackground()) {
      showNotification(
        T.notification.blockEndTitle,
        event.lastBlock ? T.notification.lastBlockEndBody(event.taskTitle) : T.notification.blockEndBody(event.taskTitle),
      )
    }
  } else {
    playBreakEnd()
    if (appIsInBackground()) {
      showNotification(T.notification.breakEndTitle, T.notification.breakEndBody(event.taskTitle))
    }
  }
}

/**
 * Der „Motor“ des Timers – läuft einmal für die ganze App.
 * Ein Web Worker gibt im Sekundentakt Bescheid; dann wird geprüft, ob ein
 * Block oder eine Pause vorbei ist. Der Takt läuft nur, wenn nötig.
 */
export function useTimerEngine(): void {
  useEffect(() => {
    const worker = new Worker(new URL('../logic/ticker.worker.ts', import.meta.url), {
      type: 'module',
    })
    // Ultra-Modus: Solange die fällige Pause nicht bestätigt ist, alle ULTRA_REPEAT_MS piepen.
    // Läuft im selben Sekundentakt wie der Timer – so klappt es auch im Hintergrund.
    let lastUltraAt = 0
    const check = () => {
      checkTimer().forEach(signal)
      const now = Date.now()
      if (isUltraRinging(now) && now - lastUltraAt >= ULTRA_REPEAT_MS - 100) {
        lastUltraAt = now
        playUltraAlarm()
      }
    }

    let ticking = false
    const syncTicking = () => {
      const t = getState().timer
      const shouldTick =
        (t.phase === 'block' && t.pausedAt === null) || (t.phase === 'break' && !t.endSignaled)
      if (shouldTick !== ticking) {
        ticking = shouldTick
        worker.postMessage(shouldTick ? 'start' : 'stop')
      }
    }

    worker.onmessage = check
    check()
    syncTicking()
    const unsubscribe = subscribeToStore(syncTicking)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)

    return () => {
      unsubscribe()
      worker.terminate()
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
}

/**
 * Rauschen: läuft nur, solange ein Block läuft (nicht pausiert, nicht in der Pause),
 * das Rauschen angeschaltet ist und Töne erlaubt sind. Blendet weich ein und aus.
 */
export function useNoise(): void {
  useEffect(() => {
    const update = () => {
      const s = getState()
      const running = s.timer.phase === 'block' && s.timer.pausedAt === null
      setNoise(running && s.settings.noiseOn, s.settings.noiseColor)
    }
    update()
    const unsubscribe = subscribeToStore(update)
    return () => {
      unsubscribe()
      setNoise(false, getState().settings.noiseColor)
    }
  }, [])
}

/** Tippt jemand gerade in ein Feld – oder hat ein Knopf den Fokus? */
export function isTypingOrButton(target: EventTarget | null): boolean {
  // Bewusst ohne `instanceof`: Elemente im Mini-Fenster stammen aus einem anderen Dokument.
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)
}
