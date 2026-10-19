import fs from "node:fs";
import path from "node:path";
import type { Card, SetSummary, StudySet } from "./types";

const SETS_DIR = path.join(process.cwd(), "content", "sets");
const ACCENTS = ["blue", "purple", "green"];

function fail(file: string, msg: string): never {
  throw new Error(`[content/sets/${file}] ${msg}`);
}

function validate(file: string, raw: unknown): StudySet {
  const s = raw as StudySet;
  if (!s || typeof s !== "object") fail(file, "not an object");
  for (const key of ["slug", "title", "description", "emoji"] as const) {
    if (typeof s[key] !== "string" || !s[key]) fail(file, `missing "${key}"`);
  }
  if (!/^[a-z0-9-]+$/.test(s.slug)) fail(file, `invalid slug "${s.slug}"`);
  if (!ACCENTS.includes(s.accent)) fail(file, `accent must be one of ${ACCENTS.join(", ")}`);
  if (!Array.isArray(s.cards) || s.cards.length === 0) fail(file, "cards must be a non-empty array");
  const ids = new Set<string>();
  s.cards.forEach((c: Card, i) => {
    if (!c.id || typeof c.id !== "string") fail(file, `card #${i} has no id`);
    if (ids.has(c.id)) fail(file, `duplicate card id "${c.id}"`);
    ids.add(c.id);
    if (!c.es || !c.pl) fail(file, `card "${c.id}" needs both "es" and "pl"`);
  });
  return s;
}

let cache: StudySet[] | null = null;

export function getAllSets(): StudySet[] {
  if (cache) return cache;
  const files = fs.readdirSync(SETS_DIR).filter((f) => f.endsWith(".json")).sort();
  const sets = files.map((f) => validate(f, JSON.parse(fs.readFileSync(path.join(SETS_DIR, f), "utf8"))));
  const slugs = new Set<string>();
  for (const s of sets) {
    if (slugs.has(s.slug)) throw new Error(`Duplicate set slug "${s.slug}"`);
    slugs.add(s.slug);
  }
  cache = sets;
  return sets;
}

export function getSet(slug: string): StudySet | undefined {
  return getAllSets().find((s) => s.slug === slug);
}

export function summarize(s: StudySet): SetSummary {
  const { cards, ...rest } = s;
  return { ...rest, cardCount: cards.length, cardIds: cards.map((c) => c.id) };
}
