/**
 * DIE APP
 * =======
 * Lädt die Daten, zeigt die Kopfleiste mit Navigation und den gerade
 * gewählten Bildschirm. Außerdem laufen hier der Timer-„Motor“ und die
 * Dialoge, die überall erscheinen können.
 */

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  APP_NAME,
  BACKUP_REMINDER_MS,
  SAVE_FAILED_TOAST_MS,
  MILESTONE_TOAST_MS,
  PARKED_TOAST_MS,
  PUBLIC_URL,
  RECOMMEND_MILESTONE,
  SHARE_COPIED_MS,
  UNDO_DELETE_MS,
} from './config/defaults'
import { T } from './config/texts'
import { EndDayDialog } from './components/EndDayDialog'
import { InviteDialog } from './components/InviteDialog'
import { isTypingOrButton, useNow } from './components/hooks'
import { PencilIcon, PlanIcon, SettingsIcon, TodayIcon } from './components/icons'
import { NotePad } from './components/NotePad'
import { openNotePad } from './components/notePadEvents'
import { QuickPark } from './components/QuickPark'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { SHORTCUTS_OPEN_EVENT } from './components/shortcutsEvents'
import { NotifyPrimer } from './components/NotifyPrimer'
import { NOTIFY_PRIMER_EVENT } from './signals/notifications'
import { SleepDialog } from './components/SleepDialog'
import { Toast, type ToastAction } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { WakeAlert } from './components/WakeAlert'
import { lazyScreen, preloadWhenIdle } from './components/lazyScreen'
import { requestPersistentStorage } from './db/database'
import { parseInvite, type Invite } from './logic/invite'
import { formatCountdown } from './logic/time'
import * as timer from './logic/timer'
import type { ID, PaletteSetting, SurfaceSetting, ThemeSetting, TimerState } from './model/types'
import { TodayScreen } from './screens/today/TodayScreen'
import { unlockAudio } from './signals/sounds'
import { useNoise, useTimerEngine, type WakeEvent } from './signals/timerEngine'
import { IS_MOBILE } from './platform/device'
import { useFocusMode } from './platform/focusMode'
import { downloadBackup } from './db/backup'
import {
  addExampleTask,
  endDay,
  getEndDayConflicts,
  markBackupMade,
  markBackupReminded,
  markMilestoneSeen,
  restoreTask,
} from './store/actions'
import { backupAgeDays, lifetimeWork, reachedMilestone, shouldRemindBackup } from './store/selectors'
import { shareLink } from './platform/share'
import { getState, initStore, takeFirstStart, useAppState, useSaveFailedAt } from './store/store'

type Screen = 'today' | 'plan' | 'settings'

/** Eine Meldung unten. `id` ist bei jeder Meldung neu – so startet ihre Anzeigezeit neu. */
interface ToastInfo {
  id: number
  message: string
  duration?: number
  action?: ToastAction
}

let nextToastId = 1

// Planer, Einstellungen und Mini-Fenster kommen erst bei Bedarf (siehe components/lazyScreen.ts).
const PlanScreen = lazyScreen(() => import('./screens/plan/PlanScreen'), (m) => m.PlanScreen)
const SettingsScreen = lazyScreen(() => import('./screens/SettingsScreen'), (m) => m.SettingsScreen)
const MiniWindow = lazyScreen(() => import('./components/MiniWindow'), (m) => m.MiniWindow)

// Die Symbole zeigt nur das Handy (Reiter unten, mobile.css) – am Mac bleibt es reiner Text.
const SCREENS: { id: Screen; label: string; icon: ReactNode }[] = [
  { id: 'today', label: T.nav.today, icon: <TodayIcon /> },
  { id: 'plan', label: T.nav.plan, icon: <PlanIcon /> },
  { id: 'settings', label: T.nav.settings, icon: <SettingsIcon /> },
]

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void initStore().then(() => {
      // Allererster Start: eine Beispielaufgabe zum Ausprobieren (genau einmal).
      if (takeFirstStart()) addExampleTask()
      setReady(true)
      // iPhone-App: Startbildschirm erst jetzt ausblenden (sonst blitzt kurz eine leere Seite auf).
      if (__NATIVE_APP__) void import('./platform/nativeApp').then((m) => m.hideSplash())
      // iPhone-App: einmal am Tag still eine Sicherung in „Dateien › Tagesplan“ ablegen.
      if (__NATIVE_APP__) void import('./platform/autoBackup').then((m) => m.startDailyBackup())
    })
    void requestPersistentStorage()
    // Chrome erlaubt Töne erst nach einem Klick – daher bei jedem Klick freischalten.
    document.addEventListener('pointerdown', unlockAudio)
    // iPhone/Safari zählt nur Tippen am Ende (touchend/click) als Erlaubnis, nicht pointerdown.
    document.addEventListener('touchend', unlockAudio)
    document.addEventListener('click', unlockAudio)
    document.addEventListener('keydown', unlockAudio) // auch Tastenkürzel (Leertaste) zählen
    return () => {
      document.removeEventListener('pointerdown', unlockAudio)
      document.removeEventListener('touchend', unlockAudio)
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  // Kurz leer lassen, bis die Daten geladen sind (dauert nur Millisekunden).
  if (!ready) return null
  return <Shell />
}

function Shell() {
  const state = useAppState()
  const [screen, setScreen] = useState<Screen>('today')
  // „Morgen planen“ (nach „Alles erledigt“): Der Planer zeigt am Handy gleich „Morgen“.
  const [planTomorrow, setPlanTomorrow] = useState(false)
  const [endDayDialog, setEndDayDialog] = useState<'closed' | 'confirm' | 'conflicts'>('closed')
  const [toast, setToast] = useState<ToastInfo | null>(null)
  const [wakeEvent, setWakeEvent] = useState<WakeEvent | null>(null)
  const [invite, closeInvite] = useInvite()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [primerOpen, setPrimerOpen] = useState(false)

  // Kurz nach dem Start still nachladen – beim ersten Antippen sind sie dann schon da.
  useEffect(() => preloadWhenIdle(IS_MOBILE ? [PlanScreen, SettingsScreen] : [PlanScreen, SettingsScreen, MiniWindow]), [])

  // Beim ersten Start eines Blocks: erst erklären, wozu Mitteilungen gut sind (NotifyPrimer).
  useEffect(() => {
    const open = () => setPrimerOpen(true)
    window.addEventListener(NOTIFY_PRIMER_EVENT, open)
    return () => window.removeEventListener(NOTIFY_PRIMER_EVENT, open)
  }, [])

  useTimerEngine(useCallback((e: WakeEvent) => setWakeEvent(e), []))
  useBackupReminder((message, action) => setToast({ id: nextToastId++, message, duration: BACKUP_REMINDER_MS, action }))
  useSaveFailedNotice((message, action) => setToast({ id: nextToastId++, message, duration: SAVE_FAILED_TOAST_MS, action }))
  useMilestones(lifetimeWork(state).blocks, (message, action, duration = MILESTONE_TOAST_MS) =>
    setToast({ id: nextToastId++, message, duration, action }),
  )
  useNoise()
  useTheme(state.settings.theme, state.settings.palette)
  useSurfaces(state.settings.surfaces)
  // Handy: ruhige Fokus-Ansicht, solange in „Heute“ ein Block läuft (siehe platform/focusMode.ts).
  useFocusMode(state.timer, screen === 'today')

  // Tastenkürzel: ? zeigt die Übersicht, 1 / 2 / 3 wechseln die Reiter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (isTypingOrButton(e.target) && (e.target as HTMLElement).tagName !== 'BUTTON') return
      if (document.querySelector('dialog[open], [role="dialog"]')) return
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      const target = SCREENS[Number(e.key) - 1]
      if (!target) return
      e.preventDefault()
      setScreen(target.id)
      setPlanTomorrow(false)
    }
    const open = () => setShortcutsOpen(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener(SHORTCUTS_OPEN_EVENT, open)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener(SHORTCUTS_OPEN_EVENT, open)
    }
  }, [])

  const clearToast = useCallback(() => setToast(null), [])
  const showToast = (message: string, extra: Omit<ToastInfo, 'id' | 'message'> = {}) =>
    setToast({ id: nextToastId++, message, ...extra })

  // Nach dem Löschen: 8 Sekunden „Aufgabe gelöscht · Rückgängig“. Eine neue Meldung ersetzt
  // die alte – nach mehreren Löschungen lässt sich also nur die letzte zurückholen.
  const taskDeleted = (taskId: ID) =>
    showToast(T.plan.deleted, {
      duration: UNDO_DELETE_MS,
      action: { label: T.plan.undo, onClick: () => restoreTask(taskId) },
    })

  const dayEnded = () => {
    setEndDayDialog('closed')
    setScreen('today')
    showToast(T.endDay.finished)
  }

  // „Neuen Tag beginnen“ (am nächsten Kalendertag): ohne weitere Rückfrage.
  const startNewDay = () => {
    if (getEndDayConflicts().length > 0) {
      setEndDayDialog('conflicts')
    } else {
      endDay()
      dayEnded()
    }
  }

  return (
    <>
      <header className="topbar">
        <nav className="nav" aria-label="Hauptnavigation">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="nav-item"
              aria-current={screen === s.id ? 'page' : undefined}
              onClick={() => {
                setScreen(s.id)
                setPlanTomorrow(false)
                // iPhone-App: Jeder Reiter beginnt oben (sonst bleibt die Scrollposition des vorigen stehen).
                if (__NATIVE_APP__) window.scrollTo(0, 0)
              }}
            >
              <span className="nav-icon">{s.icon}</span>
              <span className="nav-label">{s.label}</span>
            </button>
          ))}
          {/* Handy: Notizen als Stift direkt in der Leiste (am Mac unten rechts). */}
          {IS_MOBILE && (
            <button type="button" className="nav-item nav-notes" onClick={openNotePad}>
              <span className="nav-icon">
                <PencilIcon />
              </span>
              <span className="nav-label">{T.notes.open}</span>
            </button>
          )}
        </nav>
        {screen !== 'today' && <TimerPill timerState={state.timer} onClick={() => setScreen('today')} />}
      </header>

      <main className="main">
        {screen === 'today' && (
          <TodayScreen
            onPlan={(tomorrow = false) => {
              setPlanTomorrow(tomorrow)
              setScreen('plan')
            }}
            onEndDay={() => setEndDayDialog('confirm')}
            onStartNewDay={startNewDay}
          />
        )}
        {/* Nachgeladen: im allerersten Augenblick leer, danach wie gewohnt. */}
        <Suspense fallback={null}>
          {screen === 'plan' && (
            <PlanScreen
              startOnTomorrow={planTomorrow}
              onTaskDeleted={taskDeleted}
              onNotice={(message) => showToast(message)}
            />
          )}
          {screen === 'settings' && <SettingsScreen />}
        </Suspense>
      </main>

      <NotePad />
      {/* Ein Fenster über allen anderen Fenstern gibt es nur am Mac. */}
      {!IS_MOBILE && (
        <Suspense fallback={null}>
          <MiniWindow />
        </Suspense>
      )}
      {/* Fokus-Ansicht am Handy: wird im Lauf des Blocks langsam etwas dunkler (mobile.css). */}
      <div className="focus-dim" aria-hidden="true" />
      <QuickPark onParked={() => showToast(T.park.done, { duration: PARKED_TOAST_MS })} />

      {endDayDialog !== 'closed' && (
        <EndDayDialog
          skipConfirm={endDayDialog === 'conflicts'}
          onCancel={() => setEndDayDialog('closed')}
          onEnded={dayEnded}
        />
      )}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          duration={toast.duration}
          action={toast.action}
          onDone={clearToast}
        />
      )}
      {state.timer.phase === 'block' && state.timer.sleptAt !== undefined && (
        <SleepDialog key={state.timer.sleptAt} sleptAt={state.timer.sleptAt} />
      )}
      {primerOpen && <NotifyPrimer onClose={() => setPrimerOpen(false)} />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {wakeEvent && <WakeAlert event={wakeEvent} onClose={() => setWakeEvent(null)} />}
      {invite && (
        <InviteDialog
          invite={invite}
          onClose={closeInvite}
          onJoined={() => {
            closeInvite()
            setScreen('today')
          }}
        />
      )}
      <UpdateBanner />
      {/* Eigener kleiner Baustein: tickt jede Sekunde, ohne die ganze App neu zu zeichnen. */}
      <WindowTitle timerState={state.timer} />
    </>
  )
}

/**
 * Setzt Hell/Dunkel und die Farbwelt. Bei „Automatisch“ folgt die App macOS.
 * Auch die Titelleiste des installierten App-Fensters bekommt die passende Farbe.
 */
function useTheme(theme: ThemeSetting, palette: PaletteSetting) {
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    root.dataset.palette = palette

    const updateTitleBar = () => {
      // Die fertig ausgerechnete Farbe (die Farbwelten nutzen light-dark() in --bg).
      const background = getComputedStyle(document.body).backgroundColor
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
      // iPhone-App: Uhrzeit und Akku oben passend hell oder dunkel.
      if (__NATIVE_APP__) void import('./platform/nativeApp').then((m) => m.updateStatusBar(background))
    }
    updateTitleBar()
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)')
    darkMode.addEventListener('change', updateTitleBar)
    return () => darkMode.removeEventListener('change', updateTitleBar)
  }, [theme, palette])
}

/**
 * Leise Erinnerung ans Sichern: Wurde lange nicht gesichert, steht beim Öffnen einmal (höchstens
 * einmal am Tag) unten „Letzte Sicherung vor 9 Tagen · Jetzt sichern“. Nie während eines Blocks.
 */
function useBackupReminder(show: (message: string, action: ToastAction) => void) {
  const showRef = useRef(show)
  useEffect(() => {
    // iPhone-App: sichert jeden Tag von selbst (platform/autoBackup.ts) – keine Erinnerung nötig.
    if (__NATIVE_APP__) return
    const now = Date.now()
    const s = getState()
    if (!shouldRemindBackup(s, now)) return
    markBackupReminded(now)
    showRef.current(T.settings.backupReminder(backupAgeDays(s, now)), {
      label: T.settings.backupReminderAction,
      onClick: () => {
        downloadBackup()
        markBackupMade()
      },
    })
  }, [])
}

/**
 * Hat das Speichern (auch nach einem zweiten Versuch) nicht geklappt, steht unten ein leiser
 * Hinweis mit „Jetzt sichern“ – die Daten im Arbeitsspeicher sind noch da und landen in der Datei.
 */
function useSaveFailedNotice(show: (message: string, action: ToastAction) => void) {
  const failedAt = useSaveFailedAt()
  const showRef = useRef(show)
  useEffect(() => {
    showRef.current = show
  })
  useEffect(() => {
    if (failedAt === null) return
    showRef.current(T.settings.saveFailed, {
      label: T.settings.backupReminderAction,
      onClick: () => {
        downloadBackup()
        markBackupMade()
      },
    })
  }, [failedAt])
}

/**
 * Fokus-Einladung: Steht ein Link wie …/tagesplan/#fokus=<Endzeit> in der Adresse (beim Öffnen
 * oder später), kommt der Dialog „Gemeinsam arbeiten“. Danach verschwindet der Teil aus der Adresse.
 */
function useInvite(): [Invite | null, () => void] {
  const [invite, setInvite] = useState(() => parseInvite(window.location.hash, Date.now()))
  useEffect(() => {
    const read = () => setInvite(parseInvite(window.location.hash, Date.now()))
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  const close = useCallback(() => {
    setInvite(null)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])
  return [invite, close]
}

/**
 * Sammeln statt Serie: Erreicht die Gesamtzahl durchgehaltener Blöcke 10, 25, 50, 100, 250 oder 500,
 * kommt genau einmal eine leise Meldung („100 Blöcke. Das sind 41 Stunden echte Arbeit.“). Beim 50.
 * fragt sie einmal „Kennst du jemanden, dem das helfen würde? · Teilen“ – danach nie wieder.
 * Was beim Öffnen schon erreicht ist (ältere Daten, Wiederherstellen), wird nur still vermerkt.
 */
function useMilestones(
  blocks: number,
  show: (message: string, action?: ToastAction, duration?: number) => void,
) {
  const showRef = useRef(show)
  const previous = useRef<number | null>(null)
  useEffect(() => {
    showRef.current = show
  })
  useEffect(() => {
    const before = previous.current
    previous.current = blocks
    const reached = reachedMilestone(blocks)
    const seen = getState().local.milestoneSeen
    if (seen !== undefined && reached <= seen) return
    markMilestoneSeen(reached)
    // Nur, wenn gerade ein Block dazukam – nicht beim Öffnen und nicht nach dem Wiederherstellen.
    if (before === null || blocks !== before + 1 || reached === 0) return
    const message = T.milestone.reached(reached, lifetimeWork(getState()).minutes)
    if (reached !== RECOMMEND_MILESTONE) {
      showRef.current(message)
      return
    }
    showRef.current(`${message}\n${T.milestone.recommend}`, {
      label: T.share.action,
      onClick: () =>
        void shareLink(T.share.recommendText, PUBLIC_URL).then((result) => {
          if (result === 'copied') showRef.current(T.share.copied, undefined, SHARE_COPIED_MS)
        }),
    })
  }, [blocks])
}

/** Pur oder Milchglas: steuert die Flächen-Variablen in index.css. */
function useSurfaces(surfaces: SurfaceSetting) {
  useEffect(() => {
    document.documentElement.dataset.surfaces = surfaces
  }, [surfaces])
}

/** Zeigt die Restzeit im Fenstertitel – praktisch, wenn die App im Hintergrund ist. */
function WindowTitle({ timerState: t }: { timerState: TimerState }) {
  const running = t.phase === 'block' || (t.phase === 'break' && !t.endSignaled)
  const now = useNow(running)
  const remaining = running ? remainingOf(t, now) : null
  const title = remaining === null ? APP_NAME : `${formatCountdown(remaining)} · ${APP_NAME}`
  useEffect(() => {
    document.title = title
  }, [title])
  return null
}

function remainingOf(t: TimerState, now: number): number | null {
  if (t.phase === 'block') return timer.blockRemainingMs(t, now)
  if (t.phase === 'break' && !t.endSignaled) return timer.breakRemainingMs(t, now)
  return null
}

/** Kleine Timer-Anzeige oben rechts, wenn du auf einem anderen Bildschirm bist. */
function TimerPill({ timerState, onClick }: { timerState: TimerState; onClick: () => void }) {
  const now = useNow(timerState.phase !== 'idle')
  const remaining = remainingOf(timerState, now)
  if (remaining === null) return null
  const isBreak = timerState.phase === 'break'
  const label = isBreak
    ? T.nav.timerBreak
    : timerState.phase === 'block' && timerState.pausedAt !== null
      ? T.nav.timerPaused
      : T.nav.timerBlock
  return (
    <button type="button" className={`timer-pill${isBreak ? ' is-break' : ''}`} onClick={onClick}>
      {label} {formatCountdown(remaining)}
    </button>
  )
}
