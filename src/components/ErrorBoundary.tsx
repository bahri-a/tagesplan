/**
 * AUFFANGNETZ BEI FEHLERN
 * Stößt die App auf einen unerwarteten Fehler, bleibt die Seite nicht weiß: Es kommt eine ruhige
 * Karte mit „Neu laden“ und – falls die Daten geladen sind – „Sicherung herunterladen“.
 * Die gespeicherten Daten bleiben dabei unberührt.
 *  - `ErrorBoundary` umschließt die ganze App (main.tsx).
 *  - `ScreenBoundary` umschließt einen Bildschirm (Heute, Planer, Einstellungen): Kopfleiste,
 *    Timer-Anzeige und der Timer selbst laufen dann weiter.
 *  - `StartFailed`: Die Daten ließen sich beim Start nicht öffnen (App.tsx).
 */

import { Component, type ReactNode } from 'react'
import { T } from '../config/texts'
import { downloadBackup } from '../db/backup'
import { getState } from '../store/store'

/** Sind die Daten geladen (dann lässt sich eine Sicherung erstellen)? */
function storeLoaded(): boolean {
  try {
    getState()
    return true
  } catch {
    return false
  }
}

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unerwarteter Fehler:', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function ErrorCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="card error-card" role="alert">
      <h1 className="message-title">{title}</h1>
      <p className="message-text">{text}</p>
      <div className="error-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {T.error.reload}
        </button>
        {storeLoaded() && (
          <button type="button" className="btn btn-quiet" onClick={() => downloadBackup()}>
            {T.error.backup}
          </button>
        )}
      </div>
    </section>
  )
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Boundary
      fallback={
        <main className="main">
          <ErrorCard title={T.error.title} text={T.error.text} />
        </main>
      }
    >
      {children}
    </Boundary>
  )
}

export function ScreenBoundary({ children }: { children: ReactNode }) {
  return <Boundary fallback={<ErrorCard title={T.error.screenTitle} text={T.error.screenText} />}>{children}</Boundary>
}

export function StartFailed() {
  return (
    <main className="main">
      <ErrorCard title={T.error.startTitle} text={T.error.startText} />
    </main>
  )
}
