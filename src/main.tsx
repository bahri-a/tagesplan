import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iPhone-App: Mitteilungen, Statusleiste usw. (in der Web-App fällt dieser Teil beim Bauen weg).
if (__NATIVE_APP__) void import('./platform/nativeApp').then((m) => m.initNativeApp())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
