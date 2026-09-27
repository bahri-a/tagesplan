/**
 * ÜBERTRAG BEIM „TAG BEENDEN“
 * ===========================
 * Nicht erledigte Hauptaufgaben wandern in den neuen Tag – auf dieselbe
 * Position, die sie vorher hatten (Aufgabe 2 bleibt Aufgabe 2).
 * Gleichzeitig wird der Plan für „morgen“ zu „heute“.
 *
 * Wollen eine übertragene und eine geplante Aufgabe auf denselben Platz,
 * ist das ein Konflikt: Du wählst, welche dort bleibt, die andere kommt
 * direkt dahinter. Alles Weitere rutscht eins nach unten.
 */

import type { ID, Task } from '../model/types'

/** Zwei Aufgaben wollen auf denselben Platz. */
export interface CarryConflict {
  /** Platz im neuen Tag (1 = ganz oben). */
  place: number
  carried: Task
  planned: Task
}

/** Deine Wahl je Konflikt. Schlüssel = ID der übertragenen Aufgabe. */
export type ConflictChoices = Record<ID, 'carried' | 'planned'>

export interface CarryOverResult {
  /** Die Aufgaben des neuen Tages in der neuen Reihenfolge. */
  order: Task[]
  conflicts: CarryConflict[]
}

const byPosition = (a: Task, b: Task) => a.position - b.position

/**
 * @param oldDayTasks  alle (nicht gelöschten) Aufgaben des endenden Tages,
 *                     erledigte eingeschlossen – sie bestimmen die Plätze
 * @param plannedTasks alle (nicht gelöschten) Aufgaben von „morgen“
 * @param choices      bereits getroffene Entscheidungen bei Konflikten
 */
export function mergeCarryOver(
  oldDayTasks: Task[],
  plannedTasks: Task[],
  choices: ConflictChoices = {},
): CarryOverResult {
  const oldSorted = [...oldDayTasks].sort(byPosition)
  const plannedSorted = [...plannedTasks].sort(byPosition)

  // Platz (0, 1, 2 …) → nicht erledigte Aufgabe des alten Tages
  const carriedAt = new Map<number, Task>()
  oldSorted.forEach((task, index) => {
    if (task.completedAt === null) carriedAt.set(index, task)
  })

  const order: Task[] = []
  const conflicts: CarryConflict[] = []
  const slots = Math.max(oldSorted.length, plannedSorted.length)

  for (let index = 0; index < slots; index++) {
    const carried = carriedAt.get(index)
    const planned = plannedSorted[index]

    if (carried && planned) {
      conflicts.push({ place: order.length + 1, carried, planned })
      const winner = choices[carried.id] ?? 'carried'
      order.push(...(winner === 'carried' ? [carried, planned] : [planned, carried]))
    } else if (carried) {
      order.push(carried)
    } else if (planned) {
      order.push(planned)
    }
  }

  return { order, conflicts }
}
