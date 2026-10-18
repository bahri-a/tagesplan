import { describe, expect, it } from 'vitest'
import { dropToast, emptyToasts, pushToast, type StackedToast, type ToastKind } from './toasts'

const t = (id: number, kind?: ToastKind): StackedToast => ({ id, kind })
const ids = (list: StackedToast[]) => list.map((x) => x.id)

describe('pushToast', () => {
  it('zeigt bis zu zwei Meldungen übereinander', () => {
    let s = pushToast(emptyToasts(), t(1, 'undo'))
    s = pushToast(s, t(2))
    expect(ids(s.visible)).toEqual([1, 2])
    expect(s.waiting).toEqual([])
  })

  it('gleiche Art ersetzt gleiche Art', () => {
    let s = pushToast(emptyToasts(), t(1, 'undo'))
    s = pushToast(s, t(2))
    s = pushToast(s, t(3, 'undo'))
    expect(ids(s.visible)).toEqual([2, 3])
  })

  it('der Meilenstein verdrängt „Rückgängig“ nicht', () => {
    let s = pushToast(emptyToasts(), t(1, 'undo'))
    s = pushToast(s, t(2, 'error'))
    s = pushToast(s, t(3, 'info'))
    expect(ids(s.visible)).toEqual([1, 2])
    expect(ids(s.waiting)).toEqual([3])
  })

  it('eine wichtige Meldung schiebt eine leise in die Warteschlange', () => {
    let s = pushToast(emptyToasts(), t(1, 'info'))
    s = pushToast(s, t(2, 'error'))
    s = pushToast(s, t(3, 'undo'))
    expect(ids(s.visible)).toEqual([2, 3])
    expect(ids(s.waiting)).toEqual([1])
  })

  it('mit nur einem Platz (Mini-Fenster): leise wartet hinter „Rückgängig“', () => {
    let s = pushToast(emptyToasts(), t(1, 'undo'), 1)
    s = pushToast(s, t(2), 1)
    expect(ids(s.visible)).toEqual([1])
    expect(ids(s.waiting)).toEqual([2])
    s = pushToast(s, t(3, 'error'), 1)
    expect(ids(s.visible)).toEqual([3])
  })
})

describe('dropToast', () => {
  it('lässt eine wartende Meldung nachrücken', () => {
    let s = pushToast(emptyToasts(), t(1, 'undo'))
    s = pushToast(s, t(2, 'error'))
    s = pushToast(s, t(3))
    s = dropToast(s, 1)
    expect(ids(s.visible)).toEqual([2, 3])
    expect(s.waiting).toEqual([])
  })

  it('unbekannte Id ändert nichts', () => {
    const s = pushToast(emptyToasts(), t(1))
    expect(ids(dropToast(s, 9).visible)).toEqual([1])
  })
})
