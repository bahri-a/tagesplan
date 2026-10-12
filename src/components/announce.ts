/**
 * ANSAGEN FÜR SCREENREADER (VoiceOver)
 * Eine unsichtbare Zeile, die VoiceOver vorliest, sobald sich ihr Text ändert – z. B. „Block geschafft.“
 * Wer keinen Screenreader nutzt, merkt davon nichts.
 */

let region: HTMLElement | null = null
let timeout: ReturnType<typeof setTimeout> | undefined

export function announce(text: string): void {
  if (typeof document === 'undefined') return
  if (!region) {
    region = document.createElement('div')
    region.className = 'visually-hidden'
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'polite')
    document.body.append(region)
  }
  // Erst leeren, dann setzen – so wird auch derselbe Satz ein zweites Mal vorgelesen.
  region.textContent = ''
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    if (region) region.textContent = text
  }, 60)
}
