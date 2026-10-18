/**
 * KLICK-TEST IM BROWSER (Playwright)
 * ==================================
 * Startet die fertig gebaute App (`vite preview`) und klickt einen ganzen Tag durch –
 * so wie du: Aufgabe anlegen, Block starten, Pause, erledigt. Die Uhr ist dabei vorgespult,
 * der Test dauert nur Sekunden.
 *
 * Zwei Geräte:
 * - „mac“: Chrome am Laptop – alle bisherigen Tests.
 * - „iphone“: iPhone 15 Pro mit WebKit, der Technik der iPhone-App (WKWebView). Nur die Tests
 *   in `*.iphone.spec.ts`. Nativ (Mitteilungen, Vibration, Bildschirm-an) prüft das nicht.
 *
 * Lokal: `npm run test:e2e` (baut vorher). Bei jedem PR läuft er automatisch (check.yml).
 * Ist Chromium schon an einem festen Ort installiert, zeigt PW_CHROMIUM darauf.
 * Fehlt WebKit lokal, spielt PW_IPHONE_CHROMIUM=1 das iPhone mit Chromium nach (nur Notbehelf).
 */
import { defineConfig, devices } from '@playwright/test'

const IPHONE_TESTS = /\.iphone\.spec\.ts$/

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'de-DE',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mac',
      testIgnore: IPHONE_TESTS,
      use: {
        ...devices['Desktop Chrome'],
        // Mitteilungen schon erlaubt – sonst steht beim ersten Start die Erklärung (NotifyPrimer) im Weg.
        // Die Erklärung selbst prüft ein eigener Test (tagesablauf.spec.ts).
        permissions: ['notifications'],
        launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
      },
    },
    {
      name: 'iphone',
      testMatch: IPHONE_TESTS,
      use: {
        ...devices['iPhone 15 Pro'],
        ...(process.env.PW_IPHONE_CHROMIUM
          ? {
              browserName: 'chromium' as const,
              launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
            }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
