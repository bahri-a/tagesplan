/**
 * BILDSCHIRM „EINSTELLUNGEN“
 * Blocklänge, Pausen, Grenzen, Aussehen, Töne und Datensicherung.
 */

import { useState, type ReactNode } from 'react'
import { SETTINGS_LIMITS } from '../config/defaults'
import { T } from '../config/texts'
import { NumberStepper } from '../components/NumberStepper'
import type { ThemeSetting } from '../model/types'
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from '../signals/notifications'
import { playBlockEnd, playBreakEnd } from '../signals/sounds'
import { updateSettings } from '../store/actions'
import { useAppState } from '../store/store'
import './settings.css'

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: T.settings.themeSystem },
  { value: 'light', label: T.settings.themeLight },
  { value: 'dark', label: T.settings.themeDark },
]

export function SettingsScreen() {
  const { settings } = useAppState()
  const [permission, setPermission] = useState<PermissionState>(notificationPermission)

  return (
    <div className="settings">
      <h1 className="visually-hidden">{T.settings.title}</h1>

      <section className="card settings-section">
        <h2>{T.settings.blocksSection}</h2>
        <SettingRow label={T.settings.blockMinutes} hint={T.settings.blockMinutesHint}>
          <NumberStepper
            label={T.settings.blockMinutes}
            value={settings.blockMinutes}
            {...SETTINGS_LIMITS.blockMinutes}
            unit={T.settings.minutes}
            onChange={(v) => updateSettings({ blockMinutes: v })}
          />
        </SettingRow>
        <SettingRow label={T.settings.shortBreak} hint={T.settings.shortBreakHint}>
          <NumberStepper
            label={T.settings.shortBreak}
            value={settings.shortBreakMinutes}
            {...SETTINGS_LIMITS.shortBreakMinutes}
            unit={T.settings.minutes}
            onChange={(v) => updateSettings({ shortBreakMinutes: v })}
          />
        </SettingRow>
        <SettingRow label={T.settings.defaultBlocks} hint={T.settings.defaultBlocksHint}>
          <NumberStepper
            label={T.settings.defaultBlocks}
            value={settings.defaultBlocksPerTask}
            {...SETTINGS_LIMITS.defaultBlocksPerTask}
            onChange={(v) => updateSettings({ defaultBlocksPerTask: v })}
          />
        </SettingRow>
        <SettingRow label={T.settings.maxTasks} hint={T.settings.maxTasksHint}>
          <NumberStepper
            label={T.settings.maxTasks}
            value={settings.maxTasksPerDay}
            {...SETTINGS_LIMITS.maxTasksPerDay}
            onChange={(v) => updateSettings({ maxTasksPerDay: v })}
          />
        </SettingRow>
      </section>

      <section className="card settings-section">
        <h2>{T.settings.appearance}</h2>
        <div className="segmented" role="radiogroup" aria-label={T.settings.appearance}>
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === theme.value}
              className="segmented-item"
              onClick={() => updateSettings({ theme: theme.value })}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-section">
        <h2>{T.settings.sounds}</h2>
        <div className="settings-buttons">
          <button type="button" className="btn" onClick={playBlockEnd}>
            {T.settings.testBlockEnd}
          </button>
          <button type="button" className="btn" onClick={playBreakEnd}>
            {T.settings.testBreakEnd}
          </button>
        </div>
        {permission !== 'unsupported' && (
          <div className="settings-note">
            <span className="muted small">
              {permission === 'granted' && T.settings.notifyGranted}
              {permission === 'default' && T.settings.notifyDefault}
              {permission === 'denied' && T.settings.notifyDenied}
            </span>
            {permission === 'default' && (
              <button
                type="button"
                className="btn btn-small"
                onClick={async () => setPermission(await requestNotificationPermission())}
              >
                {T.settings.notifyAllow}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function SettingRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        <div className="muted small">{hint}</div>
      </div>
      {children}
    </div>
  )
}
