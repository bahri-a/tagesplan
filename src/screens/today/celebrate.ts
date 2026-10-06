/**
 * KLEINE BELOHNUNGEN IM MOMENT DES ERFOLGS
 * ========================================
 * Nach „Erledigt“ zeichnet sich der Haken der Aufgabe, und in „Alles erledigt“ zählen die
 * Tageszahlen kurz hoch – alles unter 0,6 s. Das passiert nur direkt nach deinem Klick, nicht
 * beim Öffnen der App oder beim Wechsel der Reiter. Mit „Bewegung reduzieren“ (macOS/iOS)
 * steht alles gleich fertig da.
 */

import { useEffect, useState } from 'react'
import { COUNT_UP_MS, JUST_FINISHED_MS } from '../../config/defaults'
import type { ID } from '../../model/types'

let lastFinished: { taskId: ID; at: number } | null = null

/** Merkt sich: Diese Hauptaufgabe wurde gerade per Klick erledigt. */
export function noteFinished(taskId: ID, now = Date.now()): void {
  lastFinished = { taskId, at: now }
}

/** Wurde diese Hauptaufgabe gerade eben (per Klick in „Heute“) erledigt? */
export function wasJustFinished(taskId: ID, now = Date.now()): boolean {
  return lastFinished !== null && lastFinished.taskId === taskId && now - lastFinished.at < JUST_FINISHED_MS
}

/** Hat jemand im System „Bewegung reduzieren“ eingeschaltet? */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Zählt von 0 bis `target` hoch (sanft abbremsend), wenn `run` – sonst steht gleich die Zahl da. */
export function useCountUp(target: number, run: boolean): number {
  const animate = run && !prefersReducedMotion()
  const [value, setValue] = useState(animate ? 0 : target)
  useEffect(() => {
    if (!animate) return
    const start = performance.now()
    let frame = 0
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / COUNT_UP_MS)
      setValue(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, animate])
  return animate ? value : target
}
