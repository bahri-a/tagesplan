/**
 * Zwei offene Fenster: Beide zeigen sofort dasselbe, keines überschreibt das andere mit einem
 * alten Stand, und das Blockende kommt nur einmal (ein Ton, ein eingetragener Block).
 */
import { expect, test, type Page } from '@playwright/test'

const MIN = 60_000
const START = new Date('2026-10-06T09:00:00')

/** Zählt, wie oft in diesem Fenster ein Ton gespielt wird (jeder Ton hat genau einen Filter). */
const COUNT_SOUNDS = `
  window.__sounds = 0
  const original = AudioContext.prototype.createBiquadFilter
  AudioContext.prototype.createBiquadFilter = function () { window.__sounds++; return original.call(this) }
`

async function open(page: Page) {
  await page.addInitScript(COUNT_SOUNDS)
  await page.goto('/')
  await expect(page.locator('.focus-title')).toHaveText('Tagesplan ausprobieren')
}

/** Wie viele durchgehaltene Blöcke stehen in der Datenbank? */
function storedBlocks(page: Page): Promise<number> {
  return page.evaluate(`new Promise((resolve) => {
    const request = indexedDB.open('tagesplan')
    request.onsuccess = () => {
      const all = request.result.transaction('blocks').objectStore('blocks').getAll()
      all.onsuccess = () => resolve(all.result.filter((b) => b.status === 'completed' && b.deletedAt === null).length)
    }
  })`)
}

test('Zwei Fenster: gleicher Stand, nichts wird überschrieben, Blockende nur einmal', async ({ context }) => {
  const errors: string[] = []
  // Eine gemeinsame (vorgespulte) Uhr für beide Fenster.
  await context.clock.install({ time: START })
  const a = await context.newPage()
  a.on('pageerror', (e) => errors.push(`A: ${e.message}`))
  await open(a)
  const b = await context.newPage()
  b.on('pageerror', (e) => errors.push(`B: ${e.message}`))
  await open(b)

  // A: eine zweite Aufgabe anlegen und gleich als erledigt markieren – B sieht beides sofort.
  await a.getByRole('button', { name: 'Planer' }).click()
  const input = a.locator('.new-task input').first()
  await input.fill('Mails')
  await input.press('Enter')
  await a.getByRole('button', { name: 'Als erledigt markieren' }).click()
  await b.getByRole('button', { name: 'Planer' }).click()
  await expect(b.locator('.task-card.is-done .task-title')).toHaveText('Mails')

  // B: die erledigte Aufgabe umbenennen und die Reihenfolge ändern.
  await b.locator('.task-card-summary', { hasText: 'Mails' }).click()
  const title = b.getByRole('textbox', { name: 'Titel' })
  await title.fill('Mails beantworten')
  await title.press('Tab')
  await b.getByRole('button', { name: 'Zuklappen' }).click()
  await b.getByRole('button', { name: 'Ziehen zum Sortieren' }).first().focus()
  // Ziehen per Tastatur (die Animationen brauchen etwas Zeit auf der vorgespulten Uhr).
  for (const key of ['Space', 'ArrowDown', 'Space']) {
    await b.keyboard.press(key)
    await context.clock.runFor(300)
    await b.waitForTimeout(100)
  }
  await expect(b.locator('.task-card .task-title').first()).toHaveText('Mails beantworten')

  // A sieht den neuen Namen und die neue Reihenfolge – und die Aufgabe bleibt erledigt.
  await expect(a.locator('.task-card.is-done .task-title')).toHaveText('Mails beantworten')
  await expect(a.locator('.task-card .task-title').first()).toHaveText('Mails beantworten')

  // A: Block starten – wer klickt, übernimmt den Timer-Motor. B zeigt den laufenden Block mit.
  await b.getByRole('button', { name: 'Heute', exact: true }).first().click()
  await a.getByRole('button', { name: 'Heute', exact: true }).first().click()
  await a.waitForTimeout(300)
  await a.getByRole('button', { name: 'Starten', exact: true }).click()
  await expect(b.getByRole('button', { name: 'Früher fertig' })).toBeVisible()

  // Der Block läuft ab: in beiden Fenstern die Frage, aber nur ein Ton und nur ein Block.
  const before = (await a.evaluate('window.__sounds')) as number
  const beforeB = (await b.evaluate('window.__sounds')) as number
  await context.clock.fastForward(5 * MIN + 2000)
  await expect(a.locator('.ask-done-question')).toBeVisible()
  await expect(b.locator('.ask-done-question')).toBeVisible()
  await a.waitForTimeout(1500)
  const played = ((await a.evaluate('window.__sounds')) as number) - before + ((await b.evaluate('window.__sounds')) as number) - beforeB
  expect(played).toBe(1)
  expect(await storedBlocks(a)).toBe(1)

  // Nach dem Neuladen: alles gespeichert, die umbenannte Aufgabe ist immer noch erledigt.
  await b.reload()
  await b.getByRole('button', { name: 'Planer' }).click()
  await expect(b.locator('.task-card.is-done .task-title')).toHaveText('Mails beantworten')

  expect(errors).toEqual([])
})
