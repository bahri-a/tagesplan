/** Öffnet die Tafel mit den Tastenkürzeln von außen (Einstellungen, siehe App.tsx). */

export const SHORTCUTS_OPEN_EVENT = 'tagesplan:tastenkuerzel'

export function openShortcuts(): void {
  window.dispatchEvent(new Event(SHORTCUTS_OPEN_EVENT))
}
