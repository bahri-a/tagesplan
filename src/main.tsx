import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { IS_MOBILE } from './platform/device'
// Handy-Aussehen (ohne Scrollen, Fokus-Ansicht) – nach allen anderen Stilen, damit es gewinnt.
import './mobile.css'

// Am Handy (iPhone, iPad, Android) gelten die Regeln aus mobile.css.
if (IS_MOBILE) document.documentElement.dataset.device = 'mobile'

// iPhone-App: Mitteilungen, Statusleiste usw. (in der Web-App fällt dieser Teil beim Bauen weg).
if (__NATIVE_APP__) void import('./platform/nativeApp').then((m) => m.initNativeApp())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
