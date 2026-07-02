"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const statements = [
  "Missing OpenAPI specs",
  "Broken first-request paths",
  "Stale examples",
  "Invisible LLM entrypoints",
];

export function AmbientLandingEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl"
        animate={{ x: [0, 80, 20, 0], y: [0, 40, 120, 0], scale: [1, 1.18, 0.92, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-32 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl"
        animate={{ x: [0, -70, -20, 0], y: [0, 90, 30, 0], scale: [1, 0.86, 1.12, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-1/2 h-72 w-72 rounded-full bg-orange-700/15 blur-3xl"
        animate={{ x: ["-50%", "-42%", "-58%", "-50%"], opacity: [0.4, 0.7, 0.35, 0.4] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function RotatingSignal() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % statements.length), 1800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-7 items-center gap-2 text-sm text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_16px_rgba(255,106,0,0.95)]" />
      <span>Detect</span>
      <span className="relative inline-flex min-w-48 overflow-hidden text-orange-200">
        <AnimatePresence mode="wait">
          <motion.span
            key={statements[index]}
            initial={{ y: 16, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -16, opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.28 }}
          >
            {statements[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
