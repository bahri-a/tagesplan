/**
 * TIMER-MOTOR
 * ===========
 * Läuft einmal für die ganze App: prüft im Sekundentakt, ob ein Block oder eine Pause vorbei ist,
 * und gibt dann Bescheid – Ton, Vibration, Mitteilung, VoiceOver-Ansage. Dazu das Rauschen im Block.
 * Die Oberfläche zeigt nur an; das Signalisieren passiert hier.
 *
 * Motor und Rauschen starten einmal nach dem Laden (App.tsx) und hängen nicht an der Oberfläche:
 * Selbst wenn ein Bildschirm wegen eines Fehlers nicht gezeichnet werden kann, kommen Ton und
 * Mitteilung beim Blockende trotzdem.
 */
import { useEffect } from 'react'
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
function signal(event: TimerEvent, onWake: (e: WakeEvent) => void): void {
  if (!event.fresh) return
  // VoiceOver: dasselbe als Satz – unabhängig davon, ob Töne an sind.
  announce(T.a11y[event.type](event.lastBlock === true))
  // iPhone-App: Die Mitteilung hat schon geklingelt – kein doppelter Ton, aber ein auffälliges
  // Pop-up beim Zurückkehren, damit es nicht in der stillen Mitteilung untergeht.
  if (event.type !== 'blockWarning' && phoneAlreadySignaled()) {
    if (event.type === 'blockEnd') {
      onWake({
        kind: 'blockEnd',
        title: T.notification.blockEndTitle,
        body: event.lastBlock ? T.notification.lastBlockEndBody(event.taskTitle) : T.notification.blockEndBody(event.taskTitle),
      })
    } else if (event.type === 'breakEnd') {
      onWake({ kind: 'breakEnd', title: T.notification.breakEndTitle, body: T.notification.breakEndBody(event.taskTitle) })
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

/*
 * Pop-ups beim Zurückkehren (WakeAlert): Die Oberfläche hört über `useWakeEvents` mit. Hört
 * gerade niemand zu (die Oberfläche ist noch nicht da), wartet das letzte Ereignis so lange.
 */
const wakeListeners = new Set<(e: WakeEvent) => void>()
let pendingWake: WakeEvent | null = null

function emitWake(event: WakeEvent): void {
  if (wakeListeners.size === 0) pendingWake = event
  else wakeListeners.forEach((l) => l(event))
}

/** React-Hook: `onWake` bekommt die Pop-ups beim Zurückkehren (siehe WakeEvent). */
export function useWakeEvents(onWake: (e: WakeEvent) => void): void {
  useEffect(() => {
    wakeListeners.add(onWake)
    if (pendingWake) {
      onWake(pendingWake)
      pendingWake = null
    }
    return () => {
      wakeListeners.delete(onWake)
    }
  }, [onWake])
}

let stopEngine: (() => void) | null = null

/**
 * Der „Motor“ des Timers – läuft einmal für die ganze App (mehrfache Aufrufe starten ihn nicht neu).
 * Ein Web Worker gibt im Sekundentakt Bescheid; dann wird geprüft, ob ein
 * Block oder eine Pause vorbei ist. Der Takt läuft nur, wenn nötig.
 * Gibt eine Funktion zum Anhalten zurück (nur für Tests nötig).
 */
export function startTimerEngine(): () => void {
  if (stopEngine) return stopEngine
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
    checkTimer().forEach((e) => signal(e, emitWake))
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

  stopEngine = () => {
    unsubscribe()
    worker.terminate()
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('focus', check)
    stopEngine = null
  }
  return stopEngine
}

let stopNoise: (() => void) | null = null

/**
 * Rauschen: läuft nur, solange ein Block läuft (nicht pausiert, nicht in der Pause),
 * das Rauschen angeschaltet ist und Töne erlaubt sind. Blendet weich ein und aus.
 * Startet wie der Motor einmal für die ganze App.
 */
export function startNoise(): () => void {
  if (stopNoise) return stopNoise
  const update = () => {
    const s = getState()
    const running = s.timer.phase === 'block' && s.timer.pausedAt === null
    setNoise(running && s.settings.noiseOn, s.settings.noiseColor)
  }
  update()
  const unsubscribe = subscribeToStore(update)
  stopNoise = () => {
    unsubscribe()
    setNoise(false, getState().settings.noiseColor)
    stopNoise = null
  }
  return stopNoise
}
