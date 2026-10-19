"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { celebrate } from "@/lib/confetti";
import { spring } from "@/lib/motion";
import { getProgress, recordActivity, recordMatchTime, starKey } from "@/lib/progress";
import { shuffle } from "@/lib/session";
import { sfx } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import type { Lang, StudySet } from "@/lib/types";
import { Button } from "../ui/Button";
import { IconTimer } from "../ui/icons";
import { ClientOnly, ResultScreen, StudyStage, StudyTopBar } from "./StudyChrome";

const PAIRS = 6;
const PENALTY_MS = 1000;

const clock = () => performance.now();

interface Tile {
  uid: string;
  cardId: string;
  lang: Lang;
  text: string;
}

function deal(set: StudySet): Tile[] {
  const { settings, stars } = getProgress();
  let cards = set.cards;
  if (settings.starredOnly) {
    const starred = cards.filter((c) => stars[starKey(set.slug, c.id)]);
    if (starred.length >= 3) cards = starred;
  }
  // avoid two cards with the same text on one board (e.g. ser/estar → być)
  const usedEs = new Set<string>();
  const usedPl = new Set<string>();
  const picked = shuffle(cards).filter((c) => {
    if (usedEs.has(c.es) || usedPl.has(c.pl)) return false;
    usedEs.add(c.es);
    usedPl.add(c.pl);
    return true;
  }).slice(0, PAIRS);
  return shuffle(
    picked.flatMap((c) => [
      { uid: `${c.id}-es`, cardId: c.id, lang: "es" as const, text: c.es },
      { uid: `${c.id}-pl`, cardId: c.id, lang: "pl" as const, text: c.pl },
    ]),
  );
}

export function MatchGame({ set }: { set: StudySet }) {
  const [game, setGame] = useState(0);
  return (
    <ClientOnly>
      <Board key={game} set={set} onAgain={() => setGame((g) => g + 1)} />
    </ClientOnly>
  );
}

function fmt(ms: number) {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

function Board({ set, onAgain }: { set: StudySet; onAgain: () => void }) {
  const [tiles] = useState(() => deal(set));
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<{ ms: number; record: boolean; prevBest?: number } | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    if (startedAt === null || result) return;
    const tick = () => {
      setNow(clock());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [startedAt, result]);

  const elapsed = startedAt === null ? 0 : (result?.ms ?? Math.max(0, now - startedAt) + penalty);

  const tap = (t: Tile) => {
    if (matched.has(t.uid) || wrong.length) return;
    if (startedAt === null) {
      const t0 = clock();
      setStartedAt(t0);
      setNow(t0);
    }
    if (!selected) {
      setSelected(t.uid);
      sfx.tap();
      return;
    }
    if (selected === t.uid) {
      setSelected(null);
      return;
    }
    const a = tiles.find((x) => x.uid === selected)!;
    setSelected(null);
    if (a.cardId === t.cardId && a.lang !== t.lang) {
      const next = new Set(matched).add(a.uid).add(t.uid);
      setMatched(next);
      sfx.correct();
      recordActivity();
      speak(a.lang === "es" ? a.text : t.text, "es", 1);
      if (next.size === tiles.length) {
        const t1 = clock();
        const ms = t1 - (startedAt ?? t1) + penalty;
        const prevBest = getProgress().matchBest[set.slug];
        const record = recordMatchTime(set.slug, ms);
        setResult({ ms, record, prevBest });
        sfx.complete();
        if (record) celebrate();
      }
    } else {
      setWrong([a.uid, t.uid]);
      setPenalty((p) => p + PENALTY_MS);
      sfx.wrong();
      setTimeout(() => setWrong([]), 550);
    }
  };

  const best = getProgress().matchBest[set.slug];
  const backHref = `/sets/${set.slug}`;

  return (
    <>
      <StudyTopBar
        backHref={backHref}
        title="Match"
        progress={matched.size / Math.max(1, tiles.length)}
        right={
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold tabular-nums">
            <IconTimer size={15} className="text-purple" /> {fmt(elapsed)}
          </span>
        }
      />
      <StudyStage>
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.gentle}>
              <ResultScreen
                emoji={result.record ? "🏆" : "⚡️"}
                title={fmt(result.ms)}
                subtitle={
                  result.record
                    ? result.prevBest
                      ? `New record! ${fmt(result.prevBest - result.ms)} faster than before.`
                      : "Your first record. Now beat it."
                    : `Your best is ${fmt(best ?? result.ms)}. So close!`
                }
                actions={
                  <>
                    <Button variant="primary" size="lg" onClick={onAgain}>
                      Play again
                    </Button>
                    <Link href={backHref}>
                      <Button size="lg" className="w-full">
                        Back to set
                      </Button>
                    </Link>
                  </>
                }
              />
            </motion.div>
          ) : (
            <motion.div key="board" exit={{ opacity: 0, scale: 0.96 }}>
              <div className="mb-5 text-center text-[15px] text-ink-3">
                {startedAt === null ? (
                  <>Match each Spanish word with its Polish meaning. The clock starts on your first tap.</>
                ) : (
                  <>Wrong pairs add {PENALTY_MS / 1000}s.</>
                )}
                {best && startedAt === null && <span className="ml-1 font-semibold text-ink-2">Best: {fmt(best)}</span>}
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {tiles.map((t, i) => {
                  const isMatched = matched.has(t.uid);
                  const isSel = selected === t.uid;
                  const isWrong = wrong.includes(t.uid);
                  return (
                    <motion.button
                      key={t.uid}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={
                        isMatched
                          ? { opacity: 0, scale: 0.6, transition: { duration: 0.35, delay: 0.15 } }
                          : isWrong
                            ? { opacity: 1, scale: 1, y: 0, x: [0, -7, 6, -4, 0] }
                            : { opacity: 1, scale: isSel ? 1.05 : 1, y: isSel ? -3 : 0 }
                      }
                      transition={{ ...spring.snappy, delay: startedAt === null ? i * 0.025 : 0, x: { duration: 0.4 } }}
                      whileTap={isMatched ? undefined : { scale: 0.95 }}
                      onClick={() => tap(t)}
                      disabled={isMatched}
                      className={`flex aspect-[4/3] items-center justify-center rounded-[1.25rem] border-2 p-3 text-center text-[15px] font-semibold leading-tight shadow-card transition-colors sm:text-[17px] ${
                        isMatched
                          ? "border-green bg-green/15"
                          : isWrong
                            ? "border-red bg-red/10"
                            : isSel
                              ? "border-purple bg-purple/10"
                              : "border-line bg-surface hover:border-blue/40"
                      }`}
                    >
                      <span>
                        {t.text}
                        <span className="mt-1 block text-[11px] font-medium text-ink-3">{t.lang === "es" ? "🇪🇸" : "🇵🇱"}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </StudyStage>
    </>
  );
}
