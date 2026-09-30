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
    // Fortschritt oben: nur die Block-Punkte (die Aufgaben stehen unten in der Leiste) …
    perBlock: (m: number) => `je ${m} Min.`,
    // … und der ganze Stand als Satz (beim Drüberfahren mit der Maus und für Screenreader).
    taskOf: (n: number, total: number) => `Aufgabe ${n} von ${total}`,
    blockOf: (n: number, total: number) => `Block ${n} von ${total}`,
    blockDoneOf: (n: number, total: number) => `Block ${n} von ${total} geschafft`,
    remaining: 'noch',
    minutes: (m: number) => (m === 1 ? '1 Minute' : `${m} Minuten`),
    // Die ersten Schritte unter dem Timer – nur zum Loslegen, sie beenden keinen Block.
    firstStep: 'Zum Einstieg',
    // Vor dem Start (und in der Pause): die ersten Schritte nur ansehen, noch nicht abhaken.
    firstStepsPreview: 'Erste Schritte zum Einstieg',
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
    // Ab und zu (nicht in jedem Block) ganz leise ganz unten in der Karte: Abschweifen ist okay.
    gentleLines: [
      'Abgeschweift? Macht nichts – einfach zurückkommen.',
      'Gedanken wandern. Du holst sie einfach zurück.',
      'Ablenkung ist normal. Weiter geht’s, bis der Ring voll ist.',
    ],
    startBlock: 'Starten',
    spaceHint: 'Leertaste',
    // Startknopf ab der zweiten Aufgabe – zwei Zeilen: oben die Frage, darunter „Weiter mit …“.
    longPauseAsk: 'Lange Pause gemacht?',
    continueWith: (title: string) => `Weiter mit „${title}“`,
    // Lange Pause nach einer erledigten Hauptaufgabe – eigene ruhige Karte, erst danach kommt die nächste.
    longPauseTitle: 'Lange Pause',
    longPauseText: 'Gut gemacht. Lass dir Zeit – die nächste Aufgabe wartet.',
    longPauseEnd: 'Weiter',
    longPauseNext: 'Danach:',
    pause: 'Pausieren',
    resume: 'Weiter',
    paused: 'Pausiert – die Zeit steht.',
    abort: 'Abbrechen',
    // Block vorzeitig erfolgreich abschließen – nur dieser Block wird kürzer, die kurze Pause startet.
    finishEarly: 'Früher fertig',
    finishEarlyHint: 'Diesen Block jetzt erfolgreich abschließen und in die kurze Pause gehen',
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
    // Ultra-Modus: Die fällige Pause muss bestätigt werden, sonst piept es weiter.
    ultraAsk: 'Zeit für die Pause!',
    breakConfirm: 'Pause machen',
    // In den letzten 2 Minuten eines Blocks: den Block um 2 Minuten verlängern.
    extendBlock: '+2 Min.',
    extendBlockHint: 'Block um 2 Minuten verlängern',
    nextBlock: 'Nächsten Block starten',
    askDone: 'Hauptaufgabe erledigt oder noch ein Block?',
    // Karte über der aktuellen Aufgabe für jede heute erledigte Hauptaufgabe.
    doneCard: 'Erledigt',
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
    allDoneTexts: [
      'Stark gemacht! Du kannst jetzt morgen planen oder den Tag beenden.',
      'Alles geschafft – gönn dir was. Morgen planen oder Tag beenden?',
      'Das war’s für heute. Richtig gut! Plane morgen oder beende den Tag.',
    ],
    emptyTitle: 'Noch keine Aufgabe für heute.',
    emptyText: 'Plane eine Hauptaufgabe – die schwerste zuerst.',
    goPlan: 'Jetzt planen',
    dayList: 'Heute',
    // Klick auf eine Aufgabe in der Leiste unter der Karte: kurze Übersicht
    peekHint: (title: string) => `Übersicht: ${title}`,
    peekCurrent: 'Jetzt dran',
    peekUpcoming: 'Kommt noch',
    peekWorked: (blocks: number, time: string) => `${blocks} geschafft (${time})`,
    peekClose: 'Übersicht schließen',
    endDay: 'Tag beenden',
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
    swapToToday: 'Alle Aufgaben auf heute verschieben',
    swapToTomorrow: 'Alle Aufgaben auf morgen verschieben',
    swapped: 'Heute und Morgen getauscht.',
    swappedTo: (day: string) => `Alle Aufgaben liegen jetzt bei ${day}.`,
    swapBlocked: 'Gerade läuft ein Block – tauschen geht danach.',
    dragMoved: (title: string, day: string) => `„${title}“ liegt jetzt bei ${day}.`,
    // „Zuletzt verwendet“ unten in „Planen“
    recentTitle: 'Zuletzt verwendet',
    recentTarget: 'Hinzufügen zu',
    recentAdd: (title: string, day: string) => `„${title}“ zu ${day} hinzufügen`,
    recentHide: (title: string) => `„${title}“ aus „Zuletzt verwendet“ entfernen`,
    recentNone: (day: string) => `Steht alles schon bei ${day}.`,
    recentAdded: (title: string, day: string) => `„${title}“ steht jetzt bei ${day}.`,
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
    deleteRunningBlock: 'Der laufende Block wird beendet. Trotzdem löschen?',
    deleteRunningBreak: 'Die laufende kurze Pause wird beendet. Trotzdem löschen?',
    deleteYes: 'Ja, löschen',
    deleteNo: 'Nein',
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
    title: 'Tag beenden',
    question: 'Möchtest du den Tag jetzt beenden? Offene Aufgaben wandern auf ihren Platz im neuen Tag.',
    runningBlock: 'Der laufende Block wird dabei gestoppt – deine Minuten bleiben gespeichert.',
    conflictTitle: (place: number) => `Welche Aufgabe soll auf Platz ${place}?`,
    conflictHint: 'Die andere kommt direkt dahinter. Mit × streichst du eine.',
    dropLabel: (title: string) => `„${title}“ streichen`,
    carried: 'von heute',
    planned: 'für morgen geplant',
    confirm: 'Tag beenden',
    cancel: 'Abbrechen',
    finished: 'Neuer Tag – schön, dass du da bist.',
    // Kleiner Tagesertrag im Dialog – ohne Vergleich, ohne Streak.
    yieldTitle: 'Heute geschafft',
    yieldBlocks: (n: number) => (n === 1 ? '1 Block' : `${n} Blöcke`),
    yieldTime: (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      if (h === 0) return `${m} Min.`
      return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`
    },
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
    blockMinutes: 'Blocklänge',
    blockMinutesHint: 'So lange arbeitest du am Stück.',
    shortBreak: 'Kurze Pause',
    shortBreakHint: 'Pause nach jedem Block.',
    defaultBlocks: 'Blöcke pro Hauptaufgabe',
    defaultBlocksHint: 'Startwert für neue Hauptaufgaben.',
    minutes: 'Min.',
    appearance: 'Aussehen',
    themeSystem: 'Automatisch',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    surfaces: 'Flächen',
    surfacesPur: 'Pur',
    surfacesGlass: 'Milchglas',
    palette: 'Farbwelt',
    paletteHint: 'Ändert nur Farben und Hintergrund. Alles andere bleibt, wie es ist.',
    paletteSalbei: 'Salbei',
    paletteFjord: 'Fjord',
    paletteRose: 'Rosé',
    paletteLavendel: 'Lavendel',
    sounds: 'Töne & Benachrichtigungen',
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
    testBlockEnd: '▶ Ton „Block vorbei“',
    testBreakEnd: '▶ Ton „Pause vorbei“',
    ultraLabel: 'Ultra-Modus',
    ultraHint: 'Beginnt die kurze Pause, piept es so lange, bis du „Pause machen“ drückst. So übergehst du keine Pause.',
    ultraOn: 'An',
    ultraOff: 'Aus',
    testUltra: '▶ Ton „Ultra“',
    notifyGranted: 'Chrome-Benachrichtigungen sind erlaubt.',
    notifyDefault: 'Chrome-Benachrichtigungen sind noch nicht erlaubt.',
    notifyDenied:
      'Chrome-Benachrichtigungen sind blockiert. Du kannst sie über das Schloss-Symbol links neben der Adresse wieder erlauben.',
    notifyAllow: 'Erlauben',
    data: 'Daten',
    backup: 'Sichern',
    backupHint: 'Speichert alle deine Daten als Datei.',
    restore: 'Wiederherstellen',
    restoreHint: 'Lädt eine Sicherungsdatei – ersetzt die aktuellen Daten.',
    restoreConfirmTitle: 'Sicherung wiederherstellen?',
    restoreConfirm: (date: string) =>
      `Die Sicherung vom ${date} ersetzt alle Daten, die gerade in der App sind.`,
    restoreYes: 'Ja, wiederherstellen',
    restoreNo: 'Abbrechen',
    restoreDone: 'Fertig – deine Sicherung ist wiederhergestellt.',
    restoreInvalid: 'Diese Datei konnte ich nicht lesen. Ist es eine Tagesplan-Sicherung (.json)?',
    version: (date: string) => `Version vom ${date}`,
    storagePersisted: 'Chrome behält deine Daten dauerhaft.',
    storageNotPersisted:
      'Chrome hat den dauerhaften Speicher noch nicht bestätigt. Das passiert meist automatisch, sobald die App installiert ist. Sichere zur Sicherheit ab und zu.',
  },

  notification: {
    blockEndTitle: 'Block geschafft',
    blockEndBody: (title: string) => `Zeit für eine kurze Pause. (${title})`,
    lastBlockEndBody: (title: string) => `Alle geplanten Blöcke geschafft. Erledigt oder noch einer? (${title})`,
    breakEndTitle: 'Pause vorbei',
    breakEndBody: (title: string) => `Bereit für den nächsten Block? (${title})`,
  },

  update: {
    ready: 'Eine neue Version der App ist bereit.',
    reload: 'Neu laden',
  },
}
