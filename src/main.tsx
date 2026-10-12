import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Alle Stile in fester Reihenfolge (styles.css), das Handy-Aussehen als eigene Ebene zuletzt.
import './styles.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IS_MOBILE } from './platform/device'
import { followSystemTextSize } from './platform/textSize'

// Am Handy (iPhone, iPad, Android) gelten die Regeln aus mobile.css.
if (IS_MOBILE) {
  document.documentElement.dataset.device = 'mobile'
  // iPhone: größere Systemschrift übernehmen (höchstens zwei Stufen).
  followSystemTextSize()
}

// iPhone-App: Mitteilungen, Statusleiste usw. (in der Web-App fällt dieser Teil beim Bauen weg).
if (__NATIVE_APP__) void import('./platform/nativeApp').then((m) => m.initNativeApp())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
