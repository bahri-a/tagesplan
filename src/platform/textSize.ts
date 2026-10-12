/**
 * SCHRIFTGRÖSSE VOM IPHONE ÜBERNEHMEN
 * Wer am iPhone „Größerer Text“ eingestellt hat (Einstellungen → Anzeige & Helligkeit → Textgröße),
 * bekommt auch Tagesplan größer – höchstens zwei Stufen, damit weiterhin alles ohne Scrollen passt.
 * Alle Größen der App hängen an `rem`, also reicht es, die Grundgröße an <html> und <body> zu setzen.
 * Nur Safari bzw. die iPhone-App kennen die Systemschrift `-apple-system-body`; überall sonst
 * bleibt alles, wie es ist.
 */

/** Grundgröße der App (wie im Browser üblich). */
const BASE_PX = 16
/** So groß ist `-apple-system-body` bei der Standard-Textgröße des iPhones. */
const IOS_DEFAULT_BODY_PX = 17
/** Höchstens zwei Stufen größer (17 → 19 → 21 Punkt). */
export const MAX_SCALE = 21 / 17

/** Faktor aus der Systemgröße: nie kleiner als 1, nie größer als MAX_SCALE. */
export function textScale(systemBodyPx: number): number {
  if (!Number.isFinite(systemBodyPx) || systemBodyPx <= 0) return 1
  return Math.min(MAX_SCALE, Math.max(1, systemBodyPx / IOS_DEFAULT_BODY_PX))
}

function systemBodyPx(): number {
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;visibility:hidden;font:-apple-system-body'
  document.body.append(probe)
  // Kennt der Browser die Systemschrift nicht, bleibt die Angabe wirkungslos → keine Änderung.
  const applied = probe.style.font !== ''
  const px = parseFloat(getComputedStyle(probe).fontSize)
  probe.remove()
  return applied ? px : IOS_DEFAULT_BODY_PX
}

function apply(): void {
  const scale = textScale(systemBodyPx())
  const size = scale === 1 ? '' : `${(BASE_PX * scale).toFixed(2)}px`
  // <html> (Grundlage aller rem-Größen) und <body> (Text ohne eigene Größe) gleich.
  document.documentElement.style.fontSize = size
  document.body.style.fontSize = size
}

/** Einmal beim Start und jedes Mal, wenn die App wieder nach vorne kommt (Größe evtl. geändert). */
export function followSystemTextSize(): void {
  apply()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') apply()
  })
}
