# Tagesplan

Eine ruhige Web-App für deine eigene Arbeitsmethode: **Tag → Hauptaufgaben → Arbeitsblöcke**.
Keine Uhrzeiten, keine Streaks, kein Konto. Alle Daten bleiben nur in deinem Chrome.

- **Tag:** 2–3 Hauptaufgaben, die schwerste zuerst.
- **Hauptaufgabe:** ein Ziel, zerlegt in kleine Schritte. Der erste Schritt ist sofort machbar.
- **Arbeitsblock:** feste Zeit mit Timer, danach eine kurze Pause.

---

## Inhalt

1. [App lokal testen](#1-app-lokal-testen)
2. [GitHub-Repository und GitHub Pages einrichten](#2-github-repository-und-github-pages-einrichten)
3. [App in Chrome installieren und ins Dock legen](#3-app-in-chrome-installieren-und-ins-dock-legen)
4. [So benutzt du die App](#4-so-benutzt-du-die-app)
5. [Daten sichern und wiederherstellen](#5-daten-sichern-und-wiederherstellen)
6. [Etwas ändern und neue Version veröffentlichen](#6-etwas-ändern-und-neue-version-veröffentlichen)
7. [Wo steht was? (Projektaufbau)](#7-wo-steht-was-projektaufbau)

---

## 1. App lokal testen

„Lokal“ heißt: Die App läuft nur auf deinem Mac, noch nicht im Internet.

1. Öffne das **Terminal** (Cmd + Leertaste, „Terminal“ tippen, Enter).
2. Wechsle in den Projektordner:
   ```bash
   cd ~/Tagesplan_App
   ```
3. Nur beim allerersten Mal (oder wenn sich Bibliotheken geändert haben):
   ```bash
   npm install
   ```
4. Starte die App:
   ```bash
   npm run dev
   ```
5. Im Terminal erscheint eine Adresse wie `http://localhost:5173/`. Öffne sie in Chrome.
6. Beenden: Im Terminal **Ctrl + C** drücken.

Weitere nützliche Befehle:

| Befehl | Was er tut |
|---|---|
| `npm test` | Lässt die automatischen Tests laufen (sollten alle „passed“ sein). |
| `npm run build` | Baut die fertige App in den Ordner `dist/`. |
| `npm run preview` | Zeigt die fertig gebaute App an (inkl. Offline-Funktion). |

> **Wichtig:** Die lokale Version (`localhost`) und die Online-Version (GitHub Pages) haben
> **getrennte Daten**. Nutze für den Alltag die installierte Online-Version.

---

## 2. GitHub-Repository und GitHub Pages einrichten

Das machst du nur **einmal**. Danach geht jede neue Version automatisch online.

### Schritt A – GitHub-Konto
Falls noch nicht vorhanden: auf [github.com/signup](https://github.com/signup) ein kostenloses Konto anlegen.

### Schritt B – GitHub-Programm fürs Terminal installieren
```bash
brew install gh
```

### Schritt C – Im Terminal bei GitHub anmelden
```bash
gh auth login
```
Beantworte die Fragen mit den Pfeiltasten und Enter:
- *Where do you use GitHub?* → **GitHub.com**
- *Preferred protocol?* → **HTTPS**
- *Authenticate Git with your GitHub credentials?* → **Yes**
- *How would you like to authenticate?* → **Login with a web browser**

Das Terminal zeigt einen Code (z. B. `ABCD-1234`). Drücke Enter, Chrome öffnet sich,
füge den Code ein und bestätige.

### Schritt D – Repository anlegen
Im Projektordner:
```bash
cd ~/Tagesplan_App
gh repo create tagesplan --public --source=. --remote=origin
```
Das legt auf GitHub das Repository `tagesplan` an und verbindet es mit deinem Ordner.
*(Öffentlich ist nötig, damit GitHub Pages kostenlos ist. Öffentlich ist nur der **Code** –
deine Daten liegen nie auf GitHub.)*

### Schritt E – GitHub Pages einschalten
1. Öffne in Chrome `https://github.com/DEIN-NAME/tagesplan` (DEIN-NAME = dein GitHub-Name).
2. Oben auf **Settings** klicken.
3. Links auf **Pages** klicken.
4. Unter **Build and deployment** → **Source** wählst du **GitHub Actions**.

### Schritt F – Hochladen (und damit veröffentlichen)
```bash
git push -u origin main
```
Auf GitHub im Reiter **Actions** siehst du jetzt „Veröffentlichen auf GitHub Pages“ laufen
(gelber Punkt = läuft, grüner Haken = fertig, etwa 1–2 Minuten).

Deine App liegt dann unter:
```
https://DEIN-NAME.github.io/tagesplan/
```

> Falls der erste Lauf ein rotes ✗ zeigt (z. B. weil Pages noch nicht eingeschaltet war):
> Schritt E prüfen, dann in **Actions** den Lauf anklicken → **Re-run all jobs**.

---

## 3. App in Chrome installieren und ins Dock legen

1. Öffne `https://DEIN-NAME.github.io/tagesplan/` in **Chrome**.
2. Rechts in der Adressleiste erscheint ein kleines Symbol (Bildschirm mit Pfeil) →
   klicken → **Installieren**.
   *Alternativ:* Menü **⋮** → **Streamen, speichern und teilen** → **Tagesplan installieren …**
3. Die App öffnet sich in einem eigenen Fenster.
4. **Ins Dock legen:** Rechtsklick auf das Tagesplan-Symbol im Dock →
   **Optionen** → **Im Dock behalten**.

Ab jetzt startest du die App mit einem Klick aus dem Dock. Sie funktioniert auch ohne Internet.

**Benachrichtigungen erlauben** (damit du das Block- und Pausenende auch im Hintergrund mitbekommst):
- Beim ersten „Block starten“ fragt Chrome → **Zulassen**.
- Außerdem in macOS: **Systemeinstellungen → Mitteilungen → Google Chrome →
  „Mitteilungen erlauben“** einschalten.
- Du kannst den Ton in der App unter **Einstellungen → Töne** probehören.

---

## 4. So benutzt du die App

### Planen
- Tab **Planen**: links **Heute**, rechts **Morgen**.
- Titel eintippen, Enter → die Aufgabe klappt auf, und du kannst direkt die Schritte
  eintippen (jeweils Enter).
- Pro Aufgabe einstellbar: **Blöcke** (Schätzung) und **Blocklänge** (Standard oder eigene).
- Reihenfolge: am Griff **⠿** links ziehen. **Schwerste Aufgabe nach oben.**
- Planst du mehr als dein Limit, erscheint nur ein sanfter Hinweis.

### Durchführen (Tab **Heute**)
- Oben steht immer die oberste noch offene Aufgabe mit dem aktuellen Schritt.
- **Block starten** → der Timer läuft. Dezent darunter: **Pausieren** und **Abbrechen**.
- Läuft der Block durch → sanfter Ton, die **kurze Pause** startet von selbst.
- Pause vorbei → Ton und **Nächsten Block starten**. Wann du klickst, ist deine Sache.
- Nach dem letzten geschätzten Block: **Erledigt** oder **Noch ein Block**.
- Vor jeder weiteren Aufgabe: **Lange Pause gemacht – weiter mit …** (nicht getimt).
- Schritte hakst du jederzeit ab. **Alle Schritte** klappt die ganze Liste auf.
- Bist du auf einem anderen Tab, zeigt oben rechts eine kleine Anzeige die Restzeit.
  Auch im Fenstertitel steht die Restzeit.

### Tag beenden
- Unten im Tab **Heute**: **Tag beenden**. „Morgen“ wird zu „heute“.
- Offene Aufgaben wandern auf ihren alten Platz. Ist der schon belegt, siehst du beide
  Aufgaben nebeneinander und wählst mit einem Klick.
- Vergessen? Kein Problem: Öffnest du die App am nächsten Tag, fragt sie freundlich nach.
  (Arbeit bis 4 Uhr nachts zählt noch zum alten Tag.)

### Notizzettel
- Unten rechts **✎ Notizen**: ein Schmierblatt für alles, was dir durch den Kopf geht –
  auch während des Timers. Der Text bleibt, bis du ihn selbst löschst.

---

## 5. Daten sichern und wiederherstellen

Deine Daten liegen **nur in Chrome auf diesem Mac**. Löschst du in Chrome die
Website-Daten, sind sie weg. Sichere deshalb ab und zu:

- **Sichern:** Einstellungen → **Sichern** → eine Datei wie
  `tagesplan-sicherung-2026-09-28.json` landet in deinem Ordner **Downloads**.
  Tipp: Lege sie zusätzlich in iCloud Drive ab.
- **Wiederherstellen:** Einstellungen → **Wiederherstellen** → Datei wählen → bestätigen.
  Das ersetzt alle aktuellen Daten durch die Sicherung.

---

## 6. Etwas ändern und neue Version veröffentlichen

Die meisten Wünsche lassen sich an **einer** Stelle ändern:

| Was | Wo |
|---|---|
| Startwerte, Tageswechsel (4 Uhr), Lautstärke | `src/config/defaults.ts` |
| Alle Texte der Oberfläche | `src/config/texts.ts` |
| Farben (hell und dunkel) | ganz oben in `src/index.css` |
| Töne (Noten) | `src/signals/sounds.ts` |

Nach einer Änderung (lokal mit `npm run dev` ausprobieren) veröffentlichst du so:
```bash
git add -A
git commit -m "Kurze Beschreibung der Änderung"
git push
```
Nach 1–2 Minuten ist die neue Version online. In der installierten App erscheint unten
der Hinweis **„Eine neue Version der App ist bereit“** → **Neu laden**.
Ein laufender Timer läuft danach einfach weiter.

---

## 7. Wo steht was? (Projektaufbau)

```
src/
  config/defaults.ts   ← alle Standardwerte an einer Stelle
  config/texts.ts      ← alle Texte der Oberfläche
  model/types.ts       ← Datenmodell (sync-tauglich: UUIDs, Zeitstempel, weiches Löschen)
  db/database.ts       ← Speichern/Laden in IndexedDB
  db/backup.ts         ← Sichern und Wiederherstellen
  logic/               ← reine Logik: Timer-Rechnung, Tageswechsel, Übertrag (+ Tests)
  store/               ← App-Zustand, Aktionen (addTask, startBlock, endDay …), Abfragen
  screens/             ← die drei Bildschirme: Heute, Planen, Einstellungen
  components/          ← Bausteine: Timer-Ring, Aufgaben-Karte, Dialoge, Notizzettel …
  signals/             ← sanfte Töne und Chrome-Benachrichtigungen
scripts/make-icons.mjs ← erzeugt die App-Icons (node scripts/make-icons.mjs)
.github/workflows/     ← automatisches Veröffentlichen auf GitHub Pages
```

**Technik:** React + TypeScript + Vite, installierbare PWA (offline), Daten nur lokal
in IndexedDB. Zusatz-Bibliotheken: `vite-plugin-pwa`, `idb`, `@dnd-kit` (Drag & Drop).

**Später möglich:** Synchronisierung mit iPhone/Windows (z. B. Firebase). Das Datenmodell
ist dafür vorbereitet (jeder Eintrag hat eine UUID, `createdAt`, `updatedAt` und wird nur
„weich“ gelöscht), die Sync selbst ist noch nicht eingebaut.
