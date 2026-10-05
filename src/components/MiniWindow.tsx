/**
 * MINI-FENSTER (Bild-im-Bild)
 * ===========================
 * Ein kleines Fenster, das immer über allen anderen liegt – auch über deinem PDF oder Editor.
 * Es zeigt den Ring mit der Restzeit, den Rauschen-Knopf und Start/Pausieren/Weiter.
 * So bleibt die Zeit sichtbar, auch wenn die App selbst im Hintergrund ist.
 *
 * Technik: Chrome „Document Picture-in-Picture“ (seit Chrome 116). Der Inhalt wird mit
 * React direkt in das kleine Fenster gezeichnet (Portal) und liest denselben App-Zustand.
 * Gibt es die Funktion im Browser nicht, erscheint der Knopf nicht.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MINI_WINDOW_SIZE } from '../config/defaults'
import { T } from '../config/texts'
import { MiniToday } from '../screens/today/TodayScreen'
import { WindowContext } from './hooks'
import './mini.css'

interface DocumentPictureInPicture {
  requestWindow(options: { width: number; height: number }): Promise<Window>
  window: Window | null
}

function pipApi(): DocumentPictureInPicture | null {
  return (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture ?? null
}

/** Alle Stile der App ins kleine Fenster übernehmen, damit es genauso aussieht. */
function copyStyles(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
      const style = target.createElement('style')
      style.textContent = css
      target.head.appendChild(style)
    } catch {
      // Fremde Stylesheets lassen sich nicht auslesen – dann als Link einbinden.
      if (sheet.href) {
        const link = target.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        target.head.appendChild(link)
      }
    }
  }
}

/** Hell/Dunkel, Farbwelt und Pur/Milchglas vom App-Fenster übernehmen (auch wenn du sie später änderst). */
function mirrorRootAttributes(target: Document): () => void {
  const copy = () => {
    const from = document.documentElement
    const to = target.documentElement
    for (const name of ['data-theme', 'data-palette', 'data-surfaces']) {
      const value = from.getAttribute(name)
      if (value === null) to.removeAttribute(name)
      else to.setAttribute(name, value)
    }
  }
  copy()
  const observer = new MutationObserver(copy)
  observer.observe(document.documentElement, { attributes: true })
  return () => observer.disconnect()
}

export function MiniWindow() {
  const api = pipApi()
  const [pip, setPip] = useState<Window | null>(null)

  useEffect(() => {
    if (!pip) return
    const stopMirror = mirrorRootAttributes(pip.document)
    const closed = () => setPip(null)
    pip.addEventListener('pagehide', closed)
    return () => {
      stopMirror()
      pip.removeEventListener('pagehide', closed)
    }
  }, [pip])

  if (!api) return null

  const toggle = async () => {
    if (pip) {
      pip.close()
      setPip(null)
      return
    }
    try {
      const win = await api.requestWindow(MINI_WINDOW_SIZE)
      win.document.title = T.mini.title
      copyStyles(win.document)
      win.document.body.classList.add('mini-body')
      setPip(win)
    } catch {
      // Abgelehnt oder nicht möglich – dann bleibt einfach alles, wie es ist.
    }
  }

  return (
    <>
      <button
        type="button"
        className="mini-button"
        aria-pressed={pip !== null}
        title={T.mini.hint}
        aria-label={pip ? T.mini.close : T.mini.open}
        onClick={() => void toggle()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
          <rect x="8" y="8" width="4.5" height="3.5" rx="0.8" className="mini-button-inner" />
        </svg>
        <span className="corner-label">{pip ? T.mini.close : T.mini.open}</span>
      </button>
      {pip &&
        createPortal(
          <WindowContext.Provider value={pip}>
            <MiniToday />
          </WindowContext.Provider>,
          pip.document.body,
        )}
    </>
  )
}
