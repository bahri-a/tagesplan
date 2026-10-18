import { describe, expect, it } from 'vitest'
import { autoBackupName, autoBackupsToRemove } from './autoBackup'

describe('tägliche Sicherung', () => {
  it('benennt die Datei nach dem Tag', () => {
    expect(autoBackupName('2026-10-12')).toBe('tagesplan-2026-10-12.json')
  })

  it('behält die neuesten 7 und löscht die älteren', () => {
    const names = Array.from({ length: 9 }, (_, i) => autoBackupName(`2026-10-${String(i + 1).padStart(2, '0')}`))
    expect(autoBackupsToRemove(names)).toEqual(['tagesplan-2026-10-02.json', 'tagesplan-2026-10-01.json'])
  })

  it('lässt fremde Dateien in Ruhe', () => {
    const names = ['notizen.txt', 'tagesplan-sicherung-2026-01-01.json', autoBackupName('2026-10-12')]
    expect(autoBackupsToRemove(names, { daily: 0, weekly: 0, monthly: 0 })).toEqual(['tagesplan-2026-10-12.json'])
  })

  it('löscht nichts, solange es höchstens 7 sind', () => {
    expect(autoBackupsToRemove([autoBackupName('2026-10-12')])).toEqual([])
  })

  it('reicht weit zurück: 7 Tage, 4 Wochen, 6 Monate – höchstens 17 Dateien', () => {
    // Ein ganzes Jahr lang jeden Tag eine Sicherung (bis 18.10.2026).
    const names: string[] = []
    for (let t = Date.UTC(2025, 9, 19); t <= Date.UTC(2026, 9, 18); t += 86_400_000) {
      names.push(autoBackupName(new Date(t).toISOString().slice(0, 10)))
    }
    const removed = new Set(autoBackupsToRemove(names))
    const kept = names.filter((n) => !removed.has(n)).map((n) => n.slice(10, 20))
    expect(kept.length).toBeLessThanOrEqual(17)
    // die letzten 7 Tage
    for (let d = 12; d <= 18; d++) expect(kept).toContain(`2026-10-${d}`)
    // je der Sonntag der letzten Wochen (neueste Datei der Woche) …
    expect(kept).toContain('2026-10-11')
    expect(kept).toContain('2026-10-04')
    expect(kept).toContain('2026-09-27')
    expect(kept).not.toContain('2026-09-20')
    // … und der letzte Tag der letzten Monate
    expect(kept).toContain('2026-09-30')
    expect(kept).toContain('2026-05-31')
    expect(kept).not.toContain('2026-04-30')
    expect(kept).not.toContain('2026-09-13')
  })
})
