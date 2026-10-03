/**
 * IPHONE-APP: MITTEILUNGEN BESTELLEN
 * ==================================
 * Ist das iPhone gesperrt, schläft die App – sie kann dann selbst keinen Ton spielen.
 * Darum werden die Mitteilungen (mit Ton) beim iPhone im Voraus bestellt und bei jeder
 * Änderung am Timer neu geplant: Start, Pausieren, Weiter, Abbrechen, „Früher fertig“ …
 *
 * Was geplant sein soll, rechnet store/notificationPlan.ts aus. Diese Datei gleicht das nur
 * mit dem iPhone ab. Ist die App offen, bleiben die Mitteilungen unsichtbar
 * (capacitor.config.ts → presentationOptions) – dann spielt die App ihre eigenen Töne.
 *
 * Wird nur in der iPhone-App geladen (platform/nativeApp.ts).
 */

import { LocalNotifications, type PermissionStatus } from '@capacitor/local-notifications'
import { keepDeliveredNotifications, plannedNotifications, type PlannedNotification } from '../store/notificationPlan'
import { getState, subscribeToStore } from '../store/store'
import { setNativeNotificationPermission, type PermissionState } from './notifications'

/** Tondateien im iOS-Projekt (ios/App/App/), erzeugt mit scripts/make-sounds.mjs. */
const SOUND_FILES: Record<PlannedNotification['kind'], string> = {
  blockEnd: 'block_end.wav',
  breakEnd: 'break_end.wav',
}

/** Alle Mitteilungen dieser App stehen in einer Gruppe (eine ersetzt sichtbar die andere). */
const THREAD = 'tagesplan-timer'

let permission: PermissionState = 'default'
/** Zuletzt bestellter Plan – nur bei Änderungen wird neu bestellt. */
let lastPlanKey = ''
let lastKeep = false
/** Bestellungen nacheinander abarbeiten (nie zwei gleichzeitig). */
let queue: Promise<void> = Promise.resolve()

function toPermissionState(status: PermissionStatus): PermissionState {
  if (status.display === 'granted') return 'granted'
  if (status.display === 'denied') return 'denied'
  return 'default'
}

function updatePermission(state: PermissionState): PermissionState {
  permission = state
  setNativeNotificationPermission(state)
  return state
}

/** Fragt das iPhone nach der Erlaubnis für Mitteilungen (Knopf „Erlauben“ und erster Blockstart). */
export async function requestNativePermission(): Promise<PermissionState> {
  try {
    const state = updatePermission(toPermissionState(await LocalNotifications.requestPermissions()))
    lastPlanKey = '' // jetzt erlaubt → gleich neu bestellen
    sync()
    return state
  } catch {
    return permission
  }
}

/** Startet den Abgleich: einmal beim Start der App. */
export async function startNativeNotifications(): Promise<void> {
  try {
    updatePermission(toPermissionState(await LocalNotifications.checkPermissions()))
  } catch {
    updatePermission('unsupported')
  }
  // Tippt man auf eine Mitteilung, öffnet sich die App – mehr ist nicht nötig.
  subscribeToStore(sync)
  document.addEventListener('visibilitychange', () => {
    // Kurz warten: Erst rechnet der Timer nach (z. B. Ultra-Modus → Pause wartet), dann aufräumen.
    if (document.visibilityState === 'visible') setTimeout(() => clearDeliveredIfDone(true), 1000)
  })
  sync()
}

function sync(): void {
  const s = getState()
  // Beim ersten Start eines Blocks einmal um Erlaubnis fragen (wie ein Wecker, der klingeln darf).
  if (permission === 'default' && s.timer.phase === 'block') void requestNativePermission()

  const plan = plannedNotifications(s)
  const sounds = s.settings.sounds
  const key = JSON.stringify([plan.map((n) => [n.id, n.at, n.body]), sounds, permission])
  if (key !== lastPlanKey) {
    lastPlanKey = key
    queue = queue.then(() => order(plan, sounds)).catch(() => undefined)
  }
  clearDeliveredIfDone(false)
}

/** Alte Bestellungen streichen, neue aufgeben. */
async function order(plan: PlannedNotification[], sounds: boolean): Promise<void> {
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  }
  if (permission !== 'granted') return
  const soon = Date.now() + 500
  const future = plan.filter((n) => n.at > soon)
  if (future.length === 0) return
  await LocalNotifications.schedule({
    notifications: future.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: new Date(n.at), allowWhileIdle: true },
      // Einstellung „Töne“ aus → die Mitteilung kommt still.
      sound: sounds ? SOUND_FILES[n.kind] : undefined,
      threadIdentifier: THREAD,
    })),
  })
}

/**
 * Angezeigte Mitteilungen wegräumen, sobald die App offen ist – außer im Ultra-Modus, solange
 * die Pause noch nicht bestätigt ist (Wunsch 2026-10-03: „bleibt … bis man die Pause startet“).
 */
function clearDeliveredIfDone(force: boolean): void {
  const keep = keepDeliveredNotifications(getState())
  const changed = keep !== lastKeep
  lastKeep = keep
  if (keep || document.visibilityState !== 'visible' || !(force || changed)) return
  queue = queue.then(() => LocalNotifications.removeAllDeliveredNotifications()).catch(() => undefined)
}
