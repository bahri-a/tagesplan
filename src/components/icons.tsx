/**
 * SYMBOLE
 * =======
 * Alle kleinen Strich-Symbole der App an einer Stelle. Farbe, Strichstärke und Größe kommen
 * meist aus dem CSS der Stelle, an der das Symbol steht.
 */

/** Papierkorb auf den Karten im Planer (mit zwei Strichen). */
export function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.75 4.25h10.5" />
      <path d="M6.25 4.25V3a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v1.25" />
      <path d="M4 4.25l.65 8.6a1.2 1.2 0 0 0 1.2 1.15h4.3a1.2 1.2 0 0 0 1.2-1.15l.65-8.6" />
      <path d="M6.6 6.9v4.4M9.4 6.9v4.4" />
    </svg>
  )
}

/** Papierkorb, schlicht – im kleinen Menü der Vorschläge. */
export function TrashSmallIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.75 4.25h10.5" />
      <path d="M6.25 4.25V3a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v1.25" />
      <path d="M4 4.25l.65 8.6a1.2 1.2 0 0 0 1.2 1.15h4.3a1.2 1.2 0 0 0 1.2-1.15l.65-8.6" />
    </svg>
  )
}

/** Doppel-Blatt – „Für morgen kopieren“. */
export function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
      <path d="M10.5 3.2A1.8 1.8 0 0 0 8.8 2H4a2 2 0 0 0-2 2v4.8a1.8 1.8 0 0 0 1.2 1.7" />
    </svg>
  )
}

/** Uhr – „Aufschieben“. */
export function LaterIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 5v3.25l2 1.25" />
    </svg>
  )
}

/** Pfeil nach oben – „Zu den Vorschlägen“. */
export function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 12.75V3.5M4.25 7.25L8 3.5l3.75 3.75" />
    </svg>
  )
}

/** Haken – erledigt. Mit `className="glyph"` steht er wie ein Buchstabe im Text. */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden={className ? true : undefined}>
      {/* pathLength: Damit sich der Haken nach „Erledigt“ in einem Zug zeichnen kann (today.css). */}
      <path d="M4.2 8.4l2.4 2.4 5.2-5.4" pathLength={1} />
    </svg>
  )
}

/** Sonnenaufgang – „Neuen Tag beginnen“. */
export function SunriseIcon() {
  return (
    <svg className="new-day-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 17a7 7 0 0 1 14 0" />
      <path d="M3 20h18" />
      <path d="M12 4v3M4.9 8.9l2.1 2.1M19.1 8.9 17 11" />
    </svg>
  )
}

/** Zwei Striche – „Pausieren“. */
export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 4.5v7M10 4.5v7" />
    </svg>
  )
}

/** Stift – Notizen. */
export function PencilIcon() {
  return (
    <svg className="glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.4 3.1l2.5 2.5-7.2 7.2-3.1.6.6-3.1z" />
      <path d="M9 4.5l2.5 2.5" />
    </svg>
  )
}

/** Dreieck – Probe-Ton abspielen. */
export function PlayIcon() {
  return (
    <svg className="glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.25 3.9v8.2l6.6-4.1z" fill="currentColor" />
    </svg>
  )
}

/** Kasten mit Pfeil nach oben – Teilen. */
export function ShareIcon() {
  return (
    <svg className="glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 10V2.5M5.25 5.25L8 2.5l2.75 2.75" />
      <path d="M5.5 7.25H4.75a1.25 1.25 0 0 0-1.25 1.25v4.25a1.25 1.25 0 0 0 1.25 1.25h6.5a1.25 1.25 0 0 0 1.25-1.25V8.5a1.25 1.25 0 0 0-1.25-1.25H10.5" />
    </svg>
  )
}

/** Zwei Kettenglieder – Einladung per Link. */
export function LinkIcon() {
  return (
    <svg className="glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6.9 9.1a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9" />
      <path d="M9.1 6.9a2.6 2.6 0 0 0-3.7 0L3.2 9.1a2.6 2.6 0 0 0 3.7 3.7l.9-.9" />
    </svg>
  )
}
