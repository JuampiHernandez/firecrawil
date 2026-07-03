"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      <motion.div
        className="absolute left-1/3 top-1/2 h-[32rem] w-[32rem] rounded-full bg-orange-500/[0.05] blur-3xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
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

const revealVariants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function Reveal({
  children,
  className,
  delay = 0,
  y,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={y !== undefined ? { opacity: 0, y, filter: "blur(6px)" } : "hidden"}
      whileInView={y !== undefined ? { opacity: 1, y: 0, filter: "blur(0px)" } : "visible"}
      variants={y === undefined ? revealVariants : undefined}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={revealVariants}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className,
  lift = -6,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: lift, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 22 });
  const background = useTransform(
    [springX, springY],
    ([x, y]: number[]) =>
      `radial-gradient(480px circle at ${x}% ${y}%, rgba(255,138,31,0.16), transparent 65%)`
  );

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    mouseX.set(((event.clientX - bounds.left) / bounds.width) * 100);
    mouseY.set(((event.clientY - bounds.top) / bounds.height) * 100);
  }

  return (
    <div onPointerMove={handlePointerMove} className={cn("relative", className)}>
      <motion.div className="pointer-events-none absolute inset-0 -z-10" style={{ background }} />
      {children}
    </div>
  );
}

export function RadarPulse({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none overflow-hidden rounded-full", className)}>
      <div className="relative h-full w-full">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg, rgba(255,138,31,0.45), transparent 30%, transparent 70%, rgba(255,138,31,0.25))" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[3px] rounded-full bg-[#0b0c0e]" />
        {[0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            className="absolute inset-0 rounded-full border border-orange-400/50"
            initial={{ scale: 0.2, opacity: 0.7 }}
            animate={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut", delay: ring * 1.05 }}
          />
        ))}
        <div className="absolute inset-0 grid place-items-center">
          <motion.span
            className="h-2.5 w-2.5 rounded-full bg-orange-400"
            animate={{
              boxShadow: [
                "0 0 8px rgba(255,106,0,0.55)",
                "0 0 22px rgba(255,106,0,1)",
                "0 0 8px rgba(255,106,0,0.55)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

export function PulseGlow({ className }: { className?: string }) {
  return (
    <motion.div
      className={className}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function AnimatedBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn("h-1.5 flex-1 overflow-hidden rounded-full bg-white/10", className)}>
      <motion.div
        className={cn("h-full rounded-full bg-orange-500", barClassName)}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplay(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      <NumberFlow value={display} format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }} />
      {suffix}
    </span>
  );
}

export function AnimatedScoreRing({ score, size = 144 }: { score: number; size?: number }) {
  const [display, setDisplay] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(0);
  const springProgress = useSpring(progress, { stiffness: 60, damping: 18 });
  const dashOffset = useTransform(springProgress, (value) => circumference - (value / 100) * circumference);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      progress.set(score);
      setDisplay(score);
    });
    return () => cancelAnimationFrame(frame);
  }, [score, progress]);

  return (
    <motion.div
      className="relative grid place-items-center"
      style={{ height: size, width: size }}
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.22),transparent_58%)]" />
      <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90">
        <circle cx="88" cy="88" r={radius} stroke="currentColor" strokeWidth="10" fill="none" className="text-white/10" />
        <motion.circle
          cx="88"
          cy="88"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
          className="text-orange-400"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-4xl font-semibold tracking-[-0.05em]">
          <NumberFlow value={display} />
        </p>
        <p className="text-xs text-muted-foreground">/100</p>
      </div>
    </motion.div>
  );
}
