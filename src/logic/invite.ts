/**
 * FOKUS-EINLADUNG PER LINK
 * Wer einen Block laufen hat, kann einen Link schicken: …/tagesplan/#fokus=<Endzeit in ms>.
 * Wer ihn öffnet, startet einen Block, der zur selben Minute endet – gemeinsam arbeiten,
 * ohne Konto und ohne Server. Im Link steht nur die Endzeit, kein Titel.
 */

import { PUBLIC_URL, SETTINGS_LIMITS } from '../config/defaults'

const PREFIX = '#fokus='
/** Weniger als eine Minute übrig: Mitmachen lohnt sich nicht mehr. */
export const INVITE_MIN_MS = 60_000
/** Länger als der längste erlaubte Block: kein echter Link. */
const INVITE_MAX_MS = SETTINGS_LIMITS.blockMinutes.max * 60_000

/** Der Link zum Teilen. Die Endzeit wird auf die Sekunde gerundet. */
export function inviteUrl(endsAt: number): string {
  return `${PUBLIC_URL}${PREFIX}${Math.round(endsAt / 1000) * 1000}`
}

export type Invite = { status: 'open'; endsAt: number } | { status: 'over' }

/**
 * Liest eine Einladung aus der Adresse (location.hash). `null`, wenn keine (oder eine kaputte) drin ist.
 * `over`: Der Block ist schon vorbei (oder fast).
 */
export function parseInvite(hash: string, now: number): Invite | null {
  if (!hash.startsWith(PREFIX)) return null
  const value = hash.slice(PREFIX.length)
  if (!/^\d{10,15}$/.test(value)) return null
  const endsAt = Number(value)
  const left = endsAt - now
  if (left > INVITE_MAX_MS) return null
  if (left < INVITE_MIN_MS) return { status: 'over' }
  return { status: 'open', endsAt }
}

/** Uhrzeit für den Text, z. B. „14:20“. */
export function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}
