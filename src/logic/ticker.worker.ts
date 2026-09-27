/**
 * TAKTGEBER IM HINTERGRUND (Web Worker)
 * =====================================
 * Chrome bremst normale Timer stark, wenn ein Fenster im Hintergrund ist.
 * Ein Web Worker läuft in einem eigenen Faden und wird dabei kaum gebremst.
 * Er meldet deshalb jede Sekunde „tick“ – die App prüft dann, ob ein Block
 * oder eine Pause zu Ende ist, und spielt pünktlich den Ton.
 *
 * Nachrichten an den Worker: 'start' (Takt an) oder 'stop' (Takt aus).
 */

let intervalId: ReturnType<typeof setInterval> | undefined

self.onmessage = (event: MessageEvent<'start' | 'stop'>) => {
  if (event.data === 'start' && intervalId === undefined) {
    intervalId = setInterval(() => self.postMessage('tick'), 1000)
  } else if (event.data === 'stop' && intervalId !== undefined) {
    clearInterval(intervalId)
    intervalId = undefined
  }
}
