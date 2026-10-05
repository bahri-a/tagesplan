/**
 * GERÄTE-SPEICHER (localStorage)
 * ==============================
 * Ein paar kleine Werte liegen nicht in der Datenbank, sondern im einfachen Browser-Speicher:
 * alles rund um die „Vorschläge“ aus Projekte (siehe projectSuggestions.ts). Projekte liegt unter
 * derselben Adresse und teilt diesen Speicher – deshalb gerade dort.
 *
 * Alle Zugriffe laufen über `deviceStorage()`. Ist der Browser-Speicher gesperrt (z. B. privates
 * Fenster), merkt sich die App die Werte nur für diese Sitzung – nichts bricht ab.
 */

let fallback: Storage | null = null

/** Der Browser-Speicher – oder ein Ersatz nur im Arbeitsspeicher, falls er nicht verfügbar ist. */
export function deviceStorage(): Storage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    /* gesperrt → Ersatz */
  }
  fallback ??= memoryStorage()
  return fallback
}

/** Ein Speicher, der nur im Arbeitsspeicher lebt (für Tests und als Notlösung). */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}
