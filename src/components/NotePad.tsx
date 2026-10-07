/**
 * NOTIZZETTEL
 * Ein kleiner Knopf unten rechts öffnet ein einfaches Schmierblatt –
 * auch während der Timer läuft, ohne die Ansicht zu verlassen.
 * Kein Abhaken, keine Erinnerungen. Der Text bleibt, bis du ihn löschst.
 * Am Handy sitzt der Knopf stattdessen als Stift in der Kopfleiste (App.tsx, notePadEvents.ts).
 */

import { useEffect, useRef, useState } from 'react'
import { NOTE_SAVE_DELAY_MS } from '../config/defaults'
import { T } from '../config/texts'
import { updateNote } from '../store/actions'
import { getState } from '../store/store'
import { IS_MOBILE } from '../platform/device'
import { PencilIcon } from './icons'
import { NOTEPAD_OPEN_EVENT } from './notePadEvents'

export function NotePad() {
  const [open, setOpen] = useState(false)

  // Solange der Zettel offen ist, rückt der Inhalt nach links (siehe components.css).
  useEffect(() => {
    document.documentElement.classList.toggle('notes-open', open)
  }, [open])

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(NOTEPAD_OPEN_EVENT, show)
    return () => window.removeEventListener(NOTEPAD_OPEN_EVENT, show)
  }, [])

  if (open) return <NotePanel onClose={() => setOpen(false)} />
  if (IS_MOBILE) return null
  return (
    <button type="button" className="notes-button" title={T.park.hint} aria-label={T.notes.open} onClick={() => setOpen(true)}>
      <span className="corner-icon" aria-hidden="true">
        <PencilIcon />
      </span>{' '}
      <span className="corner-label">{T.notes.open}</span>
    </button>
  )
}

function NotePanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState(() => getState().note.text)
  const latest = useRef(text)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Speichert kurz nach dem Tippen – und sofort beim Schließen.
  useEffect(() => {
    const saveNow = () => {
      clearTimeout(timeout.current)
      if (latest.current !== getState().note.text) updateNote(latest.current)
    }
    window.addEventListener('pagehide', saveNow)
    return () => {
      window.removeEventListener('pagehide', saveNow)
      saveNow()
    }
  }, [])

  const change = (value: string) => {
    setText(value)
    latest.current = value
    clearTimeout(timeout.current)
    timeout.current = setTimeout(() => updateNote(latest.current), NOTE_SAVE_DELAY_MS)
  }

  return (
    <aside
      className="notes-panel card"
      aria-label={T.notes.title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="notes-head">
        <h2>{T.notes.title}</h2>
        <button type="button" className="btn btn-quiet btn-small" onClick={onClose}>
          {T.notes.close}
        </button>
      </div>
      <textarea
        className="notes-text"
        value={text}
        placeholder={T.notes.placeholder}
        aria-label={T.notes.title}
        // Direkt lostippen können.
        autoFocus
        onChange={(e) => change(e.target.value)}
      />
    </aside>
  )
}
