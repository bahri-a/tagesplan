# Tagesplan

Eine ruhige Web-App für deine eigene Arbeitsmethode: **Tag → Hauptaufgaben → Arbeitsblöcke**.
Keine Uhrzeiten, keine Streaks, kein Konto. Alle Daten bleiben nur in deinem Chrome.

- **Tag:** 2–3 Hauptaufgaben, die schwerste zuerst.
- **Hauptaufgabe:** ein Ziel, dazu ein, zwei **erste Schritte** zum Loslegen – sofort machbar.
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
- Beim ersten „Starten“ fragt Chrome → **Zulassen**.
- Außerdem in macOS: **Systemeinstellungen → Mitteilungen → Google Chrome →
  „Mitteilungen erlauben“** einschalten.
- Du kannst den Ton in der App unter **Einstellungen → Töne** probehören.

---

## 4. So benutzt du die App

### Planer
- Tab **Planer**: links **Heute**, rechts **Morgen**.
- Titel eintippen, Enter → die Aufgabe klappt auf, und du kannst direkt die **ersten Schritte**
  eintippen (jeweils Enter). Das sind nur winzige Einstiege wie „PDF öffnen“ – keine Blöcke.
- Pro Aufgabe einstellbar: **Blöcke** (Schätzung), **Blocklänge** und **Kurze Pause**.
  Änderst du eine Dauer mit – / +, gilt sie nur für diese Aufgabe („Individuell“);
  **zurücksetzen** holt wieder den Standard. Die Standardwerte – 25 Minuten Block,
  7 Minuten Pause – änderst du unter **Einstellungen**.
- **Startsignal** (optional): „Ich starte, wenn“ steht schon im Feld – du tippst nur den Rest,
  z. B. „der Kaffee auf dem Tisch steht“. In „Heute“ steht es vor dem ersten Block der Aufgabe
  über dem Start-Knopf: „Ich starte, wenn der Kaffee auf dem Tisch steht.“ Solche
  Wenn-dann-Pläne helfen beim Anfangen.
- Reihenfolge: am Griff **⠿** links ziehen. **Schwerste Aufgabe nach oben.**
  Ziehst du eine Karte hinüber in die andere Spalte, liegt sie danach bei **Morgen** (oder
  **Heute**) – praktisch, wenn du heute etwas nicht schaffst.
- **Für morgen kopieren:** das kleine Doppel-Blatt auf jeder Karte von heute. Ein Klick – die
  Aufgabe steht mit ihren ersten Schritten und Einstellungen auch bei Morgen.
- **Zuletzt verwendet** (ganz unten): deine letzten 5 Hauptaufgaben. Ein Klick legt sie wieder
  an – rechts wählst du, ob für **Heute** oder **Morgen** (Standard: Morgen).
  Das kleine **×** in einer Pille nimmt sie aus der Liste (die Aufgabe selbst bleibt).
- **Vorschläge** (darunter): bis zu 5 offene Aufgaben aus der App **Projekte**, von Claude kurz
  als Hauptaufgabe formuliert (1 bis 4 Wörter). Ein Klick legt sie auf dem oben gewählten Tag an,
  der kleine **Papierkorb** oben rechts blendet einen
  Vorschlag aus, und der nächste rückt nach. **Neue Vorschläge** neben der Überschrift blendet alle
  gezeigten auf einmal aus; dann erscheinen die, die wegen der Obergrenze von 5 warten mussten (die kleine
  Zahl zeigt, wie viele). Warten keine, bleibt alles stehen. **Aktualisieren** sucht direkt von hier aus
  im Second Brain und in den Mails nach neuen Aufgaben (über den Projekte-Helfer auf dem Mac, dauert
  1 bis 3 Minuten, höchstens alle 10 Minuten). Funde erscheinen sofort als Vorschläge und in Projekte
  unter „Automatisch“.
- **Aufschub** (unter den Vorschlägen): Vorschläge für später beiseitelegen. Einfach hineinziehen
  (am iPhone kurz halten, dann ziehen) oder per Rechtsklick bzw. langem Drücken → **Aufschieben**.
  Aufgeschobene zählen nicht zu den 5 Vorschlägen; ein Klick legt sie wie gewohnt an, und
  zurück geht es genauso („Zu den Vorschlägen“). In Projekte ändert sich dabei nichts. Das klappt, weil
  beide Apps unter `bahri-a.github.io` liegen; formuliert wird über den Helfer von Projekte auf
  dem Mac. Läuft der Helfer nicht, werden die Titel einfach auf 4 Wörter gekürzt.
- Planst du mehr als dein Limit, erscheint nur ein sanfter Hinweis.
- **Löschen:** der kleine Papierkorb rechts auf jeder Karte. Die Aufgabe ist sofort weg;
  unten steht 8 Sekunden lang **Aufgabe gelöscht · Rückgängig** – ein Klick holt sie mit
  allen Schritten auf ihren alten Platz zurück (nur die zuletzt gelöschte). Läuft für die
  Aufgabe gerade ein Block oder eine Pause, fragt die App vorher nach.

### Durchführen (Tab **Heute**)
- In der großen Karte steht immer die oberste noch offene Aufgabe. Darüber zeigen Punkte
  deine **Blöcke** (voller Punkt = geschafft, breiter Punkt = jetzt dran, leerer Punkt =
  kommt noch). Fährst du mit der Maus darüber, steht dort der ganze Stand als Satz.
- Unter der Karte stehen alle Aufgaben des Tages als kleine Pillen: **grün mit ✓** = erledigt,
  **mildes Orange** = jetzt dran, **durchscheinend** = kommt noch. Ein Klick auf eine Pille zeigt
  darunter eine kurze Übersicht (Blöcke, Startsignal, erste Schritte); nochmal klicken oder ×
  schließt sie. Während eines Blocks ist die Leiste ausgeblendet.
- Vor dem Start siehst du unter dem Titel deine **ersten Schritte zum Einstieg** – nur zum
  Ansehen. Abhaken kannst du sie, sobald der Block läuft.
- Vor dem ersten Block einer Aufgabe steht über dem Knopf dein **Startsignal** (falls
  eingetragen) und darunter klein ein Startsatz wie „Du musst nur anfangen.“
- **Starten** → der Ring füllt sich langsam. Dezent darunter: **Pausieren**, **Früher fertig**
  und **Abbrechen**. „Früher fertig“ ist für Tage, an denen es schneller ging als gedacht: Der Block
  zählt als geschafft, die kurze Pause beginnt sofort. Nur dieser eine Block wird kürzer – die
  nächsten Blöcke sind wieder so lang wie eingestellt.
  Im Hintergrund schimmert es zart grün (im Block) oder blau (in der Pause).
- **Rauschen:** Unter dem Ring schaltet ein einziger Knopf **Rauschen an / aus**. Es läuft nur,
  solange der Block läuft (in Pause und pausiert ist es still). Welches Rauschen (braun, rosa,
  weiß oder Ultra (Mix)), stellst du unter **Einstellungen** ein.
- **2 Minuten vor dem Ende** kommt ein ganz leiser Ton, und der Ring wird langsam wärmer –
  Zeit, den Gedanken zu Ende zu bringen.
- Ab und zu steht im Block ganz unten ein leiser Tipp wie „Abgeschweift? Macht nichts – einfach
  zurückkommen.“ Abschweifen passiert – wichtig ist nur das Zurückkommen.
- Läuft der Block durch → sanfter Ton, die **kurze Pause** startet von selbst.
- Pause vorbei → Ton und **Nächsten Block starten**. Wann du klickst, ist deine Sache.
- Nach dem letzten geschätzten Block kommt **keine** kurze Pause, sondern gleich die Frage:
  **Erledigt** oder **Noch ein Block**. Nach „Erledigt“ wartet die nächste Aufgabe, bis du sie
  startest – ob gleich, in zwei Stunden oder erst morgen.
  „Noch ein Block“ kurz nach dem letzten Block: erst der Rest der kurzen Pause, dann weiter.
  Aus Versehen „Noch ein Block“ geklickt? Oben links in der Karte steht dann kurz **‹ Zurück** –
  damit kommst du wieder zur Frage (bis zum Start des Blocks und noch in seinen ersten 3 Minuten).
- Erledigte Hauptaufgaben stehen oben als eigene kleine Karte mit ✓ – mit Blöcken und echter
  Arbeitszeit. Die nächste Aufgabe steht darunter.
- Vor jeder weiteren Aufgabe: **Lange Pause gemacht? / Weiter mit „…“** (nicht getimt).
- An einem früheren Tag angefangen, aber noch nicht fertig? Dann fragt die App:
  **Weitermachen** oder **Abschließen**.
- Im laufenden Block steht unter dem Timer **Zum Einstieg: …** – dein nächster erster Schritt zum Abhaken.
  Abhaken beendet keinen Block. Sind alle abgehakt, steht dort „Einstieg geschafft!
  Bleib einfach dran, bis die Zeit um ist.“ **Alle Schritte** klappt die ganze Liste auf.
- **Tastenkürzel:** **Leertaste** = starten / pausieren / weiter.
  **N** = Gedanke parken (siehe unten).
- **Mini-Fenster** (unten links): ein kleiner Timer, der immer über allen anderen Fenstern
  liegt – auch über deinem PDF oder Editor. Mit Ring, Rauschen an/aus und Start/Pausieren.
  Du kannst es mit der Maus verschieben und größer ziehen. Nochmal auf den Knopf klicken
  (oder das kleine Fenster schließen) macht es wieder zu.
- Bist du auf einem anderen Tab, zeigt oben rechts eine kleine Anzeige die Restzeit.
  Auch im Fenstertitel steht die Restzeit.

### Tag beenden
- Unten im Tab **Heute**: **Tag beenden**. Du siehst kurz, was du heute geschafft hast
  (Blöcke, Zeit, erledigte Aufgaben). Dann wird „morgen“ zu „heute“.
- Offene Aufgaben wandern auf ihren alten Platz. Ist der schon belegt, siehst du beide
  Aufgaben nebeneinander und wählst mit einem Klick.
  Willst du eine davon gar nicht mehr? Das kleine **×** oben rechts auf der Karte streicht sie:
  eine Aufgabe von heute wird dann nicht mitgenommen, eine für morgen geplante fällt weg.
- Vergessen? Kein Problem: Öffnest du die App am nächsten Tag, fragt sie freundlich nach.
  (Arbeit bis 4 Uhr nachts zählt noch zum alten Tag.)

### Aussehen
- **Einstellungen → Aussehen:** Automatisch / Hell / Dunkel und die **Flächen**:
  **Pur** (massiv, Standard) oder **Milchglas** (leicht durchscheinend).
- **Farbwelt:** **Salbei** (das ursprüngliche Aussehen, Standard), **Fjord** (kühles Blau mit
  feinen Wellen), **Rosé** (gedecktes Rosa mit zartem Punkteraster) oder **Lavendel** (sanftes
  Violett mit weichem Verlauf). Es ändern sich nur Farben und Hintergrund, in Hell wie Dunkel.
- Hast du in macOS „Bewegung reduzieren“ eingeschaltet, gibt es keine Animationen.

### Töne
- **Einstellungen → Töne:** **An** oder **Aus**. Bei „Aus“ bleibt die App komplett still –
  keine Töne am Block- und Pausenende, keine Vorwarnung, kein Rauschen.
- Darunter: welches **Rauschen** (Braun = tief und weich, Rosa, Weiß = hell, **Ultra (Mix)** =
  braun, rosa und weiß im Wechsel, je 12 Sekunden – damit es nicht monoton wird). Unter Braun,
  Rosa und Weiß spielt ein kleiner **Lautsprecher** das Rauschen ein paar Sekunden zum
  Probehören. Darunter kannst du die Töne „Block vorbei“ und „Pause vorbei“ anhören.

### Notizzettel
- Unten rechts **✎ Notizen**: ein Schmierblatt für alles, was dir durch den Kopf geht –
  auch während des Timers. Der Text bleibt, bis du ihn selbst löschst.
- **Gedanke parken mit N:** Schießt dir im Block etwas durch den Kopf, drück **N**, tipp eine
  Zeile und **Enter**. Der Gedanke steht dann unten im Notizzettel, und du arbeitest einfach
  weiter. **Escape** schließt die Zeile, ohne etwas zu speichern.

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
| Farben (hell und dunkel) | ganz oben in `src/index.css` (Farbwelten weiter unten unter FARBWELTEN) |
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
  logic/               ← reine Logik: Timer-Rechnung, Tageswechsel, Übertrag, Daten-Updates (+ Tests)
  store/               ← App-Zustand, Aktionen (addTask, startBlock, endDay …), Abfragen
  screens/             ← die drei Bildschirme: Heute, Planer, Einstellungen
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
