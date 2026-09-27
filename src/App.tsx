/**
 * DIE APP
 * =======
 * Lädt die Daten, zeigt die Kopfleiste mit Navigation und den gerade
 * gewählten Bildschirm. Außerdem laufen hier der Timer-„Motor“ und die
 * Dialoge, die überall erscheinen können.
 */

import { useEffect, useState } from 'react'
import { APP_NAME } from './config/defaults'
import { T } from './config/texts'
import { useNow, useTimerEngine } from './components/hooks'
import { requestPersistentStorage } from './db/database'
import { formatCountdown } from './logic/time'
import * as timer from './logic/timer'
import type { ThemeSetting, TimerState } from './model/types'
import { PlanScreen } from './screens/PlanScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'
import { unlockAudio } from './signals/sounds'
import { initStore, useAppState } from './store/store'
import './components/components.css'

type Screen = 'today' | 'plan' | 'settings'

const SCREENS: { id: Screen; label: string }[] = [
  { id: 'today', label: T.nav.today },
  { id: 'plan', label: T.nav.plan },
  { id: 'settings', label: T.nav.settings },
]

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void initStore().then(() => setReady(true))
    void requestPersistentStorage()
    // Chrome erlaubt Töne erst nach einem Klick – daher bei jedem Klick freischalten.
    document.addEventListener('pointerdown', unlockAudio)
    return () => document.removeEventListener('pointerdown', unlockAudio)
  }, [])

  // Kurz leer lassen, bis die Daten geladen sind (dauert nur Millisekunden).
  if (!ready) return null
  return <Shell />
}

function Shell() {
  const state = useAppState()
  const [screen, setScreen] = useState<Screen>('today')

  useTimerEngine()
  useTheme(state.settings.theme)
  useWindowTitle(state.timer)

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
              onClick={() => setScreen(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        {screen !== 'today' && <TimerPill timerState={state.timer} onClick={() => setScreen('today')} />}
      </header>

      <main className="main">
        {screen === 'today' && <TodayScreen onPlan={() => setScreen('plan')} onEndDay={() => {}} />}
        {screen === 'plan' && <PlanScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
    </>
  )
}

/** Setzt Hell/Dunkel. Bei „Automatisch“ folgt die App macOS. */
function useTheme(theme: ThemeSetting) {
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])
}

/** Zeigt die Restzeit im Fenstertitel – praktisch, wenn die App im Hintergrund ist. */
function useWindowTitle(t: TimerState) {
  const running = t.phase === 'block' || (t.phase === 'break' && !t.endSignaled)
  const now = useNow(running, 1000)
  const remaining = running ? remainingOf(t, now) : null
  const title = remaining === null ? APP_NAME : `${formatCountdown(remaining)} · ${APP_NAME}`
  useEffect(() => {
    document.title = title
  }, [title])
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
