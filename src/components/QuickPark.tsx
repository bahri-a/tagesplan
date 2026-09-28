/**
 * GEDANKEN PARKEN (Taste N)
 * Schießt dir im Block etwas durch den Kopf („Mama anrufen“, „Was war nochmal …?“),
 * drückst du N, tippst eine Zeile und Enter – der Gedanke landet unten im Notizzettel,
 * und du bist sofort wieder bei der Arbeit. Escape oder Klick daneben schließt ohne Speichern.
 * Idee aus der Verhaltenstherapie bei ADHS: Ablenkung aufschreiben statt ihr zu folgen.
 */

import { useEffect, useState } from 'react'
import { T } from '../config/texts'
import { parkThought } from '../store/actions'
import { isTypingOrButton } from './hooks'

export function QuickPark({ onParked }: { onParked: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (isTypingOrButton(e.target) && (e.target as HTMLElement).tagName !== 'BUTTON') return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      // Ist der Notizzettel schon offen, einfach dort weiterschreiben.
      const notes = document.querySelector<HTMLTextAreaElement>('.notes-text')
      if (notes) {
        notes.focus()
        return
      }
      setOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null
  const close = () => {
    setOpen(false)
    setText('')
  }
  return (
    <form
      className="quick-park"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) {
          parkThought(text)
          onParked()
        }
        close()
      }}
    >
      <input
        className="input"
        value={text}
        placeholder={T.park.placeholder}
        aria-label={T.park.label}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onBlur={close}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
      />
    </form>
  )
}
