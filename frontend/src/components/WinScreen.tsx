import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

const SONG_DURATION_S = 30.27;

export function WinScreen() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [remaining, setRemaining] = useState<number>(Math.ceil(SONG_DURATION_S));

  // Reproducir audio una sola vez al montar
  useEffect(() => {
    const audio = new Audio("/salioelpollo.mp3");
    audio.volume = 0.85;
    audioRef.current = audio;
    audio.play().catch(() => {
      // Algunos navegadores bloquean autoplay sin interacción previa.
      // Lo dejamos silencioso pero el resto del overlay funciona igual.
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // Cuenta regresiva visible
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, Math.ceil(SONG_DURATION_S - elapsed));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Pequeño confeti al inicio (sutil, no se come la pantalla)
  useEffect(() => {
    const colors = ["#E8956B", "#D4816B", "#D4A056", "#6B9D6E", "#FBE5D4"];
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 }, colors });
    const t1 = setTimeout(() => {
      confetti({ particleCount: 60, angle: 60,  spread: 65, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 65, origin: { x: 1, y: 0.6 }, colors });
    }, 600);
    return () => clearTimeout(t1);
  }, []);

  return (
    <motion.div
      className="overlay overlay--win"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="overlay__win-grid">
        <motion.img
          className="overlay__logo"
          src="/logo-ara.svg"
          alt="Ara"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 18 }}
        />

        <motion.div
          className="overlay__win-message"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 240, damping: 16 }}
        >
          <motion.h1
            className="overlay__win-title"
            animate={{
              rotate: [0, -1.5, 1.5, -1, 1, 0],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            ¡SALIÓ EL POLLO!
          </motion.h1>
          <p className="overlay__win-subtitle">
            Reproduciste el patrón sin errores.<br />
            Te ganaste un <strong>pollo asado de Ara</strong>
            <span className="overlay__win-emoji">🍗</span>
          </p>
        </motion.div>

        <motion.img
          className="overlay__chicken"
          src="/polloara.webp"
          alt="Pollo de Ara"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: [0, -8, 0],
            scale: 1,
          }}
          transition={{
            opacity: { delay: 0.35, duration: 0.4 },
            scale:   { delay: 0.35, type: "spring", stiffness: 220, damping: 14 },
            y:       { delay: 0.8, duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        <div className="overlay__win-hint">
          Reset disponible en{" "}
          <span className="overlay__win-countdown">{remaining}s</span>
        </div>
      </div>
    </motion.div>
  );
}
