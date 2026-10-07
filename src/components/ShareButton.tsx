/**
 * Knopf zum Teilen eines Links (Weiterempfehlen, Fokus-Einladung). Öffnet das Teilen-Menü des
 * Geräts. Gibt es keins, wird der Link kopiert – dann steht kurz „Link kopiert“ auf dem Knopf.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { SHARE_COPIED_MS } from '../config/defaults'
import { T } from '../config/texts'
import { shareLink } from '../platform/share'

interface Props {
  className: string
  icon: ReactNode
  label: string
  title?: string
  /** Text und Link erst beim Klick – z. B. mit der aktuellen Endzeit des Blocks. */
  link: () => { text: string; url: string }
}

export function ShareButton({ className, icon, label, title, link }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), SHARE_COPIED_MS)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <button
      type="button"
      className={className}
      title={title}
      onClick={async () => {
        const { text, url } = link()
        if ((await shareLink(text, url)) === 'copied') setCopied(true)
      }}
    >
      {icon} {copied ? T.share.copied : label}
    </button>
  )
}
