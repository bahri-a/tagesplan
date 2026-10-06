/**
 * KLICK-TEST IM BROWSER (Playwright)
 * ==================================
 * Startet die fertig gebaute App (`vite preview`) und klickt einen ganzen Tag durch –
 * so wie du: Aufgabe anlegen, Block starten, Pause, erledigt. Die Uhr ist dabei vorgespult,
 * der Test dauert nur Sekunden.
 *
 * Lokal: `npm run test:e2e` (baut vorher). Bei jedem PR läuft er automatisch (check.yml).
 * Ist Chromium schon an einem festen Ort installiert, zeigt PW_CHROMIUM darauf.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4173',
    locale: 'de-DE',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
