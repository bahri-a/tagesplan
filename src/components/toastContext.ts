/**
 * MELDUNGEN VON ÜBERALL
 * Eine Karte (z. B. die große Karte in „Heute“) zeigt eine Meldung unten an, ohne selbst eine zu
 * zeichnen. Das App-Fenster zeigt sie unten in der Mitte (App.tsx), das Mini-Fenster in sich selbst.
 */
import { createContext, useContext } from 'react'
import { UNDO_DELETE_MS } from '../config/defaults'
import { T } from '../config/texts'
import type { ToastAction } from './Toast'

export interface ToastRequest {
  message: string
  duration?: number
  action?: ToastAction
}

export const ToastContext = createContext<(toast: ToastRequest) => void>(() => {})

/**
 * Nach einer Aktion, die Daten ändert: „… · Rückgängig“ (8 Sekunden, wie beim Löschen).
 * Ohne `undo` (die Aktion hat nichts getan) kommt keine Meldung.
 */
export function useUndoToast(): (message: string, undo: (() => void) | null) => void {
  const show = useContext(ToastContext)
  return (message, undo) => {
    if (undo) show({ message, duration: UNDO_DELETE_MS, action: { label: T.plan.undo, onClick: undo } })
  }
}
