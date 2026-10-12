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
    expect(autoBackupsToRemove(names, 0)).toEqual(['tagesplan-2026-10-12.json'])
  })

  it('löscht nichts, solange es höchstens 7 sind', () => {
    expect(autoBackupsToRemove([autoBackupName('2026-10-12')])).toEqual([])
  })
})
