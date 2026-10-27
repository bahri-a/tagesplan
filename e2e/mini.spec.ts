/**
 * Mini-Fenster (Bild-im-Bild): Chrome zeigt es im Test nicht – ein normales Pop-up-Fenster
 * spielt es nach (gleiches Prinzip: eigenes Dokument, derselbe App-Zustand).
 */
import { expect, test } from '@playwright/test'

const MIN = 60_000

test('Mini-Fenster: Pause überspringen (mit Rückgängig) und Gedanke parken (N)', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(`window.documentPictureInPicture = {
    window: null,
    requestWindow: async ({ width, height }) => window.open('', 'mini', 'popup,width=' + width + ',height=' + height),
  }`)
  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  await page.goto('/')
  // Beispielaufgabe: 1 Block → für eine Pause 2 Blöcke
  await page.getByRole('button', { name: 'Planer' }).click()
  const input = page.locator('.new-task input').first()
  await input.fill('Bericht')
  await input.press('Enter')
  await page.getByRole('button', { name: 'Aufgabe „Tagesplan ausprobieren“ löschen' }).click()
  await page.getByRole('button', { name: 'Heute', exact: true }).first().click()
  await page.getByRole('button', { name: 'Starten', exact: true }).click()

  const popupPromise = context.waitForEvent('page')
  await page.locator('.mini-button').click()
  const mini = await popupPromise
  await mini.setViewportSize({ width: 300, height: 400 })
  await expect(mini.locator('.timer-ring')).toBeVisible()
  await page.clock.fastForward(25 * MIN + 2000)
  await expect(mini.getByText('Kurze Pause')).toBeVisible()
  await mini.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/mini-pause.png` : undefined })
  // Sofort übersprungen – mit „Rückgängig“ in der Meldung, ebenfalls im Mini-Fenster.
  await mini.getByRole('button', { name: 'Pause überspringen' }).click()
  await expect(mini.getByText('Pause vorbei')).toBeVisible()
  await mini.waitForTimeout(400) // Meldung ganz eingeblendet
  await mini.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/mini-rueckgaengig.png` : undefined })
  await mini.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(mini.getByText('Kurze Pause')).toBeVisible()
  await mini.getByRole('button', { name: 'Pause überspringen' }).click()
  await expect(mini.getByText('Pause vorbei')).toBeVisible()

  // Taste N im Mini-Fenster: Gedanke parken → landet im Notizzettel.
  await mini.keyboard.press('n')
  await mini.getByRole('textbox', { name: 'Gedanke parken' }).fill('Mama anrufen')
  await mini.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/mini-parken.png` : undefined })
  await mini.keyboard.press('Enter')
  // Hier ist nur Platz für eine Meldung: „Geparkt“ wartet, bis „Rückgängig“ vorbei ist.
  await expect(mini.getByRole('button', { name: 'Rückgängig' })).toBeVisible()
  await page.clock.fastForward(9_000)
  await expect(mini.getByText('Geparkt. Weiter geht’s.')).toBeVisible()
  await page.getByRole('button', { name: 'Notizen' }).click()
  await expect(page.locator('.notes-text')).toHaveValue('Mama anrufen')
  expect(errors).toEqual([])
})
