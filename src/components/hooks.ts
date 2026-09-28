/**
 * Kleine React-Hilfen, die an mehreren Stellen gebraucht werden.
 */

import { useEffect, useLayoutEffect, useState } from 'react'
import { T } from '../config/texts'
import { checkTimer, type TimerEvent } from '../store/actions'
import { getState, subscribeToStore } from '../store/store'
import { appIsInBackground, showNotification } from '../signals/notifications'
import { playBlockEnd, playBlockWarning, playBreakEnd, setNoise } from '../signals/sounds'

/**
 * Liefert die aktuelle Uhrzeit (Millisekunden) und aktualisiert sie
 * regelmäßig (Standard: 4× pro Sekunde), solange `active` wahr ist.
 * Die Restzeit wird daraus immer frisch aus Zeitpunkten berechnet.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  // useLayoutEffect: aktualisiert noch bevor Chrome das Bild zeichnet – kein Flackern.
  useLayoutEffect(() => {
    if (!active) return
    const update = () => setNow(Date.now())
    update()
    const id = setInterval(update, intervalMs)
    // Beim Zurückkehren ins Fenster sofort aktualisieren.
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [active, intervalMs])
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
      showNotification(T.notification.blockEndTitle, T.notification.blockEndBody(event.taskTitle))
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
    const check = () => checkTimer().forEach(signal)

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
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
}
