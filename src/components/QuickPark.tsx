/**
 * GEDANKEN PARKEN (Taste N)
 * Schießt dir im Block etwas durch den Kopf („Mama anrufen“, „Was war nochmal …?“),
 * drückst du N, tippst eine Zeile und Enter – der Gedanke landet unten im Notizzettel,
 * und du bist sofort wieder bei der Arbeit. Klick daneben (oder ein anderes Fenster) parkt den Gedanken
 * ebenfalls – nur Escape verwirft ihn.
 * Idee aus der Verhaltenstherapie bei ADHS: Ablenkung aufschreiben statt ihr zu folgen.
 * Klappt auch im Mini-Fenster: Dort gilt die Taste in dessen eigenem Dokument (WindowContext).
 */

import { useContext, useEffect, useRef, useState } from 'react'
import { T } from '../config/texts'
import { parkThought } from '../store/actions'
import { isTypingOrButton, WindowContext } from './hooks'

export function QuickPark({ onParked }: { onParked: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const { document } = useContext(WindowContext)
  // Schon erledigt (Enter oder Escape) – das folgende Verlassen des Feldes parkt nicht noch einmal.
  const settled = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (isTypingOrButton(e.target) && (e.target as HTMLElement).tagName !== 'BUTTON') return
      if (document.querySelector('dialog[open], [role="dialog"]')) return
      e.preventDefault()
      // Ist der Notizzettel schon offen, einfach dort weiterschreiben.
      const notes = document.querySelector<HTMLTextAreaElement>('.notes-text')
      if (notes) {
        notes.focus()
        return
      }
      settled.current = false
      setOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [document])

  if (!open) return null
  const close = (park: boolean) => {
    if (settled.current) return
    settled.current = true
    if (park && text.trim()) {
      parkThought(text)
      onParked()
    }
    setOpen(false)
    setText('')
  }
  return (
    <form
      className="quick-park"
      onSubmit={(e) => {
        e.preventDefault()
        close(true)
      }}
    >
      <input
        className="input"
        value={text}
        placeholder={T.park.placeholder}
        aria-label={T.park.label}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onBlur={() => close(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close(false)
        }}
      />
    </form>
  )
}
