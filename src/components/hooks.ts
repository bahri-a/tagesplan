/**
 * Kleine React-Hilfen, die an mehreren Stellen gebraucht werden.
 * Der Timer-Motor (Takt, Töne, Mitteilungen) steht in signals/timerEngine.ts.
 */

import { createContext, useContext, useLayoutEffect, useState } from 'react'

/**
 * In welchem Fenster wird gerade gezeichnet? Normalerweise im App-Fenster; im Mini-Fenster
 * (Bild-im-Bild) in diesem. Wichtig für den Takt: Chrome bremst Zeitgeber in verdeckten
 * Fenstern stark – das Mini-Fenster ist aber immer sichtbar und tickt deshalb selbst.
 */
export const WindowContext = createContext<Window>(window)

/**
 * Liefert die aktuelle Uhrzeit (Millisekunden) und aktualisiert sie
 * regelmäßig (Standard: einmal pro Sekunde), solange `active` wahr ist.
 * Die Restzeit wird daraus immer frisch aus Zeitpunkten berechnet. Öfter muss nicht sein:
 * Die Anzeige zeigt nur Sekunden, und der Ring gleitet per CSS (today.css) – das schont den Akku.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
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

/** Tippt jemand gerade in ein Feld – oder hat ein Knopf den Fokus? */
export function isTypingOrButton(target: EventTarget | null): boolean {
  // Bewusst ohne `instanceof`: Elemente im Mini-Fenster stammen aus einem anderen Dokument.
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName)
}
