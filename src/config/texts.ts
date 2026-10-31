/**
 * TEXTE DER OBERFLÄCHE
 * ====================
 * Die wichtigsten Texte an einer Stelle. Ändere sie hier, wenn dir eine
 * Formulierung nicht gefällt. (Funktionen wie `(name) => …` setzen einen
 * Wert in den Text ein.)
 */

export const T = {
  nav: {
    today: 'Heute',
    plan: 'Planer',
    settings: 'Einstellungen',
    timerBlock: 'Block',
    timerPaused: 'Pausiert',
    timerBreak: 'Pause',
  },

  today: {
    // Fortschritt unter dem Titel: nur die Block-Nummern (die Aufgaben stehen unten in der Leiste) …
    perBlock: (m: number) => `je ${m} Min.`,
    // … und der ganze Stand als Satz (beim Drüberfahren mit der Maus und für Screenreader).
    taskOf: (n: number, total: number) => `Aufgabe ${n} von ${total}`,
    // Mehr Blöcke als geschätzt: nicht „Block 5 von 4“, sondern „Zusatzblock (Block 5)“.
    blockOf: (n: number, total: number) => (n > total ? `Zusatzblock (Block ${n})` : `Block ${n} von ${total}`),
    blockDoneOf: (n: number, total: number) => (n > total ? `Zusatzblock geschafft (Block ${n})` : `Block ${n} von ${total} geschafft`),
    remaining: 'noch',
    minutes: (m: number) => (m === 1 ? '1 Minute' : `${m} Minuten`),
    // Die ersten Schritte – vor dem Start nur zum Ansehen, im Block unter dem Timer zum Loslegen.
    // Sie beenden keinen Block. Überall dasselbe Wort.
    firstStep: 'Zum Einstieg',
    stepDone: 'erledigt',
    startDone: 'Einstieg geschafft!',
    keepGoing: 'Bleib einfach dran, bis die Zeit um ist.',
    keepGoingVariants: [
      'Bleib einfach dran, bis die Zeit um ist.',
      'Jetzt einfach weitermachen – der Ring zählt für dich.',
      'Du bist drin. Bleib dabei, bis die Zeit um ist.',
    ],
    // Startsignal aus dem Planer – steht vor dem ersten Block der Aufgabe über dem Start-Knopf.
    startCue: (cue: string) => `Ich starte, wenn ${cue}.`,
    // Startsatz: klein unter dem Start-Knopf, nur vor dem ersten Block einer Aufgabe.
    startNudges: [
      'Du musst nur anfangen.',
      'Nur anfangen – der Rest ergibt sich.',
      'Klein anfangen reicht völlig.',
    ],
    // Ganz unten in der Karte: anklickbar, zählt den Block als erledigt. Kurz – die Erklärung kommt beim Drüberfahren.
    skipAsDone: 'Schon ohne App erledigt?',
    skipAsDoneHint: 'Habe ich bereits erledigt, aber vergessen die App zu starten.\nDer Block zählt mit voller Zeit.',
    loggedAsDone: 'Block eingetragen',
    // Direkt darunter: Die Hauptaufgabe hat sich erübrigt – die restlichen Blöcke fallen weg.
    skipRest: (left: number) => (left === 1 ? 'Aufgabenblock löschen' : 'Aufgabenblöcke löschen'),
    skipRestHint: 'Hat sich erübrigt: Die restlichen Blöcke fallen weg.\nBisher gearbeitete Minuten zählen.',
    skippedRest: (left: number) => (left === 1 ? 'Block gelöscht' : 'Blöcke gelöscht'),
    startBlock: 'Starten',
    spaceHint: 'Leertaste',
    // Startknopf ab der zweiten Aufgabe – zwei Zeilen: oben die Frage, darunter „Weiter mit …“.
    longPauseAsk: 'Lange Pause gemacht?',
    continueWith: (title: string) => `Weiter mit „${title}“`,
    // Lange Pause nach einer erledigten Hauptaufgabe – eigene ruhige Karte, erst danach kommt die nächste.
    longPauseTitle: 'Lange Pause',
    longPauseText: 'Gut gemacht. Lass dir Zeit – die nächste Aufgabe wartet.',
    longPauseEnd: 'Weiter',
    // Kurz nach „Erledigt“ oben links in der Karte – falls verklickt.
    undoFinish: 'Doch nicht erledigt',
    undoFinishHint: 'Verklickt? Die Aufgabe ist wieder offen.',
    pause: 'Pausieren',
    resume: 'Weiter',
    paused: 'Pausiert – die Zeit steht.',
    abort: 'Abbrechen',
    // Block vorzeitig erfolgreich abschließen – nur dieser Block wird kürzer, die kurze Pause startet.
    finishEarly: 'Früher fertig',
    finishEarlyHint: 'Diesen Block jetzt erfolgreich abschließen und in die kurze Pause gehen',
    finishedEarly: 'Block abgeschlossen',
    abortConfirm: 'Block wirklich abbrechen?',
    abortYes: 'Ja, abbrechen',
    abortNo: 'Nein, weiter',
    breakTitle: 'Kurze Pause',
    breakHint: 'Steh kurz auf, trink etwas, schau aus dem Fenster.',
    // Kleine Abwechslung: In der Pause wechselt der Vorschlag (alles ohne Bildschirm).
    breakHints: [
      'Steh kurz auf, trink etwas, schau aus dem Fenster.',
      'Einmal strecken, ein Glas Wasser – der Bildschirm darf warten.',
      'Geh ein paar Schritte. Bewegung macht den Kopf wieder frei.',
      'Fenster auf, tief durchatmen. Gleich geht es weiter.',
      'Kurz weg vom Bildschirm – Augen und Kopf erholen sich.',
    ],
    breakOver: 'Pause vorbei',
    // Ultra-Modus: Die Pause läuft schon, es piept bis zu 20 Sekunden – das stoppt es früher.
    silenceUltra: 'Ton aus',
    // Leise unten rechts in der Pause – mit kurzer Nachfrage.
    skipBreak: 'Pause überspringen',
    breakSkipped: 'Pause übersprungen',
    // In den letzten Minuten eines Blocks: den Block einmalig um 3 Minuten verlängern.
    extendBlock: '+3 Min.',
    extendBlockHint: 'Block einmalig um 3 Minuten verlängern',
    nextBlock: 'Nächsten Block starten',
    nextTask: 'Nächste Hauptaufgabe starten',
    upNext: 'Als Nächstes:',
    askDone: 'Hauptaufgabe erledigt oder noch ein Block?',
    // Karte über der aktuellen Aufgabe für jede heute erledigte Hauptaufgabe.
    doneCard: 'Erledigt',
    doneCardSkipped: 'Übersprungen',
    doneCardsLabel: 'Heute erledigt',
    // An einem früheren Tag angefangen, aber noch nicht fertig:
    askResume: 'Hier hast du schon angefangen. Weitermachen oder abschließen?',
    resumeTask: 'Weitermachen',
    finishResume: 'Abschließen',
    done: 'Erledigt',
    oneMore: 'Noch ein Block',
    oneMoreStart: 'Noch einen Block starten',
    // Nach „Noch ein Block“: zurück zur Frage (z. B. nach einem Versehen).
    backToAsk: 'Zurück',
    backToAskHint: 'Zurück zur Frage „Erledigt oder noch ein Block?“',
    allDoneTitle: 'Alles erledigt für heute.',
    allDoneText: 'Stark gemacht! Du kannst jetzt morgen planen oder den Tag beenden.',
    // Unter den Tageszahlen in „Alles erledigt“ – die Knöpfe „Tag abschließen“ und „Weitere Aufgaben hinzufügen“ stehen darunter.
    allDoneTexts: [
      'Stark gemacht!\nJetzt noch kurz morgen vorbereiten.',
      'Alles geschafft – gönn dir was.\nMorgen ist schnell geplant.',
      'Richtig gut!\nKurz morgen planen, dann Feierabend.',
    ],
    // „Alles erledigt“: groß den Tag abschließen, leise doch noch weitermachen (dann gleich hier eintippen).
    closeDay: 'Tag abschließen',
    addMore: 'Weitere Aufgaben hinzufügen',
    addMoreBack: 'Zurück',
    // Leeres „Heute“: direkt hier eintippen (Enter legt die Aufgabe für heute an).
    emptyTitle: 'Womit fängst du heute an?',
    emptyText: 'Die schwerste Aufgabe zuerst.',
    goPlan: 'Lieber ausführlich planen',
    dayList: 'Heute',
    // Klick auf eine Aufgabe in der Leiste unter der Karte: kurze Übersicht
    peekHint: (title: string) => `Übersicht: ${title}`,
    peekCurrent: 'Jetzt dran',
    peekUpcoming: 'Kommt noch',
    peekWorked: (blocks: number, time: string) => `${blocks} geschafft (${time})`,
    peekClose: 'Übersicht schließen',
    endDay: 'Tag abschließen',
    // Leise Zeile über „Morgen“ (in „Alles erledigt“ und im leeren „Heute“). Großes M = der Reiter „Morgen“.
    plannedTomorrow: (n: number) => `Für Morgen geplant:\n${n === 1 ? '1 Aufgabe' : `${n} Aufgaben`}`,
    nothingPlanned: 'Für Morgen noch nichts geplant',
    planTomorrow: 'Planen',
    // Leeres „Heute“ am Morgen danach: den geplanten Tag gleich holen.
    fetchPlanned: 'Jetzt holen',
    allSteps: (done: number, total: number) => `Alle Schritte (${done}/${total})`,
    hideSteps: 'Schritte ausblenden',
    // Rauschen im Block: ein Knopf, der deutlich zeigt, ob es an oder aus ist.
    noise: 'Rauschen',
    noiseOn: 'an',
    noiseOff: 'aus',
    noiseTurnOn: 'Rauschen einschalten',
    noiseTurnOff: 'Rauschen ausschalten',
  },

  plan: {
    today: 'Heute',
    tomorrow: 'Morgen',
    manyTasks: 'Weniger Hauptaufgaben, dafür mehr Blöcke – so bleibt der Tag übersichtlich.',
    newTask: 'Neue Hauptaufgabe …',
    add: 'Hinzufügen',
    title: 'Titel',
    steps: 'Erste Schritte',
    // Zwei Zeilen (Zeilenumbruch per \n, siehe .field-hint)
    stepsHint: 'Nur für den Start: ein, zwei winzige Schritte.\nKlein anfangen, der Rest kommt von selbst.',
    // Kleines „i“ neben „Erste Schritte“: warum so klein? (nur Belegtes, vorsichtig formuliert)
    stepsInfo:
      'Studien zeigen:\nErste Schritte anzugehen und abzuhaken liefert Dopaminschübe und erleichtert das weitere Vorankommen und Durchhalten.',
    infoLabel: (label: string) => `Mehr zu „${label}“`,
    firstStep: 'Erster Schritt – sofort machbar, z. B. „PDF öffnen“',
    nextStep: 'Noch ein kleiner Schritt? (optional)',
    blocks: 'Blöcke',
    blockLength: 'Blocklänge',
    shortBreak: 'Kurze Pause',
    // Leise Zeile unter den drei Zahlen: Blöcke + Pausen dazwischen
    totalTime: (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      if (h === 0) return `Insgesamt ${m} Min.`
      return m === 0 ? `Insgesamt ${h} Std.` : `Insgesamt ${h} Std. ${m} Min.`
    },
    standard: 'Standard',
    // Hinweis neben „Kurze Pause“, wenn die Aufgabe nur einen Block hat
    shortBreakOneBlock: 'erst ab 2 Blöcken',
    shortBreakOneBlockHint:
      'Nach dem letzten Block gibt es keine Pause. Sie zählt erst, wenn du am Ende noch einen Block dazunimmst.',
    custom: 'Individuell',
    reset: 'zurücksetzen',
    resetLabel: (label: string, m: number) => `${label} auf Standard (${m} Min.) zurücksetzen`,
    minutesShort: 'Min.',
    blocksMeta: (n: number) => (n === 1 ? '1 Block' : `${n} Blöcke`),
    stepsMeta: (done: number, total: number) => `${done}/${total} Schritte`,
    // Startsignal (optional): „Ich starte, wenn“ steht fest im Feld, getippt wird nur der Rest.
    startCue: 'Startsignal',
    startCuePrefix: 'Ich starte, wenn',
    // Kleines, leises Schild hinter „Erste Schritte“ und „Ich starte, wenn …“: nichts davon ist Pflicht.
    optional: 'optional',
    startCuePlaceholder: 'der Kaffee auf dem Tisch steht',
    // Leises Häkchen unter dem Startsignal: Satz für alle neuen Hauptaufgaben vorausfüllen.
    startCueRemember: 'Für alle neuen Hauptaufgaben',
    startCueRememberHint: 'Neue Hauptaufgaben beginnen mit diesem Satz. Du kannst ihn bei jeder Aufgabe ändern.',
    done: 'Erledigt',
    reopen: 'Wieder öffnen',
    markDone: 'Als erledigt markieren',
    // Löschen: Papierkorb rechts auf jeder Karte, danach kurz „Rückgängig“.
    delete: 'Aufgabe löschen',
    deleteLabel: (title: string) => `Aufgabe „${title}“ löschen`,
    deleted: 'Aufgabe gelöscht',
    // Kopieren (nur auf Karten von heute) und Verschieben zwischen den Tagen
    copyToTomorrow: 'Für morgen kopieren',
    copyLabel: (title: string) => `„${title}“ für morgen kopieren`,
    copied: (title: string) => `„${title}“ für morgen kopiert`,
    moveBlocked: 'Für diese Aufgabe läuft gerade ein Block – verschieben geht danach.',
    dropHere: 'Hierher ziehen',
    // Leiser Knopf unter beiden Spalten: tauscht die Aufgaben von heute und morgen.
    swapDays: 'Heute und Morgen tauschen',
    swapToToday: 'Alle offenen Aufgaben auf heute verschieben',
    swapToTomorrow: 'Alle offenen Aufgaben auf morgen verschieben',
    swapped: 'Heute und Morgen getauscht.',
    swappedTo: (day: string) => `Alle offenen Aufgaben liegen jetzt bei ${day}.`,
    swapBlocked: 'Gerade läuft ein Block – tauschen geht danach.',
    dragMoved: (title: string, day: string) => `„${title}“ liegt jetzt bei ${day}.`,
    // „Zuletzt verwendet“ unten in „Planen“
    recentTitle: 'Zuletzt verwendet',
    recentTarget: 'Hinzufügen zu',
    // Handy: Umschalter oben im Planer
    dayTabs: 'Welcher Tag?',
    recentAdd: (title: string, day: string) => `„${title}“ zu ${day} hinzufügen`,
    recentHide: (title: string) => `„${title}“ aus „Zuletzt verwendet“ entfernen`,
    recentNone: (day: string) => `Steht alles schon bei ${day}.`,
    recentAdded: (title: string, day: string) => `„${title}“ steht jetzt bei ${day}.`,
    // Beim letzten Mal wurden mehr oder weniger Blöcke gebraucht als geschätzt → diese Zahl übernommen.
    recentAddedLearned: (title: string, day: string, blocks: number) =>
      `„${title}“ steht jetzt bei ${day} – mit ${blocks === 1 ? '1 Block' : `${blocks} Blöcken`} wie beim letzten Mal.`,
    // „Vorschläge“ darunter: offene Aufgaben aus der App „Projekte“
    suggestionsTitle: 'Vorschläge',
    suggestionSource: (title: string) => `Aus Projekte: „${title}“`,
    suggestionHide: (title: string) => `„${title}“ aus „Vorschläge“ entfernen`,
    suggestionsRefresh: 'Neue Vorschläge',
    suggestionsRefreshHint: (waiting: number) =>
      `Diese Vorschläge ausblenden und die nächsten zeigen (${waiting} ${waiting === 1 ? 'wartet' : 'warten'})`,
    suggestionsNoMore: 'Gerade keine weiteren Vorschläge in Projekte.',
    suggestionsReload: 'Aktualisieren',
    suggestionsSearching: 'Sucht …',
    suggestionsReloadHint: 'Im Second Brain und in den Mails nach neuen Aufgaben suchen (dauert 1–3 Minuten)',
    suggestionsUpdated: 'Nichts Neues gefunden.',
    suggestionsUpdatedNew: (n: number) => `${n} ${n === 1 ? 'neue Aufgabe' : 'neue Aufgaben'} gefunden.`,
    suggestionsNone: 'Gerade keine neuen Vorschläge.',
    listReset: 'Reset',
    recentResetHint: 'Alle aus „Zuletzt verwendet“ entfernen',
    recentResetDone: '„Zuletzt verwendet“ ist leer.',
    suggestionsResetHint: 'Alle Vorschläge ausblenden',
    suggestionsResetQuestion: 'Alle Vorschläge ausblenden?',
    suggestionsResetConfirm: 'Ausblenden',
    suggestionsResetCancel: 'Abbrechen',
    suggestionsResetDone: 'Alle Vorschläge ausgeblendet.',
    suggestionsLimit: (n: number) => `max. ${n}`,
    suggestionsLimitHint: 'Wie viele Vorschläge höchstens erscheinen (1 bis 10)',
    // „Aufgeschoben“ unter den Vorschlägen
    deferredTitle: 'Aufgeschoben',
    deferredSubtitle: 'Für die Zukunft',
    deferredMove: 'Aufschieben',
    deferredMoveBack: 'Zu den Vorschlägen',
    deferredRemove: 'Entfernen',
    deferredDropHere: 'Hier ablegen',
    deferredDropBack: 'Hier ablegen',
    deferredEmpty: 'Hierher ziehen, um es für später beiseitezulegen',
    deferredEmptyBack: 'Hierher ziehen, um es wieder vorzuschlagen',
    deferredMoved: (title: string) => `„${title}“ ist jetzt aufgeschoben.`,
    deferredBack: (title: string) => `„${title}“ ist wieder bei den Vorschlägen.`,
    undo: 'Rückgängig',
    // Nur wenn für die Aufgabe gerade ein Block oder eine kurze Pause läuft (der Timer kommt nicht zurück).
    dragHandle: 'Ziehen zum Sortieren',
    removeStep: 'Schritt entfernen',
    close: 'Zuklappen',
    empty: 'Noch nichts geplant.',
    // Ansagen für Screenreader beim Verschieben
    dragInstructions:
      'Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben, Leertaste zum Ablegen, Escape zum Abbrechen.',
    dragStart: (title: string) => `„${title}“ aufgenommen.`,
    dragOver: (title: string, place: number) => `„${title}“ über Platz ${place}.`,
    dragEnd: (title: string, place: number) => `„${title}“ auf Platz ${place} abgelegt.`,
    dragCancel: (title: string) => `Verschieben von „${title}“ abgebrochen.`,
  },

  endDay: {
    title: 'Tag abschließen',
    question: 'Möchtest du den Tag jetzt abschließen?',
    // Nur, wenn noch etwas offen ist:
    questionOpen: 'Offene Aufgaben wandern auf ihren Platz im neuen Tag.',
    runningBlock: 'Der laufende Block wird dabei gestoppt – deine Minuten bleiben gespeichert.',
    conflictTitle: (place: number) => `Welche Aufgabe soll auf Platz ${place}?`,
    conflictHint: 'Die andere kommt direkt dahinter. Mit × streichst du eine.',
    dropLabel: (title: string) => `„${title}“ streichen`,
    carried: 'von heute',
    planned: 'für morgen geplant',
    confirm: 'Tag abschließen',
    cancel: 'Abbrechen',
    // Nach „Tag abschließen“ (abends) …
    finished: 'Feierabend!\nMorgen geht es hier weiter.',
    // … und nach „Neuen Tag beginnen“ (am Morgen danach).
    welcome: 'Neuer Tag – schön, dass du da bist.',
    // Kleiner Tagesertrag im Dialog – ohne Vergleich, ohne Streak.
    yieldTitle: 'Heute geschafft',
    yieldBlocks: (n: number) => (n === 1 ? '1 Block' : `${n} Blöcke`),
    yieldTime: (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      if (h === 0) return `${m} Min.`
      return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`
    },
    // Sammeln statt Serie: die Gesamtzahl seit Beginn – sie fällt nie zurück.
    lifetime: (n: number) => `Bisher insgesamt: ${n === 1 ? '1 Block' : `${n} Blöcke`}`,
  },

  // Einmalige, leise Meldung bei 10, 25, 50, 100, 250 und 500 Blöcken.
  milestone: {
    reached: (blocks: number, minutes: number) =>
      `${blocks} Blöcke.\nDas sind ${minutes < 120 ? `${minutes} Minuten` : `${Math.round(minutes / 60)} Stunden`} echte Arbeit.`,
    // Nur einmal, beim 50. Block.
    recommend: 'Kennst du jemanden, dem das helfen würde?',
  },

  // Weiterempfehlen und Fokus-Einladung: Teilen-Menü – oder, wo es keins gibt, den Link kopieren.
  share: {
    title: 'Tagesplan',
    action: 'Teilen',
    copied: 'Link kopiert',
    recommendText: 'Tagesplan hilft mir beim Dranbleiben: Aufgaben in kurze Blöcke teilen und einfach anfangen.',
  },

  // Fokus-Einladung per Link: gemeinsam arbeiten, beide Blöcke enden zur selben Minute.
  invite: {
    action: 'Einladen',
    hint: 'Link schicken: Wer ihn öffnet, arbeitet mit.\nSein Block endet zur selben Minute wie deiner.',
    text: (clock: string) =>
      `Arbeitest du mit? Mein Fokus-Block läuft bis ${clock}. Über den Link startest du einen Block, der zur selben Minute endet.`,
    title: 'Gemeinsam arbeiten',
    open: (clock: string) => `Ein Fokus-Block läuft bis ${clock}.\nArbeite mit: Dein Block endet zur selben Minute.`,
    withTask: 'Mit:',
    newTask: 'Woran arbeitest du?',
    join: 'Mitmachen',
    notNow: 'Nicht jetzt',
    over: 'Dieser Block ist schon vorbei.\nFrag einfach nach einem neuen Link.',
    busy: 'Bei dir läuft gerade schon ein Block.\nMitmachen geht, sobald er vorbei ist.',
    close: 'Schließen',
  },

  // Beispielaufgabe beim allerersten Start.
  example: {
    title: 'Tagesplan ausprobieren',
    steps: ['Tief durchatmen', 'Diesen Schritt abhaken'],
  },

  // Am nächsten Kalendertag, wenn der alte Tag noch offen ist: leiser Link oben in „Heute“.
  newDay: {
    link: 'Neuen Tag beginnen',
    hint: (dayName: string) =>
      `${dayName} ist noch offen. Ein Klick beendet ihn – offene Aufgaben wandern auf ihren Platz im neuen Tag.`,
  },

  // Taste N: einen Gedanken parken, ohne den Block zu verlassen (landet im Notizzettel).
  park: {
    placeholder: 'Gedanke parken … (Enter)',
    label: 'Gedanke parken',
    done: 'Geparkt. Weiter geht’s.',
    hint: 'N = Gedanke parken',
  },

  // Vor der ersten Frage nach Mitteilungen (die kommt nur ein einziges Mal).
  // Ein Wort je Gerät, wie das System: iPhone „Mitteilungen“, Mac „Benachrichtigungen“.
  notifyPrimer: {
    title: 'Eine Sache vorab',
    textMobile: 'Damit du das Blockende hörst,\nauch wenn das iPhone gesperrt ist:\nerlaube gleich die Mitteilungen.',
    textMac: 'Damit du das Blockende mitbekommst,\nauch wenn Tagesplan im Hintergrund ist:\nerlaube gleich die Benachrichtigungen.',
    next: 'Weiter',
    // Leise unter dem Startknopf (Handy), wenn Mitteilungen abgelehnt sind.
    off: 'Mitteilungen aus · Blockende nur bei offener App',
  },

  // Tafel mit allen Tastenkürzeln (Taste ?).
  shortcuts: {
    title: 'Tastenkürzel',
    list: [
      [['Leertaste'], 'Starten · Pausieren · Weiter'],
      [['N'], 'Schnellnotiz für deine Notizen'],
      [['1', '2', '3'], 'Heute · Planer · Einstellungen'],
      [['?'], 'Diese Übersicht'],
    ] as [string[], string][],
    close: 'Fertig',
    open: 'Tastenkürzel anzeigen (?)',
  },

  // Mac hat mitten im Block geschlafen (Deckel zu).
  sleep: {
    title: 'Warst du die ganze Zeit dran?',
    text: (minutes: number) =>
      `Der Mac war ${minutes} Min. im Ruhezustand.\nJa: Die Zeit zählt als Arbeit.\nNein: Der Block wird abgebrochen und kommt noch einmal.`,
    yes: 'Ja, zählt',
    no: 'Nein, abbrechen',
  },

  // Auffangnetz bei einem unerwarteten Fehler (statt weißer Seite).
  error: {
    title: 'Da ist etwas schiefgegangen.',
    text: 'Deine gespeicherten Daten sind unberührt.\nLade die App einfach neu.',
    reload: 'Neu laden',
    backup: 'Sicherung herunterladen',
    // Nur ein Bildschirm (Heute, Planer, Einstellungen) – der Rest der App läuft weiter.
    screenTitle: 'Hier ist etwas schiefgelaufen.',
    screenText: 'Der Timer läuft weiter,\ndeine Daten sind unberührt.',
    // Die Daten ließen sich beim Start nicht öffnen (auch nicht beim zweiten Versuch).
    startTitle: 'Deine Daten ließen sich gerade nicht öffnen.',
    startText: 'Sie sind nicht weg.\nLade die App einfach neu.',
  },

  // Mini-Fenster: kleiner Timer, der immer über allen Fenstern liegt.
  mini: {
    open: 'Mini-Fenster',
    close: 'Mini-Fenster schließen',
    hint: 'Kleiner Timer, der immer im Vordergrund bleibt',
    title: 'Tagesplan',
    nothing: 'Gerade ist nichts dran.',
  },

  notes: {
    open: 'Notizen',
    title: 'Notizzettel',
    placeholder: 'Alles, was dir gerade durch den Kopf geht …',
    close: 'Schließen',
  },

  settings: {
    title: 'Einstellungen',
    blocksSection: 'Arbeitszeit',
    // Handy: die Einstellungen als Reiter (je einer passt auf den Bildschirm)
    tabs: 'Bereich',
    tabBlocks: 'Blöcke',
    tabAppearance: 'Aussehen',
    tabSounds: 'Töne',
    tabData: 'Daten',
    blockMinutes: 'Blocklänge',
    blockMinutesHint: 'So lange arbeitest du am Stück.',
    shortBreak: 'Kurze Pause',
    shortBreakHint: 'Pause nach jedem Block.',
    defaultBlocks: 'Blöcke pro Hauptaufgabe',
    defaultBlocksHint: 'Startwert für neue Hauptaufgaben.',
    minutes: 'Min.',
    appearance: 'Aussehen',
    theme: 'Hell oder dunkel',
    themeHint: 'Automatisch folgt dem Gerät.',
    themeSystem: 'Automatisch',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    palette: 'Farbwelt',
    paletteHint: 'Ändert nur Farben und Hintergrund. Alles andere bleibt, wie es ist.',
    paletteSalbei: 'Salbei',
    paletteFjord: 'Fjord',
    paletteRose: 'Rosé',
    paletteLavendel: 'Lavendel',
    sounds: 'Töne & Benachrichtigungen',
    soundsMobile: 'Töne & Mitteilungen',
    soundsLabel: 'Töne',
    soundsHint: 'Aus = keine Töne bei Block- und Pausenende.\nDas Rauschen bleibt davon unberührt.',
    soundsOn: 'An',
    soundsOff: 'Aus',
    noiseColor: 'Rauschen',
    noiseColorHint: 'Läuft nur während eines Blocks. Ein- und ausschalten direkt in „Heute“.',
    noiseBrown: 'Braun',
    noisePink: 'Rosa',
    noiseWhite: 'Weiß',
    // Braun, rosa und weiß im Wechsel (je 12 Sekunden) – damit es nicht monoton wird.
    noiseMix: 'Ultra (Mix)',
    noisePreview: (name: string) => `${name} probehören`,
    testBlockEnd: 'Ton „Block vorbei“',
    testBreakEnd: 'Ton „Pause vorbei“',
    ultraLabel: 'Ultra-Modus',
    ultraHint: 'Endet ein Block, piept es bis zu 20 Sekunden –\ndie Pause läuft dabei schon.',
    ultraOn: 'An',
    ultraOff: 'Aus',
    testUltra: 'Ton „Ultra“',
    notifyGranted: 'Benachrichtigungen sind erlaubt.',
    notifyDefault: 'Benachrichtigungen sind noch nicht erlaubt.',
    notifyDenied:
      'Benachrichtigungen sind blockiert. Du kannst sie über das Symbol links neben der Adresse wieder erlauben.',
    notifyAllow: 'Erlauben',
    // Handy im Browser (z. B. iPhone-Safari): dort heißen sie „Mitteilungen“.
    mobileNotifyGranted: 'Mitteilungen sind erlaubt.',
    mobileNotifyDefault: 'Mitteilungen sind noch nicht erlaubt.',
    mobileNotifyDenied: 'Mitteilungen sind blockiert. Du kannst sie in den Einstellungen des Browsers wieder erlauben.',
    // iPhone-App: Mitteilungen statt Browser-Benachrichtigungen
    nativeNotifyGranted: 'Mitteilungen sind erlaubt – auch bei gesperrtem iPhone kommt das Signal.',
    nativeNotifyDefault: 'Mitteilungen sind noch nicht erlaubt. Ohne sie klingelt nichts, wenn das iPhone gesperrt ist.',
    nativeNotifyDenied:
      'Mitteilungen sind ausgeschaltet. Du kannst sie in den iPhone-Einstellungen unter „Tagesplan“ → „Mitteilungen“ erlauben.',
    data: 'Daten',
    backup: 'Sichern',
    backupHint: 'Speichert alle deine Daten als Datei.',
    backupShareTitle: 'Tagesplan-Sicherung',
    // iPhone-App: unter „Sichern“, wo die täglichen Sicherungen liegen.
    backupAuto: 'Jeden Tag automatisch:\nDateien › Auf meinem iPhone › Tagesplan.',
    // Unter „Sichern“: wann zuletzt gesichert wurde (auf diesem Gerät).
    backupLast: (days: number | null) =>
      days === null
        ? 'Auf diesem Gerät noch nicht gesichert.'
        : days === 0
          ? 'Zuletzt gesichert: heute.'
          : days === 1
            ? 'Zuletzt gesichert: gestern.'
            : `Zuletzt gesichert: vor ${days} Tagen.`,
    // Leise Erinnerung beim Öffnen (höchstens einmal am Tag).
    backupReminder: (days: number | null) =>
      days === null ? 'Deine Daten sind noch nicht gesichert.' : `Letzte Sicherung vor ${days} Tagen.`,
    backupReminderAction: 'Jetzt sichern',
    // Speichern hat (auch nach einem zweiten Versuch) nicht geklappt.
    saveFailed: 'Konnte gerade nicht speichern.\nSichere deine Daten zur Sicherheit als Datei.',
    recommend: 'Weiterempfehlen',
    recommendHint: 'Kennst du jemanden, dem Tagesplan helfen würde?\nSchick einfach den Link weiter.',
    restore: 'Wiederherstellen',
    restoreHint: 'Lädt eine Sicherungsdatei – ersetzt die aktuellen Daten.',
    restoreConfirmTitle: 'Sicherung wiederherstellen?',
    restoreConfirm: (date: string) => `Die Sicherung vom ${date} ersetzt alle Daten, die gerade in der App sind.`,
    // Vergleich vor dem Ersetzen: was steckt drin? (Tage, Hauptaufgaben, durchgehaltene Blöcke)
    restoreInBackup: 'In der Sicherung:',
    restoreInApp: 'Jetzt in der App:',
    restoreCounts: (days: number, tasks: number, blocks: number) =>
      `${days === 1 ? '1 Tag' : `${days} Tage`} · ${tasks === 1 ? '1 Aufgabe' : `${tasks} Aufgaben`} · ${blocks === 1 ? '1 Block' : `${blocks} Blöcke`}`,
    restoreAppNewer: 'Achtung: Die App hat neuere Daten als die Sicherung.',
    restoreSafety: 'Dein jetziger Stand wird vorher als Datei gesichert.',
    // iPhone-App: Die Sicherheitskopie landet direkt bei den täglichen Sicherungen.
    restoreSafetyNative: 'Dein jetziger Stand wird vorher unter\nDateien › Tagesplan › Sicherungen abgelegt.',
    restoreSafetyFailed: 'Die Sicherheitskopie ließ sich nicht ablegen – deshalb ist nichts ersetzt.\nVersuch es gleich noch einmal.',
    restoreYes: 'Ja, wiederherstellen',
    restoreNo: 'Abbrechen',
    restoreDone: 'Fertig – deine Sicherung ist wiederhergestellt.',
    restoreInvalid: 'Diese Datei konnte ich nicht lesen. Ist es eine Tagesplan-Sicherung (.json)?',
    version: (date: string) => `Version vom ${date}`,
    storagePersisted: 'Der Browser behält deine Daten dauerhaft.',
    storageNotPersisted:
      'Der Browser hat den dauerhaften Speicher noch nicht bestätigt. Das passiert meist automatisch, sobald die App installiert ist. Sichere zur Sicherheit ab und zu.',
  },

  notification: {
    blockEndTitle: 'Block geschafft',
    blockEndBody: (title: string) => `Zeit für eine kurze Pause. (${title})`,
    lastBlockEndBody: (title: string) => `Alle geplanten Blöcke geschafft. Erledigt oder noch einer? (${title})`,
    breakEndTitle: 'Pause vorbei',
    breakEndBody: (title: string) => `Bereit für den nächsten Block? (${title})`,
    // iPhone-App: Pop-up beim Zurückkehren, wenn die Mitteilung während der Sperre schon geklingelt hat.
    wakeButton: 'Weiter',
  },

  // Ansagen für VoiceOver (unsichtbar, nur mit eingeschaltetem Screenreader zu hören).
  a11y: {
    blockWarning: () => 'Noch 2 Minuten in diesem Block.',
    blockEnd: (lastBlock: boolean) =>
      lastBlock ? 'Block geschafft. Hauptaufgabe erledigt oder noch ein Block?' : 'Block geschafft. Zeit für eine kurze Pause.',
    breakEnd: () => 'Pause vorbei. Bereit für den nächsten Block.',
  },

  update: {
    ready: 'Eine neue Version der App ist bereit.',
    reload: 'Neu laden',
  },
}
