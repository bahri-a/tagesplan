/**
 * TEXTFELDER OHNE RUCKELN
 * Beim Tippen bleibt der Text erst nur im Feld (ein „Entwurf“). Gespeichert wird, sobald kurz
 * Pause ist (DRAFT_SAVE_DELAY_MS), beim Verlassen des Feldes, beim Zuklappen der Karte und
 * beim Schließen der App. So zeichnet nicht jeder Buchstabe die ganze App neu und schreibt
 * in die Datenbank. Dasselbe Muster wie beim Notizzettel (NotePad.tsx).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DRAFT_SAVE_DELAY_MS } from '../config/defaults'

export interface Draft {
  /** Was im Feld steht. */
  value: string
  /** Beim Tippen (onChange). */
  set: (value: string) => void
  /** Jetzt speichern (onBlur). Mit `keepOldIfEmpty` kommt bei leerem Feld der alte Text zurück. */
  flush: () => void
}

interface Latest {
  saved: string
  save: (value: string) => void
  keepOldIfEmpty: boolean
  /** Der noch nicht übernommene Entwurf – `null`, wenn es keinen gibt. */
  draft: string | null
}

/** Speichert den Entwurf, falls nötig. Ein leerer Text wird mit `keepOldIfEmpty` nie gespeichert. */
function storeDraft(latest: Latest, value: string): void {
  if (latest.keepOldIfEmpty && value.trim() === '') return
  if (value !== latest.saved) latest.save(value)
}

export function useDraft(
  saved: string,
  save: (value: string) => void,
  { keepOldIfEmpty = false }: { keepOldIfEmpty?: boolean } = {},
): Draft {
  // `null` = kein Entwurf, das Feld zeigt den gespeicherten Text.
  const [draft, setDraft] = useState<string | null>(null)
  const latest = useRef<Latest>({ saved, save, keepOldIfEmpty, draft: null })
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useLayoutEffect(() => {
    Object.assign(latest.current, { saved, save, keepOldIfEmpty })
  })

  // Beim Zuklappen der Karte und beim Schließen der App: den letzten Stand noch speichern.
  useEffect(() => {
    const current = latest.current
    const saveNow = () => {
      clearTimeout(timeout.current)
      if (current.draft !== null) storeDraft(current, current.draft)
    }
    window.addEventListener('pagehide', saveNow)
    return () => {
      window.removeEventListener('pagehide', saveNow)
      saveNow()
    }
  }, [])

  return {
    value: draft ?? saved,
    set: (value) => {
      latest.current.draft = value
      setDraft(value)
      clearTimeout(timeout.current)
      timeout.current = setTimeout(() => storeDraft(latest.current, value), DRAFT_SAVE_DELAY_MS)
    },
    flush: () => {
      clearTimeout(timeout.current)
      const pending = latest.current.draft
      if (pending === null) return
      storeDraft(latest.current, pending)
      latest.current.draft = null
      setDraft(null)
    },
  }
}
