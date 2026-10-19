import type { ProgressState, Settings } from "./progress";
import { cardKey, starKey } from "./progress";
import type { Card, Direction, StudySet } from "./types";

export interface Item {
  slug: string;
  card: Card;
  dir: Direction;
  key: string;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickDirection(setting: Settings["direction"]): Direction {
  if (setting === "mixed") return Math.random() < 0.5 ? "es-pl" : "pl-es";
  return setting;
}

export function makeItem(slug: string, card: Card, dir: Direction): Item {
  return { slug, card, dir, key: cardKey(slug, card.id, dir) };
}

/** Cards of a set, filtered/ordered according to the user's settings. */
export function buildItems(
  set: Pick<StudySet, "slug" | "cards">,
  settings: Settings,
  stars: ProgressState["stars"],
  opts: { onlyIds?: string[]; ignoreStarFilter?: boolean } = {},
): Item[] {
  let cards = set.cards;
  if (opts.onlyIds) {
    const ids = new Set(opts.onlyIds);
    cards = cards.filter((c) => ids.has(c.id));
  } else if (settings.starredOnly && !opts.ignoreStarFilter) {
    const starred = cards.filter((c) => stars[starKey(set.slug, c.id)]);
    if (starred.length > 0) cards = starred;
  }
  const items = cards.map((c) => makeItem(set.slug, c, pickDirection(settings.direction)));
  return settings.shuffle ? shuffle(items) : items;
}

export function countStarred(set: Pick<StudySet, "slug" | "cards">, stars: ProgressState["stars"]): number {
  return set.cards.filter((c) => stars[starKey(set.slug, c.id)]).length;
}
