/**
 * MELDUNGEN STAPELN
 * =================
 * Bis zu zwei Meldungen stehen übereinander. Welche bleibt, welche wartet:
 * - Gleiche Art ersetzt gleiche Art (nach mehreren Löschungen lässt sich nur die letzte zurückholen).
 * - „Rückgängig“ (undo) und „Speichern fehlgeschlagen“ (error) werden nie von leisen Meldungen
 *   (info: Meilenstein, „Geparkt“, „Neuer Tag“ …) verdrängt – die warten, bis wieder Platz ist.
 * - Kommt eine wichtige Meldung und alles ist voll, rückt eine leise zurück in die Warteschlange.
 * Reine Logik, ohne React – gezeichnet wird in App.tsx und im Mini-Fenster.
 */

export type ToastKind = 'undo' | 'error' | 'info'

export interface StackedToast {
  id: number
  kind?: ToastKind
}

export interface ToastStack<T extends StackedToast> {
  visible: T[]
  waiting: T[]
}

/** So viele Meldungen stehen höchstens gleichzeitig da. */
export const MAX_TOASTS = 2

const kindOf = (toast: StackedToast): ToastKind => toast.kind ?? 'info'

export function emptyToasts<T extends StackedToast>(): ToastStack<T> {
  return { visible: [], waiting: [] }
}

/** Eine neue Meldung kommt dazu. */
export function pushToast<T extends StackedToast>(stack: ToastStack<T>, incoming: T, max = MAX_TOASTS): ToastStack<T> {
  const kind = kindOf(incoming)
  const visible = stack.visible.filter((t) => kindOf(t) !== kind)
  // Eine wartende Meldung derselben Art ist überholt.
  let waiting = stack.waiting.filter((t) => kindOf(t) !== kind)

  if (visible.length < max) return { visible: [...visible, incoming], waiting }

  if (kind === 'info') return { visible, waiting: [...waiting, incoming] }

  // Wichtig und alles voll: die älteste leise Meldung wartet wieder.
  const quiet = visible.findIndex((t) => kindOf(t) === 'info')
  if (quiet === -1) return { visible: [...visible.slice(1), incoming], waiting }
  const pushedBack = visible[quiet]
  waiting = [pushedBack, ...waiting.filter((t) => kindOf(t) !== 'info')]
  return { visible: [...visible.slice(0, quiet), ...visible.slice(quiet + 1), incoming], waiting }
}

/** Eine Meldung ist abgelaufen oder weggeklickt – eine wartende rückt nach. */
export function dropToast<T extends StackedToast>(stack: ToastStack<T>, id: number, max = MAX_TOASTS): ToastStack<T> {
  const visible = stack.visible.filter((t) => t.id !== id)
  const waiting = stack.waiting.filter((t) => t.id !== id)
  const room = Math.max(0, max - visible.length)
  return { visible: [...visible, ...waiting.slice(0, room)], waiting: waiting.slice(room) }
}
