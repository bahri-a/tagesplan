/**
 * Zahlenfeld mit – und + (z. B. für Blocklänge oder Blockanzahl).
 * Man kann auch direkt eine Zahl eintippen.
 */

import { useState } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  label: string
  min?: number
  /** Ohne `max` gibt es keine Obergrenze. */
  max?: number
  unit?: string
}

export function NumberStepper({ value, onChange, label, min = 1, max = Infinity, unit }: Props) {
  // Während du tippst, steht hier dein Entwurf; sonst `null`.
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  const applyDraft = () => {
    if (draft === null) return
    const n = parseInt(draft, 10)
    if (!Number.isNaN(n) && clamp(n) !== value) onChange(clamp(n))
    setDraft(null)
  }

  return (
    <div className="stepper">
      <button
        type="button"
        className="btn btn-small stepper-btn"
        aria-label={`${label} verringern`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        –
      </button>
      <input
        className="stepper-input"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? String(value)}
        onFocus={(e) => {
          setDraft(String(value))
          e.target.select()
        }}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={applyDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <button
        type="button"
        className="btn btn-small stepper-btn"
        aria-label={`${label} erhöhen`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
      {/* Einheit rechts neben dem Plus. Auch ein leerer Text ("") erzeugt den Platz – so stehen
          mehrere Zahlenfelder bündig. */}
      {unit !== undefined && <span className="stepper-unit">{unit}</span>}
    </div>
  )
}
