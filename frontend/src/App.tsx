import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useArduinoState } from "./hooks/useArduinoState";
import { StateBoard } from "./components/StateBoard";
import { WinScreen } from "./components/WinScreen";
import { LoseScreen } from "./components/LoseScreen";
import { setupAudioUnlock, onAudioUnlockChange, isAudioUnlocked } from "./audio";

const SYMBOL_COLORS: Record<string, { dot: string; name: string }> = {
  a: { dot: "#C76B5E", name: "Rojo" },
  b: { dot: "#6B9D6E", name: "Verde" },
  c: { dot: "#D4A056", name: "Amarillo" },
  d: { dot: "#5E83B5", name: "Azul" },
};

export default function App() {
  const { state, pattern, lastInput, phase, connected } = useArduinoState();
  const [soundReady, setSoundReady] = useState<boolean>(isAudioUnlocked());

  // El juego se controla con botones físicos, así que el navegador bloquea el
  // audio hasta que haya un gesto sobre la página. Desbloqueamos en el primer
  // clic/tecla/toque y ocultamos el aviso cuando ya está listo.
  useEffect(() => {
    const stopUnlock = setupAudioUnlock();
    const stopListen = onAudioUnlockChange(setSoundReady);
    return () => {
      stopUnlock();
      stopListen();
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div className="header__brand">
            <span className="header__title">Caja Fuerte de Patrones</span>
            <span className="header__subtitle">AFD en vivo · Arduino UNO</span>
          </div>
          <div className="header__status">
            {!soundReady && (
              <span className="status status--sound" title="El navegador bloquea el sonido hasta que interactúes con la página">
                🔊 Haz clic para activar el sonido
              </span>
            )}
            <div className={`status status--${connected ? "ok" : "off"}`}>
              <span className="status__dot" />
              {connected ? "Arduino conectado" : "Sin conexión"}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <StateBoard current={state} phase={phase} />

        <section className="hud">
          <article className="hud__card">
            <h3 className="hud__label">Estado actual</h3>
            <p className="hud__value hud__value--xl">{state}</p>
          </article>

          <article className="hud__card">
            <h3 className="hud__label">Patrón</h3>
            {pattern ? (
              <div className="pattern">
                {pattern.split("").map((sym, i) => {
                  const c = SYMBOL_COLORS[sym];
                  return (
                    <div key={i} className="pattern__slot" title={c?.name ?? sym}>
                      <span
                        className="pattern__dot"
                        style={{ background: c?.dot ?? "#999" }}
                      />
                      <span className="pattern__index">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="hud__value hud__value--muted">Esperando partida…</p>
            )}
          </article>

          <article className="hud__card">
            <h3 className="hud__label">Última entrada</h3>
            <p className="hud__value">
              {lastInput ? (
                <span>
                  <span
                    className="pattern__dot pattern__dot--inline"
                    style={{ background: SYMBOL_COLORS[lastInput]?.dot ?? "#999" }}
                  />
                  {SYMBOL_COLORS[lastInput]?.name ?? lastInput}
                </span>
              ) : (
                <span className="hud__value--muted">—</span>
              )}
            </p>
          </article>
        </section>

        <footer className="footer">
          {phase === "idle" && "Presiona cualquier botón A/B/C/D en el Arduino para iniciar."}
          {phase === "playing" && "Reproduce el patrón antes de que se agote el tiempo (8 s por pulsación)."}
          {phase === "won"  && "¡Salió el pollo! Disfruta la canción."}
          {phase === "lost" && "Fallo. Reset automático en 5 segundos."}
        </footer>
      </main>

      <AnimatePresence>
        {phase === "won"  && <WinScreen  key="win"  />}
        {phase === "lost" && <LoseScreen key="lose" />}
      </AnimatePresence>
    </div>
  );
}
