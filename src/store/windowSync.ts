/**
 * MEHRERE FENSTER
 * ===============
 * Ist Tagesplan zweimal offen (installierte App und Browser-Tab, eigener Einladungslink …), zeigen
 * beide Fenster sofort dasselbe: Nach jeder Änderung gehen die geänderten Einträge an die anderen
 * Fenster (`BroadcastChannel`), die sie mit `applyExternal` übernehmen – nur, was dort nicht
 * schon neuer ist. So überschreibt kein Fenster das andere mit einem alten Stand.
 * Nach dem Wiederherstellen einer Sicherung lesen alle Fenster neu.
 *
 * Gibt es `BroadcastChannel` nicht (sehr alte Browser), läuft jedes Fenster wie bisher für sich.
 */
import { applyExternal, reloadStore, subscribeToCommits, type StoreEvent } from './store'

const CHANNEL_NAME = 'tagesplan'

let stop: (() => void) | null = null

/** Einmal nach dem Laden (App.tsx). Gibt eine Funktion zum Beenden zurück (nur für Tests nötig). */
export function startWindowSync(): () => void {
  if (stop) return stop
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<StoreEvent>) => {
    if (event.data.type === 'changes') applyExternal(event.data.changes)
    else if (event.data.type === 'reload') void reloadStore({ fromOutside: true })
  }
  const unsubscribe = subscribeToCommits((event) => channel.postMessage(event))
  stop = () => {
    unsubscribe()
    channel.close()
    stop = null
  }
  return stop
}
