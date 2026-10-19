"use client";

import confetti from "canvas-confetti";

const COLORS = ["#0a84ff", "#8b5cf6", "#bf5af2", "#30d158", "#34c7b8"];

function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function burst(origin = { x: 0.5, y: 0.6 }) {
  if (reduced()) return;
  void confetti({ particleCount: 60, spread: 70, startVelocity: 38, origin, colors: COLORS, scalar: 0.9, ticks: 180 });
}

export function celebrate() {
  if (reduced()) return;
  const end = Date.now() + 900;
  const frame = () => {
    void confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS });
    void confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  burst({ x: 0.5, y: 0.45 });
}
