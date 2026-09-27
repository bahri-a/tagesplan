/**
 * Hilfen zum Anlegen und Ändern von Einträgen.
 */

import type { BaseRecord } from '../model/types'

/** Neue, weltweit eindeutige ID. */
export function newId(): string {
  return crypto.randomUUID()
}

/** Die Grundfelder für einen neuen Eintrag. */
export function baseFields(now: number): BaseRecord {
  return { id: newId(), createdAt: now, updatedAt: now, deletedAt: null }
}

/** Filtert gelöschte Einträge heraus. */
export function alive<T extends BaseRecord>(records: Iterable<T>): T[] {
  return [...records].filter((r) => r.deletedAt === null)
}

/** Sortiert nach `position`. */
export function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position)
}
