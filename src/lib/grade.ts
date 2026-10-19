/**
 * Forgiving answer checking.
 *
 * correct — exact match (ignoring case, punctuation, spacing, optional parts)
 * accent  — right word, missing/wrong accents or ñ/ł  → accepted, flagged
 * typo    — small keyboard slip (adjacent key, swapped letters…) → accepted, flagged
 * wrong   — not accepted
 */

export type Verdict = "correct" | "accent" | "typo" | "wrong";
export type Strictness = "lenient" | "normal" | "strict";

export interface DiffSegment {
  text: string;
  ok: boolean;
}

export interface GradeResult {
  verdict: Verdict;
  accepted: boolean;
  /** The canonical answer to display. */
  expected: string;
  /** The specific variant the input was closest to. */
  matched: string;
  /** `matched` split into segments, with the letters the user got wrong marked. */
  diff: DiffSegment[];
  /** The user omitted a leading article that is part of the answer. */
  missingArticle?: boolean;
}

const ARTICLES = ["el", "la", "los", "las", "un", "una", "unos", "unas", "lo"];

export function normalize(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[¿¡.,!?;:"«»“”…()[\]{}]/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");
}

/** Expand "chico/a" → chico, chica and "el/la" → el, la within a single phrase. */
function expandSlashes(phrase: string): string[] {
  const tokens = phrase.split(" ");
  let variants = [""];
  for (const tok of tokens) {
    let options: string[];
    if (tok.includes("/") && !/^\/|\/$/.test(tok)) {
      const [first, ...rest] = tok.split("/");
      options = [first];
      for (const r of rest) {
        // gender suffix notation: alto/a → alta, profesor/a → profesora
        if (r.length <= 2 && first.length > 3) {
          options.push(/[oe]$/.test(first) && r.length === 1 ? first.slice(0, -1) + r : first + r);
        } else {
          options.push(r);
        }
      }
    } else {
      options = [tok];
    }
    const next: string[] = [];
    for (const v of variants) for (const o of options) next.push(v ? `${v} ${o}` : o);
    variants = next.slice(0, 32);
  }
  return variants;
}

/** "(się) uczyć" → ["się uczyć", "uczyć"] */
function expandParens(phrase: string): string[] {
  if (!/\(.*?\)/.test(phrase)) return [phrase];
  const withContent = phrase.replace(/[()]/g, "");
  const without = phrase.replace(/\s*\(.*?\)\s*/g, " ");
  return [withContent, without];
}

/** All accepted surface forms for one expected answer string. */
export function answerVariants(expected: string, alts: string[] = []): string[] {
  const out = new Set<string>();
  for (const source of [expected, ...alts]) {
    // whole string and each alternative separated by , ; or " / "
    const pieces = [source, ...source.split(/\s*[;,]\s*|\s+\/\s+/)];
    for (const piece of pieces) {
      for (const p of expandParens(piece)) {
        for (const v of expandSlashes(normalize(p))) if (v) out.add(v);
      }
    }
  }
  return [...out];
}

// --- keyboard-aware edit distance -----------------------------------------

const ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const ROW_OFFSET = [0, 0.5, 0.75, 1.25];
const KEY_POS = new Map<string, [number, number]>();
ROWS.forEach((row, r) => [...row].forEach((ch, c) => KEY_POS.set(ch, [r, c + ROW_OFFSET[r]])));

function adjacent(a: string, b: string): boolean {
  const pa = KEY_POS.get(a);
  const pb = KEY_POS.get(b);
  if (!pa || !pb) return false;
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 1.3;
}

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  return adjacent(a, b) ? 0.5 : 1;
}

/** Optimal-string-alignment Damerau-Levenshtein with adjacent-key discount. */
export function editDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // a doubled/missing letter next to itself (helo / helllo) is a cheap slip
      const delCost = i > 1 && a[i - 1] === a[i - 2] ? 0.5 : 1;
      const insCost = j > 1 && b[j - 1] === b[j - 2] ? 0.5 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + delCost,
        d[i][j - 1] + insCost,
        d[i - 1][j - 1] + subCost(a[i - 1], b[j - 1]),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.5);
      }
    }
  }
  return d[n][m];
}

function typoBudget(len: number, strictness: Strictness): number {
  if (strictness === "strict") return 0;
  let base: number;
  if (len <= 3) base = 0.5;
  else if (len <= 5) base = 0.75;
  else if (len <= 8) base = 1;
  else if (len <= 12) base = 1.5;
  else base = Math.min(3, len * 0.12);
  return strictness === "lenient" ? base * 1.6 : base;
}

// --- diff for display -------------------------------------------------------

/** Mark which characters of `expected` the user got wrong (case/accent-insensitive alignment). */
export function diffAgainst(input: string, expected: string): DiffSegment[] {
  const a = [...stripAccents(input.toLowerCase())];
  const bRaw = [...expected];
  const b = bRaw.map((c) => stripAccents(c.toLowerCase()));
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));

  const marks: boolean[] = new Array(m).fill(false);
  let i = n;
  let j = m;
  while (j > 0) {
    if (i > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      // exact char match also requires the accent to match
      marks[j - 1] = a[i - 1] === b[j - 1] && input.toLowerCase()[i - 1] === bRaw[j - 1].toLowerCase();
      i--;
      j--;
    } else if (d[i][j] === d[i][j - 1] + 1) {
      marks[j - 1] = false;
      j--;
    } else {
      i--;
    }
  }
  // punctuation & spaces are never "wrong"
  bRaw.forEach((c, k) => {
    if (/[\s¿¡.,!?;:'"()/-]/.test(c)) marks[k] = true;
  });

  const segs: DiffSegment[] = [];
  bRaw.forEach((c, k) => {
    const last = segs[segs.length - 1];
    if (last && last.ok === marks[k]) last.text += c;
    else segs.push({ text: c, ok: marks[k] });
  });
  return segs;
}

// --- main entry -------------------------------------------------------------

const RANK: Record<Verdict, number> = { correct: 0, accent: 1, typo: 2, wrong: 3 };

export function grade(
  input: string,
  expected: string,
  opts: { alts?: string[]; strictness?: Strictness; lang?: "es" | "pl" } = {},
): GradeResult {
  const strictness = opts.strictness ?? "normal";
  const user = normalize(input);
  const variants = answerVariants(expected, opts.alts);

  // Spanish: allow omitting the article ("perro" for "el perro"), but remember it.
  const articleless = new Map<string, string>();
  if (opts.lang !== "pl") {
    for (const v of variants) {
      const m = v.match(/^(\S+) (.+)$/);
      if (m && ARTICLES.includes(m[1])) articleless.set(m[2], v);
    }
  }

  let best: { verdict: Verdict; dist: number; variant: string; missingArticle: boolean } = {
    verdict: "wrong",
    dist: Infinity,
    variant: variants[0] ?? normalize(expected),
    missingArticle: false,
  };

  const consider = (variant: string, missingArticle: boolean) => {
    let verdict: Verdict;
    let dist = 0;
    if (user === variant) verdict = "correct";
    else if (stripAccents(user) === stripAccents(variant)) verdict = "accent";
    else {
      dist = editDistance(stripAccents(user), stripAccents(variant));
      verdict = dist <= typoBudget(variant.length, strictness) ? "typo" : "wrong";
    }
    const better =
      RANK[verdict] < RANK[best.verdict] ||
      (RANK[verdict] === RANK[best.verdict] && dist < best.dist) ||
      (RANK[verdict] === RANK[best.verdict] && dist === best.dist && best.missingArticle && !missingArticle);
    if (better) best = { verdict, dist, variant, missingArticle };
  };

  if (user) {
    for (const v of variants) consider(v, false);
    for (const [bare, full] of articleless) {
      const before = best;
      consider(bare, true);
      if (best !== before) best = { ...best, variant: full };
    }
  }

  const matched = best.verdict === "wrong" ? expected : best.variant;
  return {
    verdict: best.verdict,
    accepted: best.verdict !== "wrong",
    expected,
    matched,
    diff: user ? diffAgainst(user, matched) : [{ text: expected, ok: false }],
    missingArticle: best.missingArticle && best.verdict !== "wrong",
  };
}
