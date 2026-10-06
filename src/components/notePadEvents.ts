/** Öffnet den Notizzettel von außen (Handy: ✎ in der Kopfleiste, siehe App.tsx). */

export const NOTEPAD_OPEN_EVENT = 'tagesplan:notizen'

export function openNotePad(): void {
  window.dispatchEvent(new Event(NOTEPAD_OPEN_EVENT))
}
