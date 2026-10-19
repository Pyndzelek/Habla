import type { Transition, Variants } from "motion/react";

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.8 } satisfies Transition,
  gentle: { type: "spring", stiffness: 260, damping: 28 } satisfies Transition,
  bouncy: { type: "spring", stiffness: 420, damping: 18 } satisfies Transition,
  flip: { type: "spring", stiffness: 300, damping: 26, mass: 0.9 } satisfies Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: spring.gentle },
};

export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});
