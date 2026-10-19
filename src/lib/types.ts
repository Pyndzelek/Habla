export type Lang = "es" | "pl";

export type Accent = "blue" | "purple" | "green";

export interface Card {
  /** Stable id — never change it once published, progress is keyed by it. */
  id: string;
  es: string;
  pl: string;
  /** Additional accepted answers per language. */
  alt?: Partial<Record<Lang, string[]>>;
  /** Disambiguation shown under the prompt, per prompt language (e.g. być → "stan, położenie"). */
  hint?: Partial<Record<Lang, string>>;
  /** Short hint shown after answering (grammar, register, gender…). */
  note?: string;
  example?: { es: string; pl: string };
}

export interface StudySet {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  accent: Accent;
  unit?: string;
  cards: Card[];
}

export type SetSummary = Omit<StudySet, "cards"> & {
  cardCount: number;
  cardIds: string[];
};

/** Which side is shown as the prompt. "es-pl": Spanish prompt, answer in Polish. */
export type Direction = "es-pl" | "pl-es";
export type DirectionSetting = Direction | "mixed";

export const LANG_LABEL: Record<Lang, string> = { es: "Spanish", pl: "Polish" };
export const LANG_FLAG: Record<Lang, string> = { es: "🇪🇸", pl: "🇵🇱" };

export function promptLang(d: Direction): Lang {
  return d === "es-pl" ? "es" : "pl";
}
export function answerLang(d: Direction): Lang {
  return d === "es-pl" ? "pl" : "es";
}
