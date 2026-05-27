import { motion } from "framer-motion";

export function LoseScreen() {
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
        initial={{ scale: 0.7 }}
        animate={{
          scale: 1,
          x: [0, -10, 10, -8, 8, -4, 4, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 220, damping: 16 },
          x: { duration: 0.55, ease: "easeInOut" },
        }}
      >
        <h1 className="overlay__title overlay__title--lose">FALLO</h1>
        <p className="overlay__subtitle">
          La secuencia no coincidió con el patrón (o se agotó el tiempo). Presiona el botón de reinicio para volver a intentarlo.
        </p>
      </motion.div>
    </motion.div>
  );
}
