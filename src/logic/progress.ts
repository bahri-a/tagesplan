/**
 * FORTSCHRITT ALS SYMBOLE
 * =======================
 * Rechnet aus, wie die Punkte oben in der Timer-Ansicht aussehen:
 * eine Zeile für die Aufgaben des Tages, eine für die Blöcke der Aufgabe.
 * Reine Logik ohne Oberfläche – deshalb gut zu testen.
 */

/** 'done' = geschafft, 'current' = jetzt dran, 'open' = kommt noch. */
export type Mark = 'done' | 'current' | 'open'

/**
 * Die Punkte für die Blöcke einer Aufgabe.
 * @param done       schon gemachte Blöcke (nur durchgehaltene, abgebrochene zählen nicht)
 * @param estimated  geschätzte Blöcke
 * @param highlight  Soll der nächste Block als „jetzt dran“ erscheinen?
 *                   (Ja, wenn er läuft oder gleich gestartet werden kann.)
 * Wurden mehr Blöcke gemacht als geschätzt, gibt es entsprechend mehr Punkte.
 */
export function blockMarks(done: number, estimated: number, highlight: boolean): Mark[] {
  const total = Math.max(estimated, done + (highlight ? 1 : 0))
  return Array.from({ length: total }, (_, i): Mark => {
    if (i < done) return 'done'
    if (i === done && highlight) return 'current'
    return 'open'
  })
}

/** Das Zeichen für eine Aufgabe: erledigt, die aktuelle oder eine spätere. */
export function taskMark(isDone: boolean, isCurrent: boolean): Mark {
  if (isCurrent) return 'current'
  return isDone ? 'done' : 'open'
}
