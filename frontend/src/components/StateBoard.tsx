import { motion } from "framer-motion";
import type { Phase, StateId } from "../hooks/useArduinoState";

const STATES: StateId[] = ["Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];

const LABELS: Record<StateId, string> = {
  Q0: "Reposo",
  Q1: "1°",
  Q2: "2°",
  Q3: "3°",
  Q4: "4°",
  Q5: "Premio",
  Q6: "Fallo",
};

interface Props {
  current: StateId;
  phase: Phase;
}

export function StateBoard({ current, phase }: Props) {
  return (
    <div className="state-board">
      {STATES.map((id, idx) => {
        const active = id === current;
        const isWin = id === "Q5";
        const isLose = id === "Q6";
        const tone = isWin ? "win" : isLose ? "lose" : "neutral";

        return (
          <div className="state-board__cell" key={id}>
            <motion.div
              className={`node node--${tone} ${active ? "node--active" : ""}`}
              animate={active ? { scale: 1.18 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <span className="node__id">{id}</span>
              <span className="node__label">{LABELS[id]}</span>
              {active && phase === "playing" && (
                <motion.span
                  className="node__pulse"
                  animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.div>
            {idx < STATES.length - 1 && <span className="state-board__arrow">→</span>}
          </div>
        );
      })}
    </div>
  );
}
