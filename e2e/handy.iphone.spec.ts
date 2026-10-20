/**
 * iPhone (WebKit, wie in der iPhone-App): Planer mit Umschalter Heute | Morgen, eine Aufgabe als
 * eigenes Blatt und der Block in der ruhigen Vollbild-Ansicht.
 * Die Uhr wird vorgespult.
 */
import { expect, test, type Page } from '@playwright/test'

const MIN = 60_000
const EXAMPLE = 'Tagesplan ausprobieren'

/** Wie jeder Start: einmal laden, Uhr fest auf 9 Uhr, Fehler mitschreiben. */
async function open(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install({ time: new Date('2026-10-06T09:00:00') })
  // Die Erklärung vor der Frage nach Mitteilungen (eigener Test am Mac) hier einfach wegtippen.
  await page.addLocatorHandler(page.getByRole('dialog', { name: 'Eine Sache vorab' }), async (dialog) => {
    await dialog.getByRole('button', { name: 'Weiter' }).tap()
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-device', 'mobile')
  return errors
}

/** Unten in der Leiste: Planer, Heute, Einstellungen. */
function nav(page: Page, name: string) {
  return page.locator('.nav').getByRole('button', { name, exact: true })
}

test('Planer: Heute | Morgen umschalten und eine Aufgabe für morgen planen', async ({ page }) => {
  const errors = await open(page)
  await nav(page, 'Planer').tap()

  const tabs = page.getByRole('tablist')
  const todayTab = tabs.getByRole('tab', { name: /^Heute/ })
  const tomorrowTab = tabs.getByRole('tab', { name: /^Morgen/ })
  await expect(todayTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText(EXAMPLE)).toBeVisible()

  // Morgen: leer, eine Aufgabe eintippen – nur ein Tag ist zu sehen.
  await tomorrowTab.tap()
  await expect(tomorrowTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText(EXAMPLE)).toHaveCount(0)
  const input = page.locator('.new-task input')
  await expect(input).toHaveCount(1)
  await input.fill('Wochenplan')
  await input.press('Enter')
  // Neue Aufgabe öffnet sich gleich als Blatt – zuklappen.
  await page.locator('.task-editor-close').tap()
  await expect(page.locator('.task-card', { hasText: 'Wochenplan' })).toBeVisible()
  await expect(tomorrowTab).toContainText('1')

  // Zurück auf Heute: die Beispielaufgabe ist wieder da, „Wochenplan“ nicht.
  await todayTab.tap()
  const columns = page.locator('.plan-columns')
  await expect(columns.getByText(EXAMPLE)).toBeVisible()
  await expect(columns.getByText('Wochenplan')).toHaveCount(0)

  // Nichts ragt seitlich aus dem Bildschirm.
  expect(await page.evaluate<number>('document.documentElement.scrollWidth')).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(errors).toEqual([])
})

test('Aufgabe öffnet als eigenes Blatt über dem ganzen Bildschirm', async ({ page }) => {
  const errors = await open(page)
  await nav(page, 'Planer').tap()

  await page.locator('.task-card-summary', { hasText: EXAMPLE }).tap()
  const sheet = page.locator('.task-card.is-expanded')
  await expect(sheet).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-sheet', 'open')
  // Das Blatt füllt den Bildschirm (nach dem kurzen Hereingleiten), die Leiste oben tritt zurück.
  await expect.poll(async () => (await sheet.boundingBox())!.y).toBe(0)
  const box = (await sheet.boundingBox())!
  const view = page.viewportSize()!
  expect(box.x).toBe(0)
  expect(Math.round(box.width)).toBe(view.width)
  expect(Math.round(box.height)).toBe(view.height)
  await expect(page.locator('.topbar')).toBeHidden()

  // Titel ändern, zuklappen: gespeichert, Blatt zu, Leiste wieder da.
  const title = sheet.locator('input').first()
  await title.fill('Tagesplan kennenlernen')
  await sheet.locator('.task-editor-close').tap()
  await expect(sheet).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-sheet', 'open')
  await expect(page.locator('.topbar')).toBeVisible()
  await expect(page.locator('.task-card-summary', { hasText: 'Tagesplan kennenlernen' })).toBeVisible()

  expect(errors).toEqual([])
})

test('Block im Vollbild: ruhige Ansicht, Antippen zeigt die Knöpfe, danach Pause', async ({ page }) => {
  const errors = await open(page)
  await expect(page.locator('.focus-title')).toHaveText(EXAMPLE)

  await page.getByRole('button', { name: 'Starten', exact: true }).tap()
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-focus', 'on')
  // Ring und Zeit stehen frei, ganz im Bild.
  const ring = page.locator('.timer-ring')
  await expect(ring).toBeInViewport({ ratio: 1 })
  // Die Uhr läuft echt weiter – bis hierher kann auf dem langsamen Prüfrechner eine Sekunde vergehen.
  await expect(page.locator('.timer-ring-time')).toHaveText(/^(5:00|4:5\d)$/)

  // Nach ein paar Sekunden treten die Knöpfe zurück, ein Tippen holt sie wieder.
  await page.clock.fastForward(10_000)
  await expect(html).not.toHaveAttribute('data-focus-controls', /./)
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeHidden()
  await ring.tap()
  await expect(html).toHaveAttribute('data-focus-controls', 'shown')
  await expect(page.getByRole('button', { name: 'Früher fertig' })).toBeVisible()

  // Block abgelaufen → Frage, die Vollbild-Ansicht ist vorbei.
  await page.clock.fastForward(5 * MIN)
  await expect(page.locator('.ask-done-question')).toBeVisible()
  await expect(html).not.toHaveAttribute('data-focus', 'on')
  await page.getByRole('button', { name: 'Erledigt', exact: true }).tap()
  await expect(page.locator('.all-done-numbers')).toContainText('1 Block · 5 Min.')
  // „Doch nicht erledigt“ steht über dem Haken, nicht darauf.
  const back = (await page.locator('.all-done .back-to-ask').boundingBox())!
  const mark = (await page.locator('.all-done .message-mark').boundingBox())!
  expect(back.y + back.height).toBeLessThanOrEqual(mark.y)

  expect(errors).toEqual([])
})
