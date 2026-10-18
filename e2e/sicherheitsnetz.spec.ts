/**
 * Sicherheitsnetz: Rückgängig nach Aktionen im Block, eine ruhige Karte, wenn sich die Daten beim
 * Start nicht öffnen lassen, und ein Fehler in einem Bildschirm hält den Timer nicht an.
 */
import { expect, test } from '@playwright/test'

const MIN = 60_000

test('„Früher fertig“ und „Schon ohne App erledigt?“ lassen sich rückgängig machen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')

  // Beispielaufgabe: ein Block à 5 Min.
  await page.getByRole('button', { name: 'Starten', exact: true }).click()
  await page.clock.fastForward(MIN)
  await page.getByRole('button', { name: 'Früher fertig' }).click()
  await expect(page.locator('.ask-done-question')).toBeVisible()
  await expect(page.locator('.toast')).toContainText('Block abgeschlossen')
  await page.waitForTimeout(400) // Meldung ganz eingeblendet
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/frueher-fertig-rueckgaengig.png` : undefined })

  // Verklickt → der Block läuft einfach weiter (mit der Zeit, die schon vergangen ist).
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()
  await expect(page.locator('.timer-ring-time')).toHaveText(/^3:5\d$/)

  // Dasselbe für „Schon ohne App erledigt?“ im Block.
  await page.getByRole('button', { name: /Schon ohne App erledigt/ }).click()
  await expect(page.locator('.ask-done-question')).toBeVisible()
  await expect(page.locator('.toast')).toContainText('Block eingetragen')
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()

  // Nach dem Ablauf zählt genau ein Block.
  await page.clock.fastForward(5 * MIN)
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.locator('.lifetime-line')).toHaveText('Bisher insgesamt: 1 Block')

  expect(errors).toEqual([])
})

test('Meilenstein kommt dazu, „Rückgängig“ bleibt erreichbar', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')

  // Neun Blöcke ohne App eintragen (Beispielaufgabe, jedes Mal „Noch ein Block“, Pause abwarten).
  const alreadyDone = page.getByRole('button', { name: /Schon ohne App erledigt/ })
  for (let i = 0; i < 9; i++) {
    await alreadyDone.click()
    await page.getByRole('button', { name: 'Noch ein Block', exact: true }).click()
    await page.clock.fastForward(10 * MIN)
  }
  // Der zehnte per „Früher fertig“ → Meilenstein und „Block abgeschlossen · Rückgängig“ übereinander.
  await page.getByRole('button', { name: /Block starten|^Starten$/ }).first().click()
  await page.clock.fastForward(MIN)
  await page.getByRole('button', { name: 'Früher fertig' }).click()
  const toasts = page.locator('.toast-stack > .toast')
  await expect(toasts).toHaveCount(2)
  await expect(toasts.filter({ hasText: 'Block abgeschlossen' })).toBeVisible()
  await expect(toasts.filter({ hasText: '10' })).toBeVisible()
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()

  expect(errors).toEqual([])
})

test('Daten lassen sich beim Start nicht öffnen → ruhige Karte statt weißer Seite', async ({ page }) => {
  await page.addInitScript(`indexedDB.open = () => {
    throw new Error('Connection to Indexed Database server lost')
  }`)
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Deine Daten ließen sich gerade nicht öffnen.')
  await expect(page.getByRole('alert')).toContainText('Sie sind nicht weg.')
  await expect(page.getByRole('button', { name: 'Neu laden' })).toBeVisible()
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/start-fehlgeschlagen.png` : undefined })
})

test('Fehler im Planer: nur dort eine Karte – der Block endet trotzdem mit Signal', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // Der Planer lässt sich nicht laden (z. B. nach einem Update ohne Verbindung).
  await page.route(/PlanScreen-.*\.js$/, (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Planer kaputt")' }),
  )
  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Starten', exact: true }).click()

  await page.getByRole('button', { name: 'Planer' }).click()
  await expect(page.getByRole('alert')).toContainText('Hier ist etwas schiefgelaufen.')
  // Kopfleiste und Timer-Anzeige oben rechts bleiben.
  await expect(page.locator('.timer-pill')).toContainText('Block')
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/planer-fehler.png` : undefined })

  // Der Block läuft ab: Der Motor schaltet weiter und gibt Bescheid (dieselbe Stelle spielt den
  // Ton und schickt die Mitteilung – hier sichtbar an der Ansage für VoiceOver).
  await page.clock.fastForward(5 * MIN + 2000)
  await expect(page.locator('[role="status"][aria-live]')).toContainText('Block geschafft')
  await expect(page.locator('.timer-pill')).toHaveCount(0)
  await expect(page).toHaveTitle('Tagesplan')
  await page.getByRole('button', { name: 'Heute', exact: true }).first().click()
  await expect(page.locator('.ask-done-question')).toHaveText('Hauptaufgabe erledigt oder noch ein Block?')
  expect(errors.filter((e) => !e.includes('Planer kaputt'))).toEqual([])
})

test('Wiederherstellen: erst zeigen, was drin ist – die App hat neuere Daten', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install({ time: new Date('2026-10-18T09:00:00') })
  await page.goto('/')
  await expect(page.locator('.focus-title')).toHaveText('Tagesplan ausprobieren')

  // Eine Sicherung von vor einer Stunde – damals noch ohne Aufgaben.
  const backup = await page.evaluate<string>(`(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('tagesplan'); q.onsuccess = () => r(q.result) })
    const all = (name) => new Promise((r) => { const q = db.transaction(name).objectStore(name).getAll(); q.onsuccess = () => r(q.result) })
    const data = {}
    for (const n of ['days', 'tasks', 'steps', 'blocks', 'settings', 'notes']) data[n] = await all(n)
    data.tasks = []
    data.steps = []
    return JSON.stringify({ app: 'tagesplan', schemaVersion: 2, exportedAt: new Date(Date.now() - 3600000).toISOString(), data })
  })()`)
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'sicherung.json', mimeType: 'application/json', buffer: Buffer.from(backup) })

  const dialog = page.getByRole('dialog', { name: 'Sicherung wiederherstellen?' })
  await expect(dialog).toContainText('In der Sicherung:2 Tage · 0 Aufgaben · 0 Blöcke')
  await expect(dialog).toContainText('Jetzt in der App:2 Tage · 1 Aufgabe · 0 Blöcke')
  await expect(dialog).toContainText('Achtung: Die App hat neuere Daten als die Sicherung.')

  // Vorher wird der jetzige Stand als Datei gesichert, dann ersetzt.
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Ja, wiederherstellen' }).click()
  expect((await download).suggestedFilename()).toMatch(/^tagesplan-vor-wiederherstellen-.*\.json$/)
  await expect(page.getByText('Fertig – deine Sicherung ist wiederhergestellt.')).toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).first().click()
  await expect(page.locator('.empty-today')).toBeVisible()

  expect(errors).toEqual([])
})
