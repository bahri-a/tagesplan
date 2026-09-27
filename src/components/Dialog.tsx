/**
 * Ein ruhiges Dialogfenster in der Mitte des Bildschirms.
 * Nutzt das eingebaute <dialog>-Element von Chrome (Tastatur-Fokus und
 * Escape-Taste funktionieren damit automatisch).
 */

import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  /** Wird bei Escape aufgerufen. Ohne `onClose` lässt sich der Dialog so nicht schließen. */
  onClose?: () => void
  wide?: boolean
}

export function Dialog({ title, children, onClose, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? ' dialog-wide' : ''}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose?.()
      }}
    >
      <h2 className="dialog-title">{title}</h2>
      {children}
    </dialog>
  )
}
