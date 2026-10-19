"use client";

import { getProgress } from "./progress";

/** Tiny synthesized UI sounds — no audio files to ship. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!getProgress().settings.sounds) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  correct() {
    tone(880, 0, 0.18, "sine", 0.07);
    tone(1318.5, 0.07, 0.28, "sine", 0.06);
  },
  almost() {
    tone(660, 0, 0.18, "triangle", 0.06);
    tone(880, 0.08, 0.22, "triangle", 0.05);
  },
  wrong() {
    tone(220, 0, 0.22, "triangle", 0.08);
    tone(185, 0.09, 0.26, "triangle", 0.07);
  },
  flip() {
    tone(520, 0, 0.06, "sine", 0.035);
  },
  pop() {
    tone(740, 0, 0.08, "sine", 0.05);
  },
  tap() {
    tone(400, 0, 0.05, "sine", 0.03);
  },
  complete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.4, "sine", 0.06));
  },
};
