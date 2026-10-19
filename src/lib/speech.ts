"use client";

import type { Lang } from "./types";

const LOCALE: Record<Lang, string> = { es: "es-ES", pl: "pl-PL" };
// Higher-quality voices first when the OS has them.
const PREFERRED: Record<Lang, string[]> = {
  es: ["Mónica", "Monica", "Google español", "Paulina", "Jorge", "Marisol"],
  pl: ["Zosia", "Google polski", "Ewa"],
};

let voices: SpeechSynthesisVoice[] = [];

function refresh() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
}

function voiceFor(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) refresh();
  const prefix = LOCALE[lang].slice(0, 2);
  const candidates = voices.filter((v) => v.lang.replace("_", "-").startsWith(prefix));
  for (const name of PREFERRED[lang]) {
    const v = candidates.find((c) => c.name.includes(name));
    if (v) return v;
  }
  return candidates.find((c) => c.lang.replace("_", "-") === LOCALE[lang]) ?? candidates[0];
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, lang: Lang = "es", rate = 0.92) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  // "el/la estudiante" → read naturally
  const clean = text.replace(/\//g, ", ").replace(/[()]/g, "");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = LOCALE[lang];
  const v = voiceFor(lang);
  if (v) u.voice = v;
  u.rate = rate;
  synth.speak(u);
}
