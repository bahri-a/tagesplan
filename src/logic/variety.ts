/**
 * KLEINE ABWECHSLUNG
 * ==================
 * Damit sich die App nicht abnutzt, wechseln einige freundliche Sätze. Gewählt wird nicht
 * rein zufällig, sondern nach einer festen Zahl (z. B. der Startzeit des Blocks) – so bleibt
 * der Satz stehen, solange der Block läuft, und springt nicht bei jedem Neuzeichnen.
 */

/** Wählt einen Eintrag aus der Liste – für dieselbe Zahl immer denselben. */
export function pick<T>(list: readonly T[], seed: number): T {
  const index = Math.abs(Math.floor(seed / 1000)) % list.length
  return list[index]
}

/** Zeigt dieser Block den Satz „Abschweifen ist okay“? Nur ungefähr jeder `every`-te Block. */
export function showsGentleLine(blockStartedAt: number, every: number): boolean {
  return Math.abs(Math.floor(blockStartedAt / 1000)) % every === 0
}

/**
 * Startsignal für die Anzeige aufräumen: ein vorangestelltes „wenn“ und Satzzeichen am Ende
 * weg, damit „Wenn … → los.“ immer sauber aussieht. Beispiel: „Wenn der Kaffee steht.“ → „der Kaffee steht“.
 */
export function cleanStartCue(cue: string): string {
  return cue
    .trim()
    .replace(/^wenn\s+/i, '')
    .replace(/[\s.!,;:…]+$/, '')
}
