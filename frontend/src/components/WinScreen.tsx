import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export function WinScreen() {
  useEffect(() => {
    const end = Date.now() + 3500;
    const colors = ["#22d3ee", "#facc15", "#34d399", "#f472b6", "#a78bfa"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors });
  }, []);

  return (
    <motion.div
      className="overlay overlay--win"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="overlay__panel"
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
      >
        <motion.h1
          className="overlay__title overlay__title--win"
          animate={{ textShadow: ["0 0 10px #34d399", "0 0 40px #22d3ee", "0 0 10px #34d399"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          ¡PREMIO ENTREGADO!
        </motion.h1>
        <p className="overlay__subtitle">
          Reproduciste el patrón correctamente. Presiona el botón de reinicio en el Arduino para jugar de nuevo.
        </p>
      </motion.div>
    </motion.div>
  );
}
