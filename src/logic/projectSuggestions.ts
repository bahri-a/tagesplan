/**
 * „VORSCHLÄGE“ AUS DER APP „PROJEKTE“
 * Projekte (bahri-a.github.io/projekte) und Tagesplan (bahri-a.github.io/tagesplan) liegen auf
 * derselben Adresse und teilen sich deshalb den Browser-Speicher. Tagesplan LIEST dort nur die
 * offenen Aufgaben – geändert wird in Projekte nie etwas.
 *
 * Aus jeder Aufgabe wird eine kurze Hauptaufgabe (1 bis 4 Wörter). Das formuliert Claude über den
 * Helfer von Projekte auf dem Mac (POST /kurztitel). Einmal formulierte Titel merkt sich Tagesplan
 * auf diesem Gerät, damit Claude jeden Titel nur einmal sieht. Ist der Helfer nicht erreichbar,
 * wird der Titel hier einfach gekürzt.
 */

/** Unter diesem Schlüssel speichert Projekte seine Daten (siehe projekte/src/api.ts). */
export const PROJECTS_KEY = 'projekte-daten'
/** Von Claude formulierte Kurztitel: Originaltitel → Kurztitel. */
export const SHORT_TITLES_KEY = 'tagesplan-kurztitel'
/** Per × ausgeblendete Vorschläge: Kennung der Projekte-Aufgabe → wann. */
export const HIDDEN_KEY = 'tagesplan-vorschlaege-ausgeblendet'
/** In „Aufschub“ verschobene Vorschläge: Kennung der Projekte-Aufgabe → wann. */
export const DEFERRED_KEY = 'tagesplan-vorschlaege-aufschub'
/** Der Helfer von Projekte auf dem Mac. */
export const HELPER_URL = 'http://127.0.0.1:3290/kurztitel'

const MAX_WORDS = 4
const MAX_LENGTH = 40

/** Eine offene Aufgabe aus Projekte, so weit Tagesplan sie braucht. */
export interface ProjectTask {
  id: string
  title: string
  date: string | null
  important: boolean
}

/** Ein Vorschlag, wie er in „Planen“ als Pille erscheint. */
export interface Suggestion {
  id: string
  /** Kurzer Titel der Hauptaufgabe (1 bis 4 Wörter). */
  title: string
  /** Der ursprüngliche Titel in Projekte (für den Tooltip). */
  source: string
}

function read<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const text = storage.getItem(key)
    return text === null ? fallback : (JSON.parse(text) as T)
  } catch {
    return fallback
  }
}

function write(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* ohne Speicher eben nur für diese Sitzung */
  }
}

/**
 * Offene Aufgaben aus Projekte: nicht erledigt und kein unbestätigter Vorschlag.
 * Wichtige zuerst, dann nach Datum (ohne Datum zuletzt), dann die älteren zuerst.
 */
export function readProjectTasks(storage: Storage): ProjectTask[] {
  const data = read<{ items?: unknown }>(storage, PROJECTS_KEY, {})
  if (!data || !Array.isArray(data.items)) return []
  const open = data.items.filter(
    (e): e is Record<string, unknown> =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).id === 'string' &&
      typeof (e as Record<string, unknown>).titel === 'string' &&
      String((e as Record<string, unknown>).titel).trim() !== '' &&
      (e as Record<string, unknown>).erledigt !== true &&
      (e as Record<string, unknown>).vorschlag !== true,
  )
  return open
    .map((e) => ({
      id: e.id as string,
      title: (e.titel as string).trim(),
      date: typeof e.datum === 'string' ? e.datum : null,
      important: e.wichtig === true,
      createdAt: typeof e.erstelltAm === 'string' ? e.erstelltAm : '',
    }))
    .sort(
      (a, b) =>
        Number(b.important) - Number(a.important) ||
        (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map(({ id, title, date, important }) => ({ id, title, date, important }))
}

/** Taugt der Text als Hauptaufgabe? 1 bis 4 Wörter, nicht zu lang. */
export function isShortTitle(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length >= 1 && words.length <= MAX_WORDS && text.trim().length <= MAX_LENGTH
}

/**
 * Notlösung ohne Claude: Klammern und alles nach Doppelpunkt, Gedankenstrich oder Komma weg,
 * dann höchstens 4 Wörter.
 */
export function fallbackShortTitle(title: string): string {
  const cut = title
    .replace(/\([^)]*\)/g, ' ')
    .split(/[:,;–—]| - /)[0]
    .replace(/[.!?]+$/, '')
    .trim()
  const words = (cut || title).split(/\s+/).filter(Boolean).slice(0, MAX_WORDS)
  const short = words.join(' ')
  return short.length <= MAX_LENGTH ? short : `${short.slice(0, MAX_LENGTH - 1).trimEnd()}…`
}

export function loadShortTitles(storage: Storage): Record<string, string> {
  const map = read<Record<string, unknown>>(storage, SHORT_TITLES_KEY, {})
  const result: Record<string, string> = {}
  for (const [title, short] of Object.entries(map ?? {})) {
    if (typeof short === 'string' && isShortTitle(short)) result[title] = short.trim()
  }
  return result
}

export function saveShortTitles(storage: Storage, add: Record<string, string>): Record<string, string> {
  const next = { ...loadShortTitles(storage) }
  for (const [title, short] of Object.entries(add)) {
    if (isShortTitle(short)) next[title] = short.trim()
  }
  write(storage, SHORT_TITLES_KEY, next)
  return next
}

export function loadHidden(storage: Storage): Record<string, number> {
  const map = read<Record<string, unknown>>(storage, HIDDEN_KEY, {})
  const result: Record<string, number> = {}
  for (const [id, at] of Object.entries(map ?? {})) if (typeof at === 'number') result[id] = at
  return result
}

export function hideSuggestion(storage: Storage, id: string, now = Date.now()): Record<string, number> {
  return hideSuggestions(storage, [id], now)
}

/** „Neue Vorschläge“: alle gerade gezeigten auf einmal ausblenden – die nächsten rücken nach. */
export function hideSuggestions(storage: Storage, ids: string[], now = Date.now()): Record<string, number> {
  const next = { ...loadHidden(storage) }
  for (const id of ids) next[id] = now
  write(storage, HIDDEN_KEY, next)
  return next
}

export function loadDeferred(storage: Storage): Record<string, number> {
  const map = read<Record<string, unknown>>(storage, DEFERRED_KEY, {})
  const result: Record<string, number> = {}
  for (const [id, at] of Object.entries(map ?? {})) if (typeof at === 'number') result[id] = at
  return result
}

/** Einen Vorschlag in „Aufschub“ legen (`true`) oder zurück zu den Vorschlägen holen (`false`). */
export function setDeferred(storage: Storage, id: string, deferred: boolean, now = Date.now()): Record<string, number> {
  const next = { ...loadDeferred(storage) }
  if (deferred) next[id] = now
  else delete next[id]
  write(storage, DEFERRED_KEY, next)
  return next
}

/**
 * Die Vorschläge für einen Tag: jede offene Projekte-Aufgabe mit ihrem Kurztitel, ohne
 * ausgeblendete und ohne solche, deren Kurztitel auf dem Tag schon steht; jeder Kurztitel einmal.
 * `dayTitleKeys` sind die Titel des Tages im Vergleichsschlüssel (siehe `recentKey`).
 */
export function suggestionsFor(
  tasks: ProjectTask[],
  shortTitles: Record<string, string>,
  hidden: Record<string, number>,
  dayTitleKeys: Set<string>,
  key: (title: string) => string,
  limit: number,
): Suggestion[] {
  const seen = new Set<string>()
  const result: Suggestion[] = []
  for (const task of tasks) {
    if (hidden[task.id] !== undefined) continue
    const title = shortTitles[task.title] ?? fallbackShortTitle(task.title)
    const k = key(title)
    if (!k || dayTitleKeys.has(k) || seen.has(k)) continue
    seen.add(k)
    result.push({ id: task.id, title, source: task.title })
    if (result.length === limit) break
  }
  return result
}

/**
 * Lässt Claude (über den Helfer von Projekte) die Titel zu Hauptaufgaben kürzen.
 * Antwort: { kurztitel: { "<Originaltitel>": "<Kurztitel>" } }. Unbrauchbares fällt weg.
 * Ist der Helfer nicht da, kommt `null` zurück – dann bleibt es bei der Notlösung.
 */
export async function requestShortTitles(
  titles: string[],
  fetcher: typeof fetch = fetch,
): Promise<Record<string, string> | null> {
  if (titles.length === 0) return {}
  try {
    const response = await fetcher(HELPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titel: titles }),
    })
    if (!response.ok) return null
    const data = (await response.json()) as { kurztitel?: Record<string, unknown> } | null
    const result: Record<string, string> = {}
    for (const title of titles) {
      const short = data?.kurztitel?.[title]
      if (typeof short === 'string' && isShortTitle(short)) result[title] = short.trim()
    }
    return result
  } catch {
    return null
  }
}
