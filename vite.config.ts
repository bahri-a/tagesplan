/// <reference types="vitest/config" />
/**
 * BAU-EINSTELLUNGEN (Vite)
 * ========================
 * - React
 * - PWA: macht die App installierbar und offline nutzbar
 *   (ein „Service Worker“ speichert alle Dateien im Browser).
 * - BASE_PATH: Unterordner, unter dem die App online liegt.
 *   Bei GitHub Pages ist das der Name des Repositorys, z. B. /tagesplan/.
 *   Das setzt der GitHub-Workflow automatisch (.github/workflows/deploy.yml).
 * - APP_TARGET=native: Bau für die iPhone-App (Capacitor, `npm run build:ios`).
 *   Dort gibt es keinen Service Worker und keinen Hinweis „Neu laden“ –
 *   Updates kommen über den App Store.
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const isNativeApp = process.env.APP_TARGET === 'native'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // Zeitpunkt des Bauens – wird unten in den Einstellungen angezeigt.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __NATIVE_APP__: JSON.stringify(isNativeApp),
  },
  plugins: [
    react(),
    VitePWA({
      // In der iPhone-App kein Service Worker (die Dateien liegen ohnehin in der App).
      disable: isNativeApp,
      // Neue Versionen werden nicht automatisch geladen – es erscheint ein
      // kleiner Hinweis „Neu laden“ (damit kein Block unterbrochen wird).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Tagesplan',
        short_name: 'Tagesplan',
        description: 'Hauptaufgaben, Arbeitsblöcke und Pausen – ohne Uhrzeiten.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f5f4f0',
        theme_color: '#f5f4f0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    // Die Klick-Tests im Browser (e2e/) laufen über Playwright, nicht hier.
    include: ['src/**/*.test.ts'],
  },
})
