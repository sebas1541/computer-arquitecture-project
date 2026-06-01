// Desbloqueo de audio para sortear la política de autoplay de los navegadores.
//
// El juego se controla con botones físicos del Arduino, así que la página web
// nunca recibe un gesto del usuario y `audio.play()` queda bloqueado. Aquí
// preparamos UN elemento de audio compartido y lo "desbloqueamos" en el primer
// gesto real sobre la página (clic / tecla / toque). Tras ese gesto, el mismo
// elemento puede reproducirse luego de forma programática al ganar.

const SONG_SRC = "/salioelpollo.mp3";
const SONG_VOLUME = 0.85;

let winAudio: HTMLAudioElement | null = null;
let unlocked = false;
const unlockListeners = new Set<(unlocked: boolean) => void>();

export function getWinAudio(): HTMLAudioElement {
  if (!winAudio) {
    winAudio = new Audio(SONG_SRC);
    winAudio.preload = "auto";
    winAudio.volume = SONG_VOLUME;
  }
  return winAudio;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function onAudioUnlockChange(cb: (unlocked: boolean) => void): () => void {
  unlockListeners.add(cb);
  return () => unlockListeners.delete(cb);
}

/**
 * Engancha un listener de "primer gesto" que desbloquea el audio.
 * Devuelve una función de limpieza para retirar los listeners.
 */
export function setupAudioUnlock(): () => void {
  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];

  const cleanup = () => events.forEach((e) => window.removeEventListener(e, handler));

  function handler() {
    if (unlocked) {
      cleanup();
      return;
    }
    const audio = getWinAudio();
    const prevVolume = audio.volume;
    audio.volume = 0; // reproducir en silencio solo para obtener el permiso
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = prevVolume;
        unlocked = true;
        unlockListeners.forEach((cb) => cb(true));
        cleanup();
      })
      .catch(() => {
        // Si falla, restauramos el volumen y dejamos los listeners para el
        // próximo gesto del usuario.
        audio.volume = prevVolume;
      });
  }

  if (unlocked) return () => {};
  events.forEach((e) => window.addEventListener(e, handler));
  return cleanup;
}
