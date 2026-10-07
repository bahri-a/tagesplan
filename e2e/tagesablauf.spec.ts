/**
 * Ein ganzer Ablauf, wie man die App benutzt: planen → Block → kurze Pause →
 * „Schon ohne App erledigt?“ → „Erledigt“ → „Morgen planen“. Dazu der schnelle Weg aus dem
 * leeren „Heute“, die Beispielaufgabe beim allerersten Start und die Fokus-Einladung per Link.
 * Die Uhr wird vorgespult.
 */
import { expect, test, type Page } from '@playwright/test'

const MIN = 60_000
const EXAMPLE = 'Tagesplan ausprobieren'

/** Jeder Test startet wie beim allerersten Mal – mit der Beispielaufgabe. Hier wird sie im Planer gelöscht. */
async function deleteExample(page: Page) {
  await page.getByRole('button', { name: 'Planer' }).click()
  await page.getByRole('button', { name: `Aufgabe „${EXAMPLE}“ löschen` }).click()
  await expect(page.getByText(EXAMPLE)).toHaveCount(0)
}

test('Aufgabe planen, Block und Pause durchlaufen, Aufgabe erledigen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')
  await deleteExample(page)

  // Planer: eine Hauptaufgabe für heute anlegen (Standard: 3 Blöcke à 25 Min., 7 Min. Pause)
  const input = page.locator('.new-task input').first()
  await input.fill('Steuererklärung')
  await input.press('Enter')

  // Heute: Die Aufgabe steht in der großen Karte
  await page.getByRole('button', { name: 'Heute', exact: true }).first().click()
  await expect(page.locator('.focus-title')).toHaveText('Steuererklärung')

  // Block 1 starten und durchlaufen lassen → kurze Pause
  await page.getByRole('button', { name: 'Starten', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()
  // Auch im niedrigen Laptop-Fenster (1280 × 720) passt die Block-Karte ganz auf den Bildschirm.
  const card = await page.locator('.focus-card').boundingBox()
  expect(card!.y + card!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await page.clock.fastForward(25 * MIN + 2000)
  await expect(page.getByText('Kurze Pause')).toBeVisible()

  // Pause vorbei → Blöcke 2 und 3 ohne App gemacht
  await page.clock.fastForward(7 * MIN + 2000)
  await expect(page.getByText('Pause vorbei')).toBeVisible()
  const alreadyDone = page.getByRole('button', { name: /Schon ohne App erledigt/ })
  await alreadyDone.click()
  await alreadyDone.click()

  // Nach dem letzten Block: Frage → Erledigt → Feierabend-Moment mit den Tageszahlen
  await expect(page.getByText('Hauptaufgabe erledigt oder noch ein Block?')).toBeVisible()
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.locator('.done-card')).toHaveCount(1)
  await expect(page.locator('.all-done-numbers')).toContainText('3 Blöcke · 1 Std. 15 Min.')

  // „Morgen planen“ führt in den Planer
  await page.getByRole('button', { name: 'Morgen planen' }).click()
  await expect(page.getByRole('button', { name: 'Planer', exact: true })).toHaveAttribute('aria-current', 'page')

  expect(errors).toEqual([])
})

test('Leeres „Heute“: Aufgabe direkt eintippen und gleich starten', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')
  await deleteExample(page)
  await page.getByRole('button', { name: 'Heute', exact: true }).first().click()

  // Leerer Tag: Es gibt noch nichts zu beenden.
  await expect(page.getByRole('button', { name: 'Tag beenden' })).toHaveCount(0)

  // Ohne Umweg über den Planer: eintippen, Enter → „Starten“ steht da
  const input = page.locator('.empty-today input')
  await input.fill('Bericht schreiben')
  await input.press('Enter')
  await expect(page.locator('.focus-title')).toHaveText('Bericht schreiben')
  await page.getByRole('button', { name: 'Starten', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()

  expect(errors).toEqual([])
})

test('Allererster Start: Beispielaufgabe ausprobieren', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')

  // Ein kurzer Block mit zwei ersten Schritten steht schon da.
  await expect(page.locator('.focus-title')).toHaveText(EXAMPLE)
  await expect(page.locator('.steps-preview-label')).toHaveText('Zum Einstieg')
  await expect(page.locator('.block-dots')).toContainText('5 Min.')

  // Starten, den ersten Schritt abhaken, Block ablaufen lassen, erledigt.
  await page.getByRole('button', { name: 'Starten', exact: true }).click()
  await page.getByRole('checkbox').first().check()
  await page.clock.fastForward(5 * MIN + 2000)
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.locator('.all-done-numbers')).toContainText('1 Block · 5 Min.')
  await expect(page.locator('.lifetime-line')).toHaveText('Bisher insgesamt: 1 Block')

  // Nach dem Neuladen kommt sie nicht noch einmal.
  await page.reload()
  await expect(page.locator('.done-card')).toHaveCount(1)
  await expect(page.locator('.focus-title')).toHaveCount(0)

  expect(errors).toEqual([])
})

test('Fokus-Einladung per Link: Block endet zur selben Minute', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  const now = new Date('2026-10-06T09:00:00').getTime()
  await page.clock.install({ time: now })
  await page.goto(`/#fokus=${now + 18 * MIN}`)

  // „Gemeinsam arbeiten“ – mit der aktuellen Hauptaufgabe (hier der Beispielaufgabe).
  const dialog = page.getByRole('dialog', { name: 'Gemeinsam arbeiten' })
  await expect(dialog).toContainText('09:18')
  await expect(dialog).toContainText(EXAMPLE)
  await dialog.getByRole('button', { name: 'Mitmachen' }).click()

  // Der Block läuft bis 9:18 (statt 5 Minuten), die Einladung ist aus der Adresse verschwunden.
  await expect(page.locator('.timer-ring-time')).toHaveText(/^(18:00|17:5\d)$/)
  expect(new URL(page.url()).hash).toBe('')

  // Einen eigenen Link verschicken: Ohne Teilen-Menü wird er kopiert.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate("Object.defineProperty(navigator, 'share', { value: undefined })")
  await page.getByRole('button', { name: 'Einladen' }).click()
  await expect(page.getByRole('button', { name: 'Link kopiert' })).toBeVisible()
  const copied = await page.evaluate<string>('navigator.clipboard.readText()')
  expect(copied).toContain(`#fokus=${now + 18 * MIN}`)

  expect(errors).toEqual([])
})
