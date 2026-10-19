"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { burst, celebrate } from "@/lib/confetti";
import { normalize, type Verdict } from "@/lib/grade";
import { spring } from "@/lib/motion";
import {
  cardKey,
  getProgress,
  recordActivity,
  recordReview,
  setLearnLevel,
  useSettings,
} from "@/lib/progress";
import { buildItems, makeItem, shuffle, type Item } from "@/lib/session";
import { sfx } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { isDue } from "@/lib/srs";
import { answerLang, LANG_FLAG, LANG_LABEL, promptLang, type Direction, type StudySet } from "@/lib/types";
import { Button, IconButton } from "../ui/Button";
import { ProgressRing } from "../ui/controls";
import { IconCheck, IconSpeaker } from "../ui/icons";
import { ChoiceQuestion } from "./ChoiceQuestion";
import { ClientOnly, fitText, ResultScreen, StudyStage, StudyTopBar, useKeys } from "./StudyChrome";
import { TypedQuestion, type Outcome } from "./TypedQuestion";

export type Mode = "learn" | "write" | "review";

type Level = 0 | 1 | 2;

const MODE_TITLE: Record<Mode, string> = { learn: "Learn", write: "Write", review: "Review" };

export function StudySession({
  mode,
  sets,
  backHref,
  title,
}: {
  mode: Mode;
  sets: StudySet[];
  backHref: string;
  title?: string;
}) {
  const s = useSettings();
  const [run, setRun] = useState<{ n: number; onlyKeys?: string[] }>({ n: 0 });
  return (
    <ClientOnly>
      <Session
        key={`${s.direction}|${s.shuffle}|${s.starredOnly}|${s.learnWithChoices}|${s.roundSize}|${run.n}`}
        mode={mode}
        sets={sets}
        backHref={backHref}
        title={title ?? MODE_TITLE[mode]}
        onlyKeys={run.onlyKeys}
        restart={(onlyKeys) => setRun((r) => ({ n: r.n + 1, onlyKeys }))}
      />
    </ClientOnly>
  );
}

function buildPool(mode: Mode, sets: StudySet[], onlyKeys?: string[]): Item[] {
  const { settings, stars, cards } = getProgress();
  if (mode === "review") {
    const now = Date.now();
    const due: Item[] = [];
    for (const set of sets) {
      for (const c of set.cards) {
        for (const d of ["es-pl", "pl-es"] as Direction[]) {
          const k = cardKey(set.slug, c.id, d);
          if (onlyKeys ? onlyKeys.includes(k) : isDue(cards[k], now)) due.push(makeItem(set.slug, c, d));
        }
      }
    }
    // never ask both directions of the same card in one sitting
    const seen = new Set<string>();
    const unique = due
      .sort((a, b) => (cards[a.key]?.due ?? 0) - (cards[b.key]?.due ?? 0))
      .filter((i) => {
        const id = `${i.slug}:${i.card.id}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    return settings.shuffle ? shuffle(unique) : unique;
  }
  const set = sets[0];
  if (onlyKeys) {
    const ids = [...new Set(onlyKeys.map((k) => k.split(":")[1]))];
    return buildItems(set, settings, stars, { onlyIds: ids });
  }
  return buildItems(set, settings, stars);
}

interface RoundLog {
  item: Item;
  firstTry: boolean;
  level: Level;
}

function Session({
  mode,
  sets,
  backHref,
  title,
  onlyKeys,
  restart,
}: {
  mode: Mode;
  sets: StudySet[];
  backHref: string;
  title: string;
  onlyKeys?: string[];
  restart: (onlyKeys?: string[]) => void;
}) {
  const settings = useSettings();
  const [all] = useState<Item[]>(() => buildPool(mode, sets, onlyKeys));
  const [levels, setLevels] = useState<Record<string, Level>>(() => {
    const cards = getProgress().cards;
    return Object.fromEntries(all.map((i) => [i.key, mode === "learn" ? (cards[i.key]?.learn ?? 0) : 0]));
  });

  const remaining = (lv: Record<string, Level>) => all.filter((i) => lv[i.key] < 2);

  const takeRound = (lv: Record<string, Level>): Item[] => {
    if (mode !== "learn") return all;
    // in-progress words first so they finish, then new ones
    const rest = remaining(lv);
    const started = rest.filter((i) => lv[i.key] === 1);
    const fresh = rest.filter((i) => lv[i.key] === 0);
    return [...started, ...fresh].slice(0, settings.roundSize);
  };

  const [round, setRound] = useState(1);
  const [queue, setQueue] = useState<Item[]>(() => takeRound(levels));
  const [roundSize, setRoundSize] = useState(queue.length);
  const [phase, setPhase] = useState<"question" | "round" | "done">(() => (queue.length ? "question" : "done"));
  const [attempt, setAttempt] = useState(0);
  const [log, setLog] = useState<RoundLog[]>([]);
  // first-attempt bookkeeping: what was asked, what was missed
  const [tally, setTally] = useState<{ asked: string[]; missed: string[] }>({ asked: [], missed: [] });

  const current = queue[0];

  const kind: "mc" | "type" =
    mode === "learn" && current && levels[current.key] === 0 && settings.learnWithChoices ? "mc" : "type";

  const options = useMemo(() => {
    if (!current || kind !== "mc") return [];
    const lang = answerLang(current.dir);
    const answer = current.card[lang];
    const set = sets.find((s) => s.slug === current.slug)!;
    const seen = new Set([normalize(answer)]);
    const distractors: string[] = [];
    for (const c of shuffle(set.cards)) {
      const t = c[lang];
      if (seen.has(normalize(t))) continue;
      seen.add(normalize(t));
      distractors.push(t);
      if (distractors.length === 3) break;
    }
    return shuffle([answer, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, kind, attempt]);

  const onOutcome = (o: Outcome) => {
    const item = current;
    if (!item) return;
    const first = !tally.asked.includes(item.key);

    // Spaced repetition only learns from typed recall; recognition just counts as activity.
    if (first && kind === "type") {
      recordReview(item.slug, item.card.id, item.dir, ratingFor(o.verdict, o.accepted));
    } else {
      recordActivity();
    }
    if (first) {
      setTally((t) => ({
        asked: [...t.asked, item.key],
        missed: o.accepted ? t.missed : [...t.missed, item.key],
      }));
    }

    let nextLevels = levels;
    let nextQueue = queue.slice(1);
    if (o.accepted) {
      if (mode === "learn") {
        const lv: Level = kind === "mc" ? 1 : 2;
        nextLevels = { ...levels, [item.key]: lv };
        setLevels(nextLevels);
        setLearnLevel(item.slug, item.card.id, item.dir, lv);
      }
      setLog((l) => [...l.filter((e) => e.item.key !== item.key), { item, firstTry: first, level: nextLevels[item.key] }]);
    } else {
      // Ask again a little later in this round.
      const at = Math.min(nextQueue.length, 2 + Math.floor(Math.random() * 2));
      nextQueue = [...nextQueue.slice(0, at), item, ...nextQueue.slice(at)];
    }

    if (nextQueue.length > 0) {
      setQueue(nextQueue);
      setAttempt((a) => a + 1);
      return;
    }

    // round over
    if (mode === "learn" && remaining(nextLevels).length > 0) {
      setPhase("round");
      sfx.complete();
      burst();
    } else {
      setPhase("done");
      sfx.complete();
      celebrate();
    }
    setQueue([]);
  };

  const nextRound = () => {
    const q = takeRound(levels);
    setQueue(q);
    setRoundSize(q.length);
    setLog([]);
    setRound((r) => r + 1);
    setAttempt((a) => a + 1);
    setPhase("question");
  };

  useKeys(
    (e) => {
      if (phase === "round" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        nextRound();
      }
    },
    [phase, levels],
  );

  // progress
  const progress =
    mode === "learn"
      ? all.reduce((n, i) => n + levels[i.key], 0) / Math.max(1, all.length * 2)
      : (all.length - queue.length) / Math.max(1, all.length);

  const learnedCount = all.filter((i) => levels[i.key] === 2).length;

  const topTitle =
    mode === "learn" ? (
      <span>
        {title} <span className="text-ink-3">· Round {round}</span>
      </span>
    ) : (
      <span>
        {title}
        {phase === "question" && (
          <span className="text-ink-3">
            {" "}
            · <span className="tabular-nums">{queue.length}</span> left
          </span>
        )}
      </span>
    );

  if (all.length === 0) {
    return (
      <>
        <StudyTopBar backHref={backHref} title={title} />
        <StudyStage>
          <ResultScreen
            emoji={mode === "review" ? "🌿" : "🫥"}
            title={mode === "review" ? "Nothing to review" : "No cards"}
            subtitle={
              mode === "review"
                ? "Every word is scheduled for later. Learn something new in the meantime."
                : "Turn off “Starred only” to study the whole set."
            }
            actions={
              <Link href={mode === "review" ? "/" : backHref}>
                <Button variant="primary" size="lg">
                  {mode === "review" ? "Back home" : "Back to set"}
                </Button>
              </Link>
            }
          />
        </StudyStage>
      </>
    );
  }

  return (
    <>
      <StudyTopBar backHref={backHref} title={topTitle} progress={progress} />
      <StudyStage>
        <AnimatePresence mode="wait">
          {phase === "question" && current && (
            <motion.div
              key={`${current.key}-${attempt}`}
              initial={{ opacity: 0, x: 40, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -40, filter: "blur(6px)", transition: { duration: 0.18 } }}
              transition={spring.gentle}
            >
              {mode === "learn" && (
                <RoundDots size={roundSize} done={roundSize - new Set(queue.map((q) => q.key)).size} />
              )}
              <Prompt item={current} kind={kind} level={levels[current.key]} mode={mode} autoSpeak={settings.autoSpeak} />
              <div className="mt-6">
                {kind === "mc" ? (
                  <ChoiceQuestion item={current} options={options} autoSpeak={settings.autoSpeak} onDone={onOutcome} />
                ) : (
                  <TypedQuestion
                    item={current}
                    strictness={settings.strictness}
                    retype={settings.retypeMistakes}
                    autoSpeak={settings.autoSpeak}
                    onDone={onOutcome}
                  />
                )}
              </div>
            </motion.div>
          )}

          {phase === "round" && (
            <motion.div key={`round-${round}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring.gentle}>
              <ResultScreen
                emoji={pick(["🔥", "💪", "✨", "🚀", "⚡️"])}
                title={`Round ${round} done`}
                subtitle={`${learnedCount} of ${all.length} words learned. Keep the momentum going.`}
                actions={
                  <Button variant="primary" size="lg" onClick={nextRound} className="sm:min-w-56">
                    Continue
                  </Button>
                }
              >
                <div className="flex flex-col items-center gap-6">
                  <ProgressRing value={progress} size={128} stroke={11}>
                    <span className="font-display text-3xl font-bold tabular-nums">{Math.round(progress * 100)}%</span>
                  </ProgressRing>
                  <RoundList log={log} />
                </div>
              </ResultScreen>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.gentle}>
              <DoneScreen
                mode={mode}
                total={all.length}
                firstCorrect={tally.asked.length - tally.missed.length}
                missed={all.filter((i) => tally.missed.includes(i.key))}
                backHref={backHref}
                slug={sets[0]?.slug}
                restart={restart}
                resetLearn={() => {
                  for (const i of all) setLearnLevel(i.slug, i.card.id, i.dir, 0);
                  restart();
                }}
                alreadyDone={tally.asked.length === 0}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </StudyStage>
    </>
  );
}

function ratingFor(v: Verdict, accepted: boolean) {
  if (!accepted) return "again" as const;
  if (v === "typo") return "hard" as const;
  return "good" as const;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function RoundDots({ size, done }: { size: number; done: number }) {
  return (
    <div className="mb-5 flex justify-center gap-1.5">
      {Array.from({ length: size }, (_, i) => (
        <motion.span
          key={i}
          className="h-1.5 rounded-full"
          initial={false}
          animate={{ width: i === done ? 22 : 8, backgroundColor: i < done ? "var(--green)" : i === done ? "var(--purple)" : "var(--line-strong)" }}
          transition={spring.snappy}
        />
      ))}
    </div>
  );
}

function Prompt({
  item,
  kind,
  level,
  mode,
  autoSpeak,
}: {
  item: Item;
  kind: "mc" | "type";
  level: Level;
  mode: Mode;
  autoSpeak: boolean;
}) {
  const pl = promptLang(item.dir);
  const al = answerLang(item.dir);
  const text = item.card[pl];
  const hint = item.card.hint?.[pl];

  useEffect(() => {
    if (autoSpeak && pl === "es") speak(text, "es");
  }, [autoSpeak, pl, text]);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-6 pb-10 pt-5 shadow-lift">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple/10 to-transparent" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
          {LANG_FLAG[pl]} {LANG_LABEL[pl]} → {LANG_FLAG[al]} {LANG_LABEL[al]}
        </span>
        <div className="flex items-center gap-1">
          {mode === "learn" && level === 0 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.bouncy}
              className="rounded-full bg-blue/12 px-2.5 py-1 text-xs font-semibold text-blue"
            >
              New word
            </motion.span>
          )}
          {mode === "learn" && level === 1 && kind === "type" && (
            <span className="rounded-full bg-purple/12 px-2.5 py-1 text-xs font-semibold text-purple">Now type it</span>
          )}
          {pl === "es" && (
            <IconButton label="Pronounce" onClick={() => speak(text, "es")}>
              <IconSpeaker size={19} />
            </IconButton>
          )}
        </div>
      </div>
      <div className="relative mt-8 text-center">
        <div className={`font-display font-bold leading-tight tracking-[-0.025em] ${fitText(text)}`}>{text}</div>
        {hint && <div className="mt-3 text-[15px] font-medium text-ink-3">({hint})</div>}
      </div>
    </div>
  );
}

function RoundList({ log }: { log: RoundLog[] }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-card border border-line bg-surface text-left shadow-card">
      {log.map((e, i) => (
        <motion.div
          key={e.item.key}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring.gentle, delay: 0.2 + i * 0.04 }}
          className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0">
            <div className="truncate font-semibold">{e.item.card.es}</div>
            <div className="truncate text-sm text-ink-3">{e.item.card.pl}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {[1, 2].map((n) => (
              <span
                key={n}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  e.level >= n ? (n === 2 ? "bg-green text-white" : "bg-purple text-white") : "bg-surface-2 text-transparent"
                }`}
              >
                <IconCheck size={13} strokeWidth={3} />
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function DoneScreen({
  mode,
  total,
  firstCorrect,
  missed,
  backHref,
  slug,
  restart,
  resetLearn,
  alreadyDone,
}: {
  mode: Mode;
  total: number;
  firstCorrect: number;
  missed: Item[];
  backHref: string;
  slug?: string;
  restart: (onlyKeys?: string[]) => void;
  resetLearn: () => void;
  alreadyDone: boolean;
}) {
  if (mode === "learn") {
    return (
      <ResultScreen
        emoji="🎓"
        title={alreadyDone ? "Already learned" : "¡Lo lograste!"}
        subtitle={
          alreadyDone
            ? "You've learned every word in this set. Review keeps them fresh — or start over."
            : `You can now recall all ${total} words. They'll return in Review right before you'd forget them.`
        }
        actions={
          <>
            <Link href={`/sets/${slug}/write`}>
              <Button variant="primary" size="lg" className="w-full">
                Test yourself in Write
              </Button>
            </Link>
            <Button size="lg" onClick={resetLearn}>
              Learn again
            </Button>
            <Link href={backHref}>
              <Button size="lg" variant="ghost" className="w-full">
                Back to set
              </Button>
            </Link>
          </>
        }
      />
    );
  }

  const pct = total ? firstCorrect / total : 0;
  return (
    <ResultScreen
      emoji={pct === 1 ? "🏆" : pct >= 0.8 ? "🎉" : pct >= 0.5 ? "💪" : "🌱"}
      title={pct === 1 ? "Flawless!" : pct >= 0.8 ? "Great job!" : pct >= 0.5 ? "Good progress" : "Keep going"}
      subtitle={`${firstCorrect} of ${total} right on the first try.`}
      actions={
        <>
          {missed.length > 0 && (
            <Button variant="primary" size="lg" onClick={() => restart(missed.map((m) => m.key))}>
              Practice {missed.length} missed
            </Button>
          )}
          {mode === "write" && (
            <Button size="lg" onClick={() => restart()}>
              Start over
            </Button>
          )}
          <Link href={mode === "review" ? "/" : backHref}>
            <Button size="lg" variant={missed.length ? "ghost" : "primary"} className="w-full">
              {mode === "review" ? "Back home" : "Back to set"}
            </Button>
          </Link>
        </>
      }
    >
      <div className="flex flex-col items-center gap-6">
        <ProgressRing value={pct} size={128} stroke={11}>
          <span className="font-display text-3xl font-bold tabular-nums">{Math.round(pct * 100)}%</span>
        </ProgressRing>
        {missed.length > 0 && (
          <div className="w-full max-w-md overflow-hidden rounded-card border border-line bg-surface text-left shadow-card">
            <div className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-3">To practice</div>
            {missed.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className="font-semibold">{m.card.es}</span>
                <span className="text-right text-ink-2">{m.card.pl}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResultScreen>
  );
}
