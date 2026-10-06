/**
 * BILDSCHIRM „EINSTELLUNGEN“
 * Blocklänge, Pausen, Grenzen, Aussehen, Töne und Datensicherung.
 * Am Handy oben vier Reiter (Arbeitszeit, Aussehen, Töne, Daten) – so passt jeder Bereich ohne
 * Scrollen auf den Bildschirm.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NOISE_PREVIEW_S, SETTINGS_LIMITS } from '../config/defaults'
import { T } from '../config/texts'
import { Dialog } from '../components/Dialog'
import { useNow } from '../components/hooks'
import { NumberStepper } from '../components/NumberStepper'
import { downloadBackup, parseBackup, restoreBackup, type BackupFile } from '../db/backup'
import type { NoiseColor, PaletteSetting, SurfaceSetting, ThemeSetting } from '../model/types'
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from '../signals/notifications'
import { playBlockEnd, playBreakEnd, playUltraAlarm, previewNoise } from '../signals/sounds'
import { markBackupMade, updateSettings } from '../store/actions'
import { backupAgeDays } from '../store/selectors'
import { useAppState } from '../store/store'
import { IS_MOBILE } from '../platform/device'
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

const PALETTES: { value: PaletteSetting; label: string }[] = [
  { value: 'salbei', label: T.settings.paletteSalbei },
  { value: 'fjord', label: T.settings.paletteFjord },
  { value: 'rose', label: T.settings.paletteRose },
  { value: 'lavendel', label: T.settings.paletteLavendel },
]

const SOUNDS: { value: boolean; label: string }[] = [
  { value: true, label: T.settings.soundsOn },
  { value: false, label: T.settings.soundsOff },
]

const ULTRA: { value: boolean; label: string }[] = [
  { value: false, label: T.settings.ultraOff },
  { value: true, label: T.settings.ultraOn },
]

const NOISE_COLORS: { value: NoiseColor; label: string }[] = [
  { value: 'brown', label: T.settings.noiseBrown },
  { value: 'pink', label: T.settings.noisePink },
  { value: 'white', label: T.settings.noiseWhite },
  { value: 'mix', label: T.settings.noiseMix },
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

/** Farbwelt: runde Farbmuster (Hintergrund + Akzentfarbe) mit Namen darunter. */
function PalettePicker({ value, onChange }: { value: PaletteSetting; onChange: (value: PaletteSetting) => void }) {
  return (
    <div className="palette-picker" role="radiogroup" aria-label={T.settings.palette}>
      {PALETTES.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className="palette-option"
          data-value={option.value}
          onClick={() => onChange(option.value)}
        >
          <span className="palette-swatch" aria-hidden="true" />
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Art des Rauschens: Braun / Rosa / Weiß / Ultra (Mix). Direkt unter Braun, Rosa und Weiß je ein
 * kleiner Lautsprecher zum Probehören (kurz, ein paar Sekunden). Ultra braucht keins – es ist
 * ja nur der Wechsel der drei.
 * Umschalter und Lautsprecher liegen im selben Raster (4 Spalten): So steht jeder Lautsprecher
 * genau mittig unter seiner Option, egal wie breit die Wörter sind.
 */
function NoisePicker({ value, onChange }: { value: NoiseColor; onChange: (value: NoiseColor) => void }) {
  const [playing, setPlaying] = useState<NoiseColor | null>(null)
  useEffect(() => {
    if (playing === null) return
    const id = setTimeout(() => setPlaying(null), NOISE_PREVIEW_S * 1000)
    return () => clearTimeout(id)
  }, [playing])

  return (
    <div className="noise-picker">
      {/* Der graue Hintergrund des Umschalters – nur hinter der ersten Zeile */}
      <span className="noise-picker-track" aria-hidden="true" />
      <div className="noise-picker-options" role="radiogroup" aria-label={T.settings.noiseColor}>
        {NOISE_COLORS.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className="segmented-item"
            style={{ gridColumn: index + 1 }}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {NOISE_COLORS.map((option, index) =>
        option.value === 'mix' ? null : (
          <button
            key={option.value}
            type="button"
            className="noise-preview"
            style={{ gridColumn: index + 1 }}
            aria-pressed={playing === option.value}
            aria-label={T.settings.noisePreview(option.label)}
            title={T.settings.noisePreview(option.label)}
            onClick={() => {
              previewNoise(option.value)
              setPlaying(option.value)
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 8h3l4-3.5v11L6 12H3z" />
              <path d="M13 7.5a3.5 3.5 0 0 1 0 5" />
              <path d="M15.3 5.3a6.6 6.6 0 0 1 0 9.4" />
            </svg>
          </button>
        ),
      )}
    </div>
  )
}

type SettingsTab = 'blocks' | 'appearance' | 'sounds' | 'data'

const TABS: { value: SettingsTab; label: string }[] = [
  { value: 'blocks', label: T.settings.tabBlocks },
  { value: 'appearance', label: T.settings.tabAppearance },
  { value: 'sounds', label: T.settings.tabSounds },
  { value: 'data', label: T.settings.tabData },
]

export function SettingsScreen() {
  const { settings } = useAppState()
  const [permission, setPermission] = useState<PermissionState>(notificationPermission)
  // Handy: nur ein Bereich auf einmal. Am Mac stehen alle untereinander.
  const [tab, setTab] = useState<SettingsTab>('blocks')
  const hiddenUnless = (value: SettingsTab) => IS_MOBILE && tab !== value

  return (
    <div className="settings">
      <h1 className="visually-hidden">{T.settings.title}</h1>

      {IS_MOBILE && (
        <div className="segmented settings-tabs" role="tablist" aria-label={T.settings.tabs}>
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              className="segmented-item"
              onClick={() => setTab(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <section className="card settings-section" hidden={hiddenUnless('blocks')}>
        <h2>{T.settings.blocksSection}</h2>
        <SettingRow label={T.settings.defaultBlocks} hint={T.settings.defaultBlocksHint}>
          <NumberStepper
            label={T.settings.defaultBlocks}
            value={settings.defaultBlocksPerTask}
            {...SETTINGS_LIMITS.defaultBlocksPerTask}
            unit=""
            onChange={(v) => updateSettings({ defaultBlocksPerTask: v })}
          />
        </SettingRow>
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
      </section>

      <section className="card settings-section" hidden={hiddenUnless('appearance')}>
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
        <SettingRow label={T.settings.palette} hint={T.settings.paletteHint}>
          <PalettePicker value={settings.palette} onChange={(palette) => updateSettings({ palette })} />
        </SettingRow>
      </section>

      <section className="card settings-section" hidden={hiddenUnless('sounds')}>
        <h2>{T.settings.sounds}</h2>
        <SettingRow label={T.settings.soundsLabel} hint={T.settings.soundsHint}>
          <Segmented
            label={T.settings.soundsLabel}
            options={SOUNDS}
            value={settings.sounds}
            onChange={(sounds) => updateSettings({ sounds })}
          />
        </SettingRow>
        <SettingRow label={T.settings.noiseColor} hint={T.settings.noiseColorHint}>
          <NoisePicker value={settings.noiseColor} onChange={(noiseColor) => updateSettings({ noiseColor })} />
        </SettingRow>
        {settings.sounds && (
          <>
            <SettingRow label={T.settings.ultraLabel} hint={T.settings.ultraHint}>
              <Segmented
                label={T.settings.ultraLabel}
                options={ULTRA}
                value={settings.ultraMode}
                onChange={(ultraMode) => updateSettings({ ultraMode })}
              />
            </SettingRow>
            <div className="settings-buttons">
              <button type="button" className="btn" onClick={playBlockEnd}>
                {T.settings.testBlockEnd}
              </button>
              <button type="button" className="btn" onClick={playBreakEnd}>
                {T.settings.testBreakEnd}
              </button>
              {settings.ultraMode && (
                <button type="button" className="btn" onClick={playUltraAlarm}>
                  {T.settings.testUltra}
                </button>
              )}
            </div>
          </>
        )}
        {permission !== 'unsupported' && (
          <div className="settings-note">
            <span className="muted small">
              {permission === 'granted' && (__NATIVE_APP__ ? T.settings.nativeNotifyGranted : T.settings.notifyGranted)}
              {permission === 'default' && (__NATIVE_APP__ ? T.settings.nativeNotifyDefault : T.settings.notifyDefault)}
              {permission === 'denied' && (__NATIVE_APP__ ? T.settings.nativeNotifyDenied : T.settings.notifyDenied)}
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

      <DataSection hidden={hiddenUnless('data')} />

      <p className="muted small settings-version" hidden={hiddenUnless('data')}>
        {T.settings.version(new Date(__BUILD_TIME__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }))}
      </p>
    </div>
  )
}

/** Sichern (Datei herunterladen) und Wiederherstellen (Datei einlesen). */
function DataSection({ hidden = false }: { hidden?: boolean }) {
  const state = useAppState()
  const now = useNow(true, 60_000)
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
    <section className="card settings-section" hidden={hidden}>
      <h2>{T.settings.data}</h2>

      <div className="setting-row">
        <div className="muted small">
          {T.settings.backupHint}
          <br />
          {T.settings.backupLast(backupAgeDays(state, now))}
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            downloadBackup()
            markBackupMade()
          }}
        >
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

      {/* In der iPhone-App liegen die Daten fest in der App – der Hinweis zu Chrome passt dort nicht. */}
      {persisted !== null && !__NATIVE_APP__ && (
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
        <div className="muted small setting-hint">{hint}</div>
      </div>
      {children}
    </div>
  )
}
