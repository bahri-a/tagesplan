/**
 * Leertaste als Abkürzung für den Hauptknopf in „Heute“ (und im Mini-Fenster).
 */

import { useContext, useEffect, useRef } from 'react'
import { isTypingOrButton, WindowContext } from '../../components/hooks'

/**
 * Leertaste als Abkürzung für den Hauptknopf. Nicht, während du in ein Feld tippst,
 * und nicht, wenn gerade ein Knopf den Fokus hat (dann drückt die Leertaste ohnehin ihn).
 */
export function useSpaceKey(action: () => void) {
  const latest = useRef(action)
  // Im Mini-Fenster gilt die Leertaste dort (eigenes Dokument), sonst im App-Fenster.
  const { document } = useContext(WindowContext)
  useEffect(() => {
    latest.current = action
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingOrButton(e.target) || document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      latest.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [document])
}
