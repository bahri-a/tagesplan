/**
 * Ein ganzer Ablauf, wie man die App benutzt: planen → Block → kurze Pause →
 * „Habe ich bereits erledigt …“ → „Erledigt“. Die Uhr wird vorgespult.
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
  await page.clock.fastForward(25 * MIN + 2000)
  await expect(page.getByText('Kurze Pause')).toBeVisible()

  // Pause vorbei → Blöcke 2 und 3 ohne App gemacht
  await page.clock.fastForward(7 * MIN + 2000)
  await expect(page.getByText('Pause vorbei')).toBeVisible()
  const alreadyDone = page.getByRole('button', { name: /Habe ich bereits erledigt/ })
  await alreadyDone.click()
  await alreadyDone.click()

  // Nach dem letzten Block: Frage → Erledigt
  await expect(page.getByText('Hauptaufgabe erledigt oder noch ein Block?')).toBeVisible()
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.locator('.day-pill.is-done')).toHaveCount(1)

  expect(errors).toEqual([])
})
