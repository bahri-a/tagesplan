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
    plan: 'Planen',
    settings: 'Einstellungen',
    timerBlock: 'Block',
    timerPaused: 'Pausiert',
    timerBreak: 'Pause',
  },

  today: {
    // Fortschritt oben: zwei kurze Zeilen mit Symbolen …
    progressTask: 'Aufgabe',
    progressBlock: 'Block',
    perBlock: (m: number) => `je ${m} Min.`,
    // … und derselbe Stand als ganzer Satz (beim Drüberfahren mit der Maus und für Screenreader).
    taskOf: (n: number, total: number) => `Aufgabe ${n} von ${total}`,
    blockOf: (n: number, total: number) => `Block ${n} von ${total}`,
    blockDoneOf: (n: number, total: number) => `Block ${n} von ${total} geschafft`,
    remaining: 'noch',
    minutes: (m: number) => (m === 1 ? '1 Minute' : `${m} Minuten`),
    // Die ersten Schritte unter dem Timer – nur zum Loslegen, sie beenden keinen Block.
    firstStep: 'Zum Einstieg',
    startDone: 'Einstieg geschafft!',
    keepGoing: 'Bleib einfach dran, bis die Zeit um ist.',
    startBlock: 'Block starten',
    longPauseDone: (title: string) => `Lange Pause gemacht – weiter mit „${title}“`,
    pause: 'Pausieren',
    resume: 'Weiter',
    paused: 'Pausiert – die Zeit steht.',
    abort: 'Abbrechen',
    abortConfirm: 'Block wirklich abbrechen?',
    abortYes: 'Ja, abbrechen',
    abortNo: 'Nein, weiter',
    breakTitle: 'Kurze Pause',
    breakHint: 'Steh kurz auf, trink etwas, schau aus dem Fenster.',
    breakOver: 'Pause vorbei',
    nextBlock: 'Nächsten Block starten',
    askDone: 'Hauptaufgabe erledigt oder noch ein Block?',
    done: 'Erledigt',
    oneMore: 'Noch ein Block',
    oneMoreStart: 'Noch einen Block starten',
    allDoneTitle: 'Alles erledigt für heute.',
    allDoneText: 'Stark gemacht! Du kannst jetzt morgen planen oder den Tag beenden.',
    emptyTitle: 'Noch keine Aufgabe für heute.',
    emptyText: 'Plane eine Hauptaufgabe – die schwerste zuerst.',
    goPlan: 'Jetzt planen',
    dayList: 'Heute',
    endDay: 'Tag beenden',
    allSteps: (done: number, total: number) => `Alle Schritte (${done}/${total})`,
    hideSteps: 'Schritte ausblenden',
  },

  plan: {
    today: 'Heute',
    tomorrow: 'Morgen',
    hardestFirst: 'Schwerste Aufgabe nach oben.',
    overLimit: (max: number) =>
      `Das sind mehr als deine üblichen ${max} Hauptaufgaben. Das ist okay – vielleicht passt eine auch auf einen anderen Tag.`,
    newTask: 'Neue Hauptaufgabe …',
    add: 'Hinzufügen',
    title: 'Titel',
    steps: 'Erste Schritte',
    stepsHint:
      'Nur für den Start: ein, zwei winzige Schritte. Danach arbeitest du einfach weiter, bis der Block um ist.',
    firstStep: 'Erster Schritt – sofort machbar, z. B. „PDF öffnen“',
    nextStep: 'Noch ein kleiner Schritt? (optional)',
    blocks: 'Blöcke',
    blockLength: 'Blocklänge',
    standard: (m: number) => `Standard (${m} Min.)`,
    custom: 'Eigene',
    minutesShort: 'Min.',
    blocksMeta: (n: number) => (n === 1 ? '1 Block' : `${n} Blöcke`),
    stepsMeta: (done: number, total: number) => `${done}/${total} Schritte`,
    done: 'Erledigt',
    reopen: 'Wieder öffnen',
    markDone: 'Als erledigt markieren',
    delete: 'Löschen',
    deleteConfirm: 'Aufgabe löschen?',
    yes: 'Ja',
    no: 'Nein',
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
    conflictHint: 'Die andere kommt direkt dahinter.',
    carried: 'von heute',
    planned: 'für morgen geplant',
    confirm: 'Tag beenden',
    cancel: 'Abbrechen',
    finished: 'Neuer Tag – schön, dass du da bist.',
  },

  welcome: {
    title: 'Willkommen zurück!',
    question: (dayName: string) => `Möchtest du den Tag von ${dayName} beenden?`,
    yes: 'Ja, Tag beenden',
    no: 'Nein, ich arbeite noch daran',
  },

  notes: {
    open: 'Notizen',
    title: 'Notizzettel',
    placeholder: 'Alles, was dir gerade durch den Kopf geht …',
    close: 'Schließen',
  },

  settings: {
    title: 'Einstellungen',
    blocksSection: 'Arbeitsblöcke',
    blockMinutes: 'Blocklänge',
    blockMinutesHint: 'So lange arbeitest du am Stück.',
    shortBreak: 'Kurze Pause',
    shortBreakHint: 'Pause nach jedem Block.',
    defaultBlocks: 'Blöcke pro Hauptaufgabe',
    defaultBlocksHint: 'Startwert für neue Hauptaufgaben.',
    maxTasks: 'Hauptaufgaben pro Tag',
    maxTasksHint: 'Darüber erscheint ein sanfter Hinweis.',
    minutes: 'Min.',
    appearance: 'Aussehen',
    themeSystem: 'Automatisch',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    sounds: 'Töne & Benachrichtigungen',
    testBlockEnd: '▶ Ton „Block vorbei“',
    testBreakEnd: '▶ Ton „Pause vorbei“',
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
    breakEndTitle: 'Pause vorbei',
    breakEndBody: (title: string) => `Bereit für den nächsten Block? (${title})`,
  },

  update: {
    ready: 'Eine neue Version der App ist bereit.',
    reload: 'Neu laden',
  },
}
