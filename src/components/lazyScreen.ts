/**
 * NACHLADEN
 * =========
 * Bildschirme, die man beim Start nicht sieht (Planer, Einstellungen, Mini-Fenster), stehen in
 * eigenen kleinen Dateien. So startet die App schneller. Kurz nach dem Start werden sie still
 * im Hintergrund geholt (`preload`) – beim ersten Antippen sind sie dann schon da und erscheinen
 * ohne Verzögerung. Die Stile stehen alle in styles.css; beim Nachladen ändert sich daran nichts.
 */
import { createElement, lazy, type ComponentType, type ReactElement } from 'react'

interface Preloadable {
  preload: () => Promise<unknown>
}

export type LazyScreen<P> = ((props: P) => ReactElement) & Preloadable

export function lazyScreen<P extends object, M>(load: () => Promise<M>, pick: (module: M) => ComponentType<P>): LazyScreen<P> {
  let loaded: ComponentType<P> | null = null
  let pending: Promise<ComponentType<P>> | null = null
  const preload = () =>
    (pending ??= load().then((module) => {
      loaded = pick(module)
      return loaded
    }))
  const Lazy = lazy(() => preload().then((component) => ({ default: component })))
  // Schon geladen? Dann direkt zeichnen – ohne den einen leeren Augenblick, den `lazy` sonst hat.
  const Screen = (props: P) => createElement(loaded ?? Lazy, props)
  return Object.assign(Screen, { preload })
}

/** Alles Nachladbare holen, sobald der Browser gerade nichts zu tun hat. */
export function preloadWhenIdle(screens: Preloadable[]): void {
  const run = () => screens.forEach((screen) => void screen.preload().catch(() => undefined))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 })
  else setTimeout(run, 300)
}
