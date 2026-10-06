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

/** Haken – erledigt. */
export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="M4.2 8.4l2.4 2.4 5.2-5.4" />
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
