/**
 * Gemeinsame Teile für „Zuletzt verwendet“ und „Vorschläge“: Ziel-Umschalter (Heute/Morgen) und Reset.
 */

import { useEffect, useRef, useState } from 'react'
import { T } from '../../config/texts'
import type { ID } from '../../model/types'

/**
 * Ganz unten, leise: die zuletzt benutzten Hauptaufgaben als kleine Knöpfe. Ein Klick legt sie
 * (mit ihren ersten Schritten und Einstellungen) wieder an – standardmäßig für morgen, per
 * Umschalter auch für heute. Was auf dem gewählten Tag schon steht, wird nicht angeboten.
 * Das kleine × in der Pille nimmt eine Aufgabe aus der Liste (sie selbst bleibt unverändert).
 */
export type PlanDays = { day: { id: ID }; label: string }[]

export interface TargetProps {
  days: PlanDays
  /** Welcher Tag bekommt die Aufgabe? 0 = Heute, 1 = Morgen. */
  targetIndex: number
  onTargetChange: (index: number) => void
  onNotice: (m: string) => void
}

/** Umschalter „Heute | Morgen“ rechts neben der Überschrift. */
export function TargetSwitch({ days, targetIndex, onTargetChange }: Omit<TargetProps, 'onNotice'>) {
  return (
    <div className="segmented recent-target" role="radiogroup" aria-label={T.plan.recentTarget}>
      {days.map(({ label }, index) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={index === targetIndex}
          className="segmented-item"
          onClick={() => onTargetChange(index)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Leiser Textknopf „Reset“. Mit `confirm` fragt ein kleines Fenster darunter erst nach
 * („Ausblenden“ / „Abbrechen“); Klick daneben oder Escape schließt es.
 */
export function ResetButton({ hint, confirm, onReset }: { hint: string; confirm?: string; onReset: () => void }) {
  const [asking, setAsking] = useState(false)
  const boxRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!asking) return
    const onPointer = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setAsking(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAsking(false)
    }
    const timer = setTimeout(() => document.addEventListener('pointerdown', onPointer), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [asking])

  return (
    <span ref={boxRef} className="reset-box">
      <button
        type="button"
        className="suggestions-refresh reset-button"
        title={hint}
        aria-expanded={confirm ? asking : undefined}
        onClick={() => (confirm ? setAsking((a) => !a) : onReset())}
      >
        {T.plan.listReset}
      </button>
      {asking && confirm && (
        <span className="chip-menu reset-confirm" role="dialog" aria-label={confirm}>
          <span className="reset-question">{confirm}</span>
          <span className="reset-actions">
            <button type="button" className="reset-cancel" onClick={() => setAsking(false)}>
              {T.plan.suggestionsResetCancel}
            </button>
            <button
              type="button"
              className="reset-ok"
              autoFocus
              onClick={() => {
                setAsking(false)
                onReset()
              }}
            >
              {T.plan.suggestionsResetConfirm}
            </button>
          </span>
        </span>
      )}
    </span>
  )
}
