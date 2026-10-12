/**
 * AUFFANGNETZ BEI FEHLERN
 * Stößt die App auf einen unerwarteten Fehler, bleibt die Seite nicht weiß: Es kommt eine ruhige
 * Karte mit „Neu laden“ und – falls die Daten geladen sind – „Sicherung herunterladen“.
 * Die gespeicherten Daten bleiben dabei unberührt.
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

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unerwarteter Fehler:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="main">
        <section className="card error-card" role="alert">
          <h1 className="message-title">{T.error.title}</h1>
          <p className="message-text">{T.error.text}</p>
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
      </main>
    )
  }
}
