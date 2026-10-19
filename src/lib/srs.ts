/**
 * Spaced repetition (SM-2 flavoured, with short learning steps).
 * One CardState per card *per direction* — recognising a word and producing it
 * are different skills.
 */

export type Rating = "again" | "hard" | "good" | "easy";

export interface CardState {
  reps: number; // successful reviews in a row
  lapses: number;
  ease: number;
  interval: number; // days
  due: number; // epoch ms
  last: number; // epoch ms
  /** Learn-mode ladder: 0 new → 1 recognised (multiple choice) → 2 produced (typed). */
  learn: 0 | 1 | 2;
}

const MIN = 60_000;
const DAY = 86_400_000;

export function newState(): CardState {
  return { reps: 0, lapses: 0, ease: 2.5, interval: 0, due: 0, last: 0, learn: 0 };
}

export function schedule(prev: CardState | undefined, rating: Rating, now = Date.now()): CardState {
  const s = { ...(prev ?? newState()) };
  s.last = now;

  if (rating === "again") {
    s.lapses += s.reps > 0 ? 1 : 0;
    s.reps = 0;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + MIN;
    return s;
  }

  if (rating === "hard") s.ease = Math.max(1.3, s.ease - 0.15);
  if (rating === "easy") s.ease = Math.min(3.2, s.ease + 0.15);

  if (s.reps === 0) {
    s.interval = rating === "easy" ? 2 : rating === "good" ? 1 : 0;
  } else if (s.reps === 1) {
    s.interval = rating === "easy" ? 4 : rating === "good" ? 3 : 1;
  } else {
    const mult = rating === "hard" ? 1.2 : rating === "easy" ? s.ease * 1.3 : s.ease;
    s.interval = Math.max(s.interval + 1, Math.round(s.interval * mult));
  }
  s.reps += 1;
  s.due = s.interval === 0 ? now + 10 * MIN : now + s.interval * DAY;
  return s;
}

export type Mastery = "new" | "learning" | "familiar" | "mastered";

export function masteryOf(s: CardState | undefined): Mastery {
  if (!s || (s.last === 0 && s.learn === 0)) return "new";
  if (s.interval >= 7 || (s.learn === 2 && s.reps >= 2)) return "mastered";
  if (s.reps >= 1 || s.learn >= 1) return s.learn === 2 || s.interval >= 1 ? "familiar" : "learning";
  return "learning";
}

export const MASTERY_RANK: Record<Mastery, number> = { new: 0, learning: 1, familiar: 2, mastered: 3 };

export function isDue(s: CardState | undefined, now = Date.now()): boolean {
  return !!s && s.last > 0 && s.due <= now;
}

export function formatInterval(s: CardState, now = Date.now()): string {
  const ms = s.due - now;
  if (ms <= 0) return "now";
  if (ms < 60 * MIN) return `${Math.round(ms / MIN)} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))} h`;
  const d = Math.round(ms / DAY);
  return d === 1 ? "1 day" : `${d} days`;
}
