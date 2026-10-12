/**
 * TIMER-MOTOR
 * ===========
 * Läuft einmal für die ganze App (in App.tsx): prüft im Sekundentakt, ob ein Block oder eine
 * Pause vorbei ist, und gibt dann Bescheid – Ton, Vibration, Mitteilung, VoiceOver-Ansage.
 * Dazu das Rauschen im Block. Die Oberfläche zeigt nur an; das Signalisieren passiert hier.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { SLEEP_GAP_MS, ULTRA_REPEAT_MS } from '../config/defaults'
import { T } from '../config/texts'
import { announce } from '../components/announce'
import { IS_MOBILE } from '../platform/device'
import { buzz } from '../platform/focusMode'
import { checkTimer, isUltraRinging, pauseForSleep, type TimerEvent } from '../store/actions'
import { getState, subscribeToStore } from '../store/store'
import { appIsInBackground, phoneAlreadySignaled, showNotification } from './notifications'
import { playBlockEnd, playBlockWarning, playBreakEnd, playUltraAlarm, setNoise } from './sounds'

/** Block- oder Pausenende, nachdem die Mitteilung beim gesperrten iPhone schon geklingelt hat. */
export interface WakeEvent {
  kind: 'blockEnd' | 'breakEnd'
  title: string
  body: string
}

/** Ton + (im Hintergrund) Benachrichtigung für ein Timer-Ereignis. */
function signal(event: TimerEvent, onWake?: (e: WakeEvent) => void): void {
  if (!event.fresh) return
  // VoiceOver: dasselbe als Satz – unabhängig davon, ob Töne an sind.
  announce(T.a11y[event.type](event.lastBlock === true))
  // iPhone-App: Die Mitteilung hat schon geklingelt – kein doppelter Ton, aber ein auffälliges
  // Pop-up beim Zurückkehren, damit es nicht in der stillen Mitteilung untergeht.
  if (event.type !== 'blockWarning' && phoneAlreadySignaled()) {
    if (event.type === 'blockEnd') {
      onWake?.({
        kind: 'blockEnd',
        title: T.notification.blockEndTitle,
        body: event.lastBlock ? T.notification.lastBlockEndBody(event.taskTitle) : T.notification.blockEndBody(event.taskTitle),
      })
    } else if (event.type === 'breakEnd') {
      onWake?.({ kind: 'breakEnd', title: T.notification.breakEndTitle, body: T.notification.breakEndBody(event.taskTitle) })
    }
    return
  }
  if (event.type === 'blockWarning') {
    playBlockWarning() // nur ein leiser Ton, keine Benachrichtigung
  } else if (event.type === 'blockEnd') {
    playBlockEnd()
    buzz()
    if (appIsInBackground()) {
      showNotification(
        T.notification.blockEndTitle,
        event.lastBlock ? T.notification.lastBlockEndBody(event.taskTitle) : T.notification.blockEndBody(event.taskTitle),
      )
    }
  } else {
    playBreakEnd()
    buzz()
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
export function useTimerEngine(onWake?: (e: WakeEvent) => void): void {
  // Im Ref, damit eine neue `onWake`-Funktion nicht den ganzen Motor (inkl. Worker) neu startet.
  const onWakeRef = useRef(onWake)
  useLayoutEffect(() => {
    onWakeRef.current = onWake
  }, [onWake])

  useEffect(() => {
    const worker = new Worker(new URL('../logic/ticker.worker.ts', import.meta.url), {
      type: 'module',
    })
    // Ultra-Modus: Solange die fällige Pause nicht bestätigt ist, alle ULTRA_REPEAT_MS piepen.
    // Läuft im selben Sekundentakt wie der Timer – so klappt es auch im Hintergrund.
    let lastUltraAt = 0
    // Mac: Wann lief der Block zuletzt nachweislich (letzter Takt)? Eine große Lücke = der Mac
    // hat geschlafen. Am Handy nicht – dort ist die App bei gesperrtem Display immer still.
    let lastRunningAt: number | null = null
    const check = () => {
      const t = getState().timer
      const running = t.phase === 'block' && t.pausedAt === null
      if (!IS_MOBILE && running && lastRunningAt !== null && Date.now() - lastRunningAt > SLEEP_GAP_MS) {
        pauseForSleep(lastRunningAt)
      }
      checkTimer().forEach((e) => signal(e, onWakeRef.current))
      const after = getState().timer
      lastRunningAt = after.phase === 'block' && after.pausedAt === null ? Date.now() : null
      const now = Date.now()
      if (isUltraRinging(now) && now - lastUltraAt >= ULTRA_REPEAT_MS - 100) {
        lastUltraAt = now
        playUltraAlarm()
      }
    }

    let ticking = false
    const syncTicking = () => {
      const t = getState().timer
      const shouldTick = (t.phase === 'block' && t.pausedAt === null) || (t.phase === 'break' && !t.endSignaled)
      // Pausiert oder vorbei: Die Lücke bis zum Weiterlaufen ist kein Schlaf.
      if (!(t.phase === 'block' && t.pausedAt === null)) lastRunningAt = null
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
