/**
 * BILDSCHIRM „EINSTELLUNGEN“
 * Blocklänge, Pausen, Grenzen, Aussehen, Töne und Datensicherung.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SETTINGS_LIMITS } from '../config/defaults'
import { T } from '../config/texts'
import { Dialog } from '../components/Dialog'
import { NumberStepper } from '../components/NumberStepper'
import { downloadBackup, parseBackup, restoreBackup, type BackupFile } from '../db/backup'
import type { NoiseColor, SurfaceSetting, ThemeSetting } from '../model/types'
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

const SURFACES: { value: SurfaceSetting; label: string }[] = [
  { value: 'pur', label: T.settings.surfacesPur },
  { value: 'glass', label: T.settings.surfacesGlass },
]

const SOUNDS: { value: boolean; label: string }[] = [
  { value: true, label: T.settings.soundsOn },
  { value: false, label: T.settings.soundsOff },
]

const NOISE_COLORS: { value: NoiseColor; label: string }[] = [
  { value: 'brown', label: T.settings.noiseBrown },
  { value: 'pink', label: T.settings.noisePink },
  { value: 'white', label: T.settings.noiseWhite },
]

/** Kleiner Umschalter mit 2–3 Möglichkeiten (wie bei Hell/Dunkel). */
function Segmented<V extends string | boolean>(props: {
  label: string
  options: { value: V; label: string }[]
  value: V
  onChange: (value: V) => void
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          className="segmented-item"
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

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
        {/* Pur = massive Flächen, Milchglas = leicht durchscheinend */}
        <div className="segmented" role="radiogroup" aria-label={T.settings.surfaces}>
          {SURFACES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={settings.surfaces === option.value}
              className="segmented-item"
              onClick={() => updateSettings({ surfaces: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-section">
        <h2>{T.settings.sounds}</h2>
        <SettingRow label={T.settings.soundsLabel} hint={T.settings.soundsHint}>
          <Segmented
            label={T.settings.soundsLabel}
            options={SOUNDS}
            value={settings.sounds}
            onChange={(sounds) => updateSettings({ sounds })}
          />
        </SettingRow>
        {settings.sounds && (
          <>
            <SettingRow label={T.settings.noiseColor} hint={T.settings.noiseColorHint}>
              <Segmented
                label={T.settings.noiseColor}
                options={NOISE_COLORS}
                value={settings.noiseColor}
                onChange={(noiseColor) => updateSettings({ noiseColor })}
              />
            </SettingRow>
            <div className="settings-buttons">
              <button type="button" className="btn" onClick={playBlockEnd}>
                {T.settings.testBlockEnd}
              </button>
              <button type="button" className="btn" onClick={playBreakEnd}>
                {T.settings.testBreakEnd}
              </button>
            </div>
          </>
        )}
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

      <DataSection />

      <p className="muted small settings-version">
        {T.settings.version(new Date(__BUILD_TIME__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }))}
      </p>
    </div>
  )
}

/** Sichern (Datei herunterladen) und Wiederherstellen (Datei einlesen). */
function DataSection() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null))
  }, [])

  const readFile = async (file: File | undefined) => {
    if (!file) return
    const backup = parseBackup(await file.text())
    if (backup) {
      setMessage(null)
      setPending(backup)
    } else {
      setMessage(T.settings.restoreInvalid)
    }
  }

  const confirmRestore = async () => {
    if (!pending) return
    await restoreBackup(pending)
    setPending(null)
    setMessage(T.settings.restoreDone)
  }

  return (
    <section className="card settings-section">
      <h2>{T.settings.data}</h2>

      <div className="setting-row">
        <div className="muted small">{T.settings.backupHint}</div>
        <button type="button" className="btn" onClick={downloadBackup}>
          {T.settings.backup}
        </button>
      </div>

      <div className="setting-row">
        <div className="muted small">{T.settings.restoreHint}</div>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          {T.settings.restore}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void readFile(e.target.files?.[0])
            // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
            e.target.value = ''
          }}
        />
      </div>

      {message && <p className="hint">{message}</p>}

      {persisted !== null && (
        <p className="muted small">{persisted ? T.settings.storagePersisted : T.settings.storageNotPersisted}</p>
      )}

      {pending && (
        <Dialog title={T.settings.restoreConfirmTitle} onClose={() => setPending(null)}>
          <p className="dialog-text">
            {T.settings.restoreConfirm(new Date(pending.exportedAt).toLocaleString('de-DE'))}
          </p>
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setPending(null)}>
              {T.settings.restoreNo}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void confirmRestore()}>
              {T.settings.restoreYes}
            </button>
          </div>
        </Dialog>
      )}
    </section>
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
