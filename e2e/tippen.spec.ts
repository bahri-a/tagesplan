/**
 * Tippen im Planer: Titel, Startsignal und Schritte werden erst nach einer kurzen Pause, beim
 * Verlassen des Feldes oder beim Zuklappen gespeichert – nichts geht dabei verloren.
 * Ein leerer Titel wird nicht gespeichert.
 */
import { expect, test, type Page } from '@playwright/test'

async function openPlanner(page: Page) {
  await page.getByRole('button', { name: 'Planer' }).click()
}

test('Titel und Schritte: gespeichert beim Zuklappen, leerer Titel kommt zurück', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('Service Worker')) problems.push(m.text())
  })
  await page.goto('/')
  await openPlanner(page)

  // Neue Aufgabe: Die Karte klappt auf, der erste Schritt wird gleich eingetippt.
  const input = page.locator('.new-task input').first()
  await input.fill('Bericht')
  await input.press('Enter')
  await page.keyboard.type('PDF öffnen')
  await page.keyboard.press('Enter')
  const card = page.locator('.task-card.is-expanded')
  await expect(card.locator('.step-text-input')).toHaveValue('PDF öffnen')

  // Leerer Titel: beim Verlassen des Feldes steht wieder der alte da.
  const title = card.getByRole('textbox', { name: 'Titel' })
  await title.fill('')
  await title.press('Tab')
  await expect(title).toHaveValue('Bericht')

  // Tippen und sofort zuklappen – der neue Titel und der geänderte Schritt sind gespeichert.
  await title.fill('Bericht schreiben')
  await card.locator('.step-text-input').fill('PDF suchen')
  await card.getByRole('button', { name: 'Zuklappen' }).click()
  await expect(page.locator('.task-title', { hasText: 'Bericht schreiben' })).toHaveCount(1)

  // Auch nach dem Neuladen.
  await page.reload()
  await openPlanner(page)
  await page.locator('.task-card-summary', { hasText: 'Bericht schreiben' }).click()
  await expect(page.locator('.task-card.is-expanded .step-text-input')).toHaveValue('PDF suchen')

  expect(problems).toEqual([])
})
