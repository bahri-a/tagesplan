/**
 * Ein ganzer Ablauf, wie man die App benutzt: planen → Block → kurze Pause →
 * „Habe ich bereits erledigt …“ → „Erledigt“ → „Morgen planen“. Dazu der schnelle Weg aus dem
 * leeren „Heute“. Die Uhr wird vorgespult.
 */
import { expect, test } from '@playwright/test'

const MIN = 60_000

test('Aufgabe planen, Block und Pause durchlaufen, Aufgabe erledigen', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')

  // Planer: eine Hauptaufgabe für heute anlegen (Standard: 3 Blöcke à 25 Min., 7 Min. Pause)
  await page.getByRole('button', { name: 'Planer' }).click()
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
  const alreadyDone = page.getByRole('button', { name: /Habe ich bereits erledigt/ })
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

  // Ohne Umweg über den Planer: eintippen, Enter → „Starten“ steht da
  const input = page.locator('.empty-today input')
  await input.fill('Bericht schreiben')
  await input.press('Enter')
  await expect(page.locator('.focus-title')).toHaveText('Bericht schreiben')
  await page.getByRole('button', { name: 'Starten', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()

  expect(errors).toEqual([])
})
