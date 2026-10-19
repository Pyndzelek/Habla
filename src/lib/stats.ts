import { cardKey, type ProgressState } from "./progress";
import { isDue, MASTERY_RANK, masteryOf, type Mastery } from "./srs";
import type { Direction } from "./types";

const DIRS: Direction[] = ["es-pl", "pl-es"];

/** A card's mastery is the best of its two directions. */
export function cardMastery(cards: ProgressState["cards"], slug: string, cardId: string): Mastery {
  let best: Mastery = "new";
  for (const d of DIRS) {
    const m = masteryOf(cards[cardKey(slug, cardId, d)]);
    if (MASTERY_RANK[m] > MASTERY_RANK[best]) best = m;
  }
  return best;
}

export interface SetStats {
  total: number;
  new: number;
  learning: number;
  familiar: number;
  mastered: number;
  due: number;
}

export function emptyStats(total: number): SetStats {
  return { total, new: total, learning: 0, familiar: 0, mastered: 0, due: 0 };
}

export function setStats(cards: ProgressState["cards"], slug: string, ids: string[], now = Date.now()): SetStats {
  const s: SetStats = { total: ids.length, new: 0, learning: 0, familiar: 0, mastered: 0, due: 0 };
  for (const id of ids) {
    s[cardMastery(cards, slug, id)]++;
    if (DIRS.some((d) => isDue(cards[cardKey(slug, id, d)], now))) s.due++;
  }
  return s;
}

export const MASTERY_COLOR: Record<Mastery, string> = {
  new: "var(--line-strong)",
  learning: "var(--blue)",
  familiar: "var(--purple)",
  mastered: "var(--green)",
};

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: "New",
  learning: "Learning",
  familiar: "Familiar",
  mastered: "Mastered",
};
