import { describe, expect, it } from 'vitest'
import { PUBLIC_URL } from '../config/defaults'
import { inviteUrl, parseInvite } from './invite'

const NOW = 1_790_000_000_000

describe('Fokus-Einladung per Link', () => {
  it('schreibt die Endzeit (auf die Sekunde gerundet) in den Link', () => {
    expect(inviteUrl(NOW + 25 * 60_000 + 400)).toBe(`${PUBLIC_URL}#fokus=${NOW + 25 * 60_000}`)
  })

  it('liest eine laufende Einladung wieder aus', () => {
    expect(parseInvite(`#fokus=${NOW + 20 * 60_000}`, NOW)).toEqual({ status: 'open', endsAt: NOW + 20 * 60_000 })
  })

  it('erkennt einen Block, der schon vorbei ist (oder in weniger als einer Minute endet)', () => {
    expect(parseInvite(`#fokus=${NOW - 5 * 60_000}`, NOW)).toEqual({ status: 'over' })
    expect(parseInvite(`#fokus=${NOW + 30_000}`, NOW)).toEqual({ status: 'over' })
  })

  it('übergeht fremde oder kaputte Adressen', () => {
    expect(parseInvite('', NOW)).toBeNull()
    expect(parseInvite('#notizen', NOW)).toBeNull()
    expect(parseInvite('#fokus=morgen', NOW)).toBeNull()
    expect(parseInvite(`#fokus=${NOW + 5 * 60 * 60_000}`, NOW)).toBeNull()
  })
})
