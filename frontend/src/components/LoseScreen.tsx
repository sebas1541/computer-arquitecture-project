import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const AUTO_RESET_S = 5;

const FUNNY_MESSAGES = [
  "Hoy no hay pollo. Vuelve a intentarlo.",
  "Casi… pero el pollo siguió en la rotisería.",
  "Patrón equivocado. El pollo se quedó en Ara.",
  "Otra vez será — el pollo te está esperando.",
];

export function LoseScreen() {
  const [remaining, setRemaining] = useState(AUTO_RESET_S);
  const [message] = useState(
    () => FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]
  );

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, Math.ceil(AUTO_RESET_S - elapsed));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="overlay overlay--lose"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="overlay__panel"
        initial={{ scale: 0.85, y: 20 }}
        animate={{
          scale: 1,
          y: 0,
          x: [0, -8, 8, -6, 6, -3, 3, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 220, damping: 16 },
          y:     { type: "spring", stiffness: 220, damping: 16 },
          x:     { duration: 0.45, ease: "easeInOut" },
        }}
      >
        <h1 className="overlay__lose-title">FALLO</h1>
        <p className="overlay__lose-subtitle">{message}</p>
        <div className="overlay__lose-hint">
          Reset en{" "}
          <span className="overlay__win-countdown">{remaining}s</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
