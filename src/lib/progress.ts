"use client";

import { useSyncExternalStore } from "react";
import type { Strictness } from "./grade";
import { STORAGE_KEY } from "./theme-script";
import { newState, schedule, type CardState, type Rating } from "./srs";
import type { Direction, DirectionSetting } from "./types";

export type Theme = "light" | "dark" | "system";

export interface Settings {
  theme: Theme;
  direction: DirectionSetting;
  shuffle: boolean;
  starredOnly: boolean;
  strictness: Strictness;
  autoSpeak: boolean;
  sounds: boolean;
  dailyGoal: number;
  /** Learn mode: start new words with multiple choice before typing. */
  learnWithChoices: boolean;
  /** After a wrong typed answer, copy the correct one before moving on. */
  retypeMistakes: boolean;
  roundSize: number;
}

export interface ProgressState {
  version: 1;
  cards: Record<string, CardState>;
  stars: Record<string, true>;
  /** "YYYY-MM-DD" → answers given that day */
  daily: Record<string, number>;
  matchBest: Record<string, number>;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  direction: "es-pl",
  shuffle: true,
  starredOnly: false,
  strictness: "normal",
  autoSpeak: true,
  sounds: true,
  dailyGoal: 40,
  learnWithChoices: true,
  retypeMistakes: true,
  roundSize: 7,
};

const KEY = STORAGE_KEY;

function empty(): ProgressState {
  return { version: 1, cards: {}, stars: {}, daily: {}, matchBest: {}, settings: { ...DEFAULT_SETTINGS } };
}

const SERVER_SNAPSHOT = empty();
let state: ProgressState | null = null;
const listeners = new Set<() => void>();

function load(): ProgressState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProgressState;
      state = { ...empty(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
      return state;
    }
  } catch {
    // corrupt or unavailable storage — start fresh
  }
  state = empty();
  return state;
}

function commit(next: ProgressState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full / private mode: keep in memory
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, load, () => SERVER_SNAPSHOT);
}

export function useSettings(): Settings {
  return useProgress().settings;
}

/** True once the client store has been read (avoids flashing "0 learned" before hydration). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function getProgress(): ProgressState {
  return load();
}

// --- keys --------------------------------------------------------------------

export const cardKey = (slug: string, cardId: string, dir: Direction) => `${slug}:${cardId}:${dir}`;
export const starKey = (slug: string, cardId: string) => `${slug}:${cardId}`;

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// --- mutations ---------------------------------------------------------------

export function updateSettings(patch: Partial<Settings>) {
  const s = load();
  commit({ ...s, settings: { ...s.settings, ...patch } });
}

export function toggleStar(slug: string, cardId: string) {
  const s = load();
  const k = starKey(slug, cardId);
  const stars = { ...s.stars };
  if (stars[k]) delete stars[k];
  else stars[k] = true;
  commit({ ...s, stars });
}

/** Record an answer: updates spaced-repetition schedule and today's activity. */
export function recordReview(slug: string, cardId: string, dir: Direction, rating: Rating) {
  const s = load();
  const k = cardKey(slug, cardId, dir);
  const t = todayKey();
  commit({
    ...s,
    cards: { ...s.cards, [k]: schedule(s.cards[k], rating) },
    daily: { ...s.daily, [t]: (s.daily[t] ?? 0) + 1 },
  });
}

/** Bump only the activity counter (e.g. a repeat attempt inside a round). */
export function recordActivity() {
  const s = load();
  const t = todayKey();
  commit({ ...s, daily: { ...s.daily, [t]: (s.daily[t] ?? 0) + 1 } });
}

export function setLearnLevel(slug: string, cardId: string, dir: Direction, level: 0 | 1 | 2) {
  const s = load();
  const k = cardKey(slug, cardId, dir);
  const prev = s.cards[k] ?? newState();
  commit({ ...s, cards: { ...s.cards, [k]: { ...prev, learn: level } } });
}

export function resetSet(slug: string) {
  const s = load();
  const cards = Object.fromEntries(Object.entries(s.cards).filter(([k]) => !k.startsWith(`${slug}:`)));
  commit({ ...s, cards });
}

export function recordMatchTime(slug: string, ms: number): boolean {
  const s = load();
  const prev = s.matchBest[slug];
  if (prev && prev <= ms) return false;
  commit({ ...s, matchBest: { ...s.matchBest, [slug]: ms } });
  return true;
}

export function exportProgress(): string {
  return JSON.stringify(load(), null, 2);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json) as ProgressState;
  if (parsed?.version !== 1 || typeof parsed.cards !== "object") throw new Error("Not a Habla backup file");
  commit({ ...empty(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } });
}

export function resetAll() {
  commit({ ...empty(), settings: load().settings });
}

// --- derived -----------------------------------------------------------------

export function streak(daily: Record<string, number>, now = new Date()): number {
  let n = 0;
  const d = new Date(now);
  if (!daily[todayKey(d)]) d.setDate(d.getDate() - 1); // today not started yet doesn't break the streak
  while (daily[todayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Put a card's schedule back to an earlier snapshot (used by flashcard undo). */
export function restoreCardState(key: string, prev: CardState | undefined) {
  const s = load();
  const cards = { ...s.cards };
  if (prev) cards[key] = prev;
  else delete cards[key];
  const t = todayKey();
  commit({ ...s, cards, daily: { ...s.daily, [t]: Math.max(0, (s.daily[t] ?? 0) - 1) } });
}
