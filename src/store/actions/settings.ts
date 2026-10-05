/**
 * AKTIONEN: EINSTELLUNGEN UND NOTIZZETTEL
 */

import { SETTINGS_LIMITS } from '../../config/defaults'
import { stripStartCuePrefix } from '../../logic/variety'
import type { SettingsValues } from '../../model/types'
import { recentKey } from '../selectors'
import { commit, getState } from '../store'
import { clamp } from './helpers'
import { confirmBreak } from './timer'

export function updateSettings(patch: Partial<SettingsValues>): void {
  const current = getState().settings
  const next = { ...current, ...patch }
  for (const key of Object.keys(SETTINGS_LIMITS) as (keyof typeof SETTINGS_LIMITS)[]) {
    const { min, max } = SETTINGS_LIMITS[key]
    next[key] = clamp(Math.round(Number(next[key]) || min), min, max)
  }
  // Ultra-Modus aus, während eine Pause auf Bestätigung wartet → die Pause beginnt jetzt.
  if (current.ultraMode && !next.ultraMode) confirmBreak()
  commit({ settings: next })
}

/**
 * Häkchen unter dem Startsignal: Diesen Satz für alle neuen Hauptaufgaben merken (`null` = vergessen).
 * Bestehende Aufgaben bleiben unverändert.
 */
export function rememberStartCue(cue: string | null): void {
  const current = getState().settings
  const clean = cue === null ? null : stripStartCuePrefix(cue).trim() || null
  commit({ settings: { ...current, defaultStartCue: clean } })
}

/**
 * × in „Zuletzt verwendet“: diesen Titel dort nicht mehr anbieten. Die Aufgaben selbst bleiben
 * unverändert. Wird eine Aufgabe mit diesem Titel später wieder benutzt, taucht sie wieder auf.
 */
export function hideRecentTask(title: string, now = Date.now()): void {
  const current = getState().settings
  commit({ settings: { ...current, recentHidden: { ...current.recentHidden, [recentKey(title)]: now } } })
}

/** „Reset“ in „Zuletzt verwendet“: alle Titel auf einmal ausblenden (wie × bei jedem einzelnen). */
export function hideAllRecentTasks(titles: string[], now = Date.now()): void {
  const current = getState().settings
  const recentHidden = { ...current.recentHidden }
  for (const title of titles) recentHidden[recentKey(title)] = now
  commit({ settings: { ...current, recentHidden } })
}

export function updateNote(text: string): void {
  commit({ note: { ...getState().note, text } })
}

/** Taste N: einen Gedanken als neue Zeile unten an den Notizzettel hängen. */
export function parkThought(thought: string): void {
  const text = thought.trim()
  if (!text) return
  const current = getState().note.text.replace(/\s+$/, '')
  updateNote(current ? `${current}\n${text}` : text)
}
