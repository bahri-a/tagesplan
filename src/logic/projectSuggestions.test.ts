import { describe, expect, it } from 'vitest'
import {
  fallbackShortTitle,
  hideSuggestion,
  isShortTitle,
  loadShortTitles,
  PROJECTS_KEY,
  readProjectTasks,
  requestShortTitles,
  saveShortTitles,
  suggestionsFor,
} from './projectSuggestions'

/** Einfacher Speicher wie localStorage, nur im Test. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

const item = (id: string, titel: string, extra: Record<string, unknown> = {}) => ({
  id,
  titel,
  info: '',
  datum: null,
  uhrzeit: null,
  wichtig: false,
  erledigt: false,
  erstelltAm: '2026-09-01T10:00:00.000Z',
  erledigtAm: null,
  quelle: 'manuell',
  quellId: null,
  bereich: 'eigen',
  vorschlag: false,
  ...extra,
})

const key = (t: string) => t.trim().toLocaleLowerCase('de')

describe('Vorschläge aus Projekte', () => {
  it('liest nur offene, angenommene Aufgaben – wichtige zuerst, dann nach Datum', () => {
    const storage = memoryStorage({
      [PROJECTS_KEY]: JSON.stringify({
        version: 1,
        items: [
          item('a', 'Ohne Datum'),
          item('b', 'Später', { datum: '2026-10-20' }),
          item('c', 'Bald', { datum: '2026-10-02' }),
          item('d', 'Wichtig', { wichtig: true }),
          item('e', 'Erledigt', { erledigt: true }),
          item('f', 'Unbestätigt', { bereich: 'automatisch', vorschlag: true }),
          item('g', '   '),
        ],
        geloeschteQuellen: [],
      }),
    })
    expect(readProjectTasks(storage).map((t) => t.title)).toEqual(['Wichtig', 'Bald', 'Später', 'Ohne Datum'])
  })

  it('kommt ohne oder mit kaputten Projekte-Daten zurecht', () => {
    expect(readProjectTasks(memoryStorage())).toEqual([])
    expect(readProjectTasks(memoryStorage({ [PROJECTS_KEY]: '{kaputt' }))).toEqual([])
    expect(readProjectTasks(memoryStorage({ [PROJECTS_KEY]: '{"items":5}' }))).toEqual([])
  })

  it('kürzt ohne Claude auf höchstens 4 Wörter', () => {
    expect(fallbackShortTitle('Hausarbeit abgeben')).toBe('Hausarbeit abgeben')
    expect(fallbackShortTitle('Steuererklärung 2025: Belege sammeln und hochladen')).toBe('Steuererklärung 2025')
    expect(fallbackShortTitle('Mit Vermieter über die Heizung im Bad sprechen')).toBe('Mit Vermieter über die')
    expect(fallbackShortTitle('Arzttermin (Hausarzt) vereinbaren.')).toBe('Arzttermin vereinbaren')
    expect(isShortTitle('Eins zwei drei vier')).toBe(true)
    expect(isShortTitle('Eins zwei drei vier fünf')).toBe(false)
    expect(isShortTitle('  ')).toBe(false)
  })

  it('nimmt Claudes Kurztitel, lässt Ausgeblendetes und schon Geplantes weg', () => {
    const tasks = [
      { id: 'a', title: 'Die Hausarbeit in Statistik fertig schreiben und abgeben', date: null, important: true },
      { id: 'b', title: 'PC zusammenbauen', date: null, important: false },
      { id: 'c', title: 'Wohnung putzen', date: null, important: false },
      { id: 'd', title: 'Hausarbeit Statistik abgeben!', date: null, important: false },
    ]
    const short = { [tasks[0].title]: 'Hausarbeit abgeben', [tasks[3].title]: 'hausarbeit abgeben' }
    const result = suggestionsFor(tasks, short, { c: 1 }, new Set(['pc zusammenbauen']), key, 8)
    expect(result).toEqual([{ id: 'a', title: 'Hausarbeit abgeben', source: tasks[0].title }])
  })

  it('merkt sich Kurztitel und Ausgeblendetes, verwirft zu lange Kurztitel', () => {
    const storage = memoryStorage()
    saveShortTitles(storage, { 'A lang': 'A', 'B lang': 'viel zu viele Wörter für eine Pille' })
    expect(loadShortTitles(storage)).toEqual({ 'A lang': 'A' })
    expect(hideSuggestion(storage, 'x', 5)).toEqual({ x: 5 })
  })

  it('fragt den Helfer und nimmt nur passende Antworten', async () => {
    let sent: unknown = null
    const fetcher = (async (_url: string, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ kurztitel: { Eins: 'Kurz eins', Zwei: 'eins zwei drei vier fünf' } }))
    }) as typeof fetch
    expect(await requestShortTitles(['Eins', 'Zwei'], fetcher)).toEqual({ Eins: 'Kurz eins' })
    expect(sent).toEqual({ titel: ['Eins', 'Zwei'] })

    const offline = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    expect(await requestShortTitles(['Eins'], offline)).toBeNull()
  })
})
