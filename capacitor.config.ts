/**
 * EINSTELLUNGEN FÜR DIE IPHONE-APP (Capacitor)
 * ============================================
 * Capacitor packt die fertig gebaute Web-App (Ordner `dist`) in eine echte iOS-App.
 * Bauen und in Xcode öffnen: `npm run ios`.
 */
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Eindeutige Kennung der App im App Store (umgekehrte Schreibweise, später nicht mehr änderbar).
  appId: 'io.github.bahria.tagesplan',
  appName: 'Tagesplan',
  webDir: 'dist',
  ios: {
    // Kein „Gummiband“ der ganzen Seite – einzelne Bereiche scrollen trotzdem normal.
    scrollEnabled: true,
  },
  plugins: {
    LocalNotifications: {
      // Ist die App offen, spielt sie ihre eigenen Töne – die Mitteilung bleibt dann unsichtbar.
      presentationOptions: [],
    },
    Keyboard: {
      // Die App wird über der Tastatur kleiner, statt die ganze Seite nach oben zu schieben
      // (sonst rutscht die Kopfleiste unter die Uhrzeit und Knöpfe verspringen beim Tippen).
      resize: 'native',
    },
    SplashScreen: {
      // Der ruhige Startbildschirm bleibt, bis die Daten geladen sind (App.tsx) – kein weißes Aufblitzen.
      launchAutoHide: false,
      launchFadeOutDuration: 200,
    },
  },
}

export default config
