import { AnimatePresence } from "framer-motion";
import { useArduinoState } from "./hooks/useArduinoState";
import { StateBoard } from "./components/StateBoard";
import { WinScreen } from "./components/WinScreen";
import { LoseScreen } from "./components/LoseScreen";

const SYMBOL_COLORS: Record<string, { dot: string; name: string }> = {
  a: { dot: "#ef4444", name: "Rojo" },
  b: { dot: "#22c55e", name: "Verde" },
  c: { dot: "#eab308", name: "Amarillo" },
  d: { dot: "#3b82f6", name: "Azul" },
};

export default function App() {
  const { state, pattern, lastInput, phase, connected } = useArduinoState();

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="header__title">Caja Fuerte de Patrones</span>
          <span className="header__subtitle">AFD en vivo · Arduino UNO</span>
        </div>
        <div className={`status status--${connected ? "ok" : "off"}`}>
          <span className="status__dot" />
          {connected ? "Arduino conectado" : "Sin conexión"}
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
                        style={{ background: c?.dot ?? "#888" }}
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
                    style={{ background: SYMBOL_COLORS[lastInput]?.dot ?? "#888" }}
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
          {phase === "playing" && "Reproduce el patrón antes de que se agote el tiempo (2 s por pulsación)."}
          {phase === "won"  && "¡Premio entregado! Presiona el botón de reinicio."}
          {phase === "lost" && "Fallo. Presiona el botón de reinicio para volver a jugar."}
        </footer>
      </main>

      <AnimatePresence>
        {phase === "won"  && <WinScreen  key="win"  />}
        {phase === "lost" && <LoseScreen key="lose" />}
      </AnimatePresence>
    </div>
  );
}
