"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { celebrate } from "@/lib/confetti";
import { spring } from "@/lib/motion";
import {
  getProgress,
  recordReview,
  restoreCardState,
  starKey,
  toggleStar,
  updateSettings,
  useProgress,
  useSettings,
} from "@/lib/progress";
import { buildItems, type Item } from "@/lib/session";
import { sfx } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import type { CardState } from "@/lib/srs";
import { answerLang, LANG_FLAG, LANG_LABEL, promptLang, type StudySet } from "@/lib/types";
import { Button, IconButton } from "../ui/Button";
import { Kbd, ProgressRing } from "../ui/controls";
import { IconCheck, IconShuffle, IconSpeaker, IconStar, IconSwap, IconUndo, IconX } from "../ui/icons";
import { ClientOnly, fitText, ResultScreen, StudyStage, StudyTopBar, useKeys } from "./StudyChrome";

type Grade = "know" | "learning";

export function Flashcards({ set }: { set: StudySet }) {
  const s = useSettings();
  const [onlyIds, setOnlyIds] = useState<string[] | undefined>();
  const [run, setRun] = useState(0);
  return (
    <ClientOnly>
      <Deck
        key={`${s.direction}|${s.shuffle}|${s.starredOnly}|${run}`}
        set={set}
        onlyIds={onlyIds}
        onRestart={(ids) => {
          setOnlyIds(ids);
          setRun((r) => r + 1);
        }}
      />
    </ClientOnly>
  );
}

interface HistoryEntry {
  index: number;
  grade: Grade;
  key: string;
  prev: CardState | undefined;
}

function Deck({ set, onlyIds, onRestart }: { set: StudySet; onlyIds?: string[]; onRestart: (ids?: string[]) => void }) {
  const p = useProgress();
  const settings = p.settings;
  const [items] = useState<Item[]>(() => {
    const { settings, stars } = getProgress();
    return buildItems(set, settings, stars, { onlyIds });
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const done = index >= items.length;
  const item = items[index];
  const known = history.filter((h) => h.grade === "know");
  const learning = history.filter((h) => h.grade === "learning");

  // Pronounce the Spanish side when it becomes visible.
  useEffect(() => {
    if (!item || !settings.autoSpeak) return;
    const showingEs = (promptLang(item.dir) === "es") !== flipped;
    if (showingEs) speak(item.card.es, "es");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key, flipped]);

  const celebrated = useRef(false);
  useEffect(() => {
    if (done && items.length > 0 && !celebrated.current) {
      celebrated.current = true;
      sfx.complete();
      if (learning.length === 0) celebrate();
    }
  }, [done, items.length, learning.length]);

  const grade = (g: Grade) => {
    if (!item) return;
    const prev = getProgress().cards[item.key];
    recordReview(item.slug, item.card.id, item.dir, g === "know" ? "good" : "again");
    setHistory((h) => [...h, { index, grade: g, key: item.key, prev }]);
    setExitDir(g === "know" ? 1 : -1);
    if (g === "know") sfx.correct();
    else sfx.tap();
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    restoreCardState(last.key, last.prev);
    setHistory((h) => h.slice(0, -1));
    setExitDir(last.grade === "know" ? 1 : -1);
    setFlipped(false);
    setIndex(last.index);
    sfx.pop();
  };

  const flip = () => {
    setFlipped((f) => !f);
    sfx.flip();
  };

  useKeys(
    (e) => {
      if (done) return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") grade("know");
      else if (e.key === "ArrowLeft") grade("learning");
      else if (e.key === "Backspace" || e.key.toLowerCase() === "z") undo();
      else if (e.key.toLowerCase() === "s" && item) toggleStar(item.slug, item.card.id);
      else if (e.key.toLowerCase() === "p" && item) speak(item.card.es, "es");
    },
    [done, item, index, history, flipped],
  );

  const backHref = `/sets/${set.slug}`;

  if (items.length === 0) {
    return (
      <>
        <StudyTopBar backHref={backHref} title="Flashcards" />
        <StudyStage>
          <ResultScreen emoji="🫥" title="No cards" subtitle="Turn off “Starred only” to study the whole set." actions={<Link href={backHref}><Button>Back to set</Button></Link>} />
        </StudyStage>
      </>
    );
  }

  return (
    <>
      <StudyTopBar
        backHref={backHref}
        title={
          <span>
            <span className="tabular-nums">{Math.min(index + 1, items.length)}</span>
            <span className="text-ink-3"> / {items.length}</span>
          </span>
        }
        progress={index / items.length}
      />
      <StudyStage>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.gentle}>
              <ResultScreen
                emoji={learning.length === 0 ? "🎉" : "💪"}
                title={learning.length === 0 ? "¡Perfecto!" : "Nice work"}
                subtitle={
                  learning.length === 0
                    ? `You knew all ${items.length} cards.`
                    : `You knew ${known.length} of ${items.length}. Let's go over the rest.`
                }
                actions={
                  <>
                    {learning.length > 0 && (
                      <Button variant="primary" size="lg" onClick={() => onRestart(learning.map((h) => items[h.index].card.id))}>
                        Study {learning.length} again
                      </Button>
                    )}
                    <Button size="lg" onClick={() => onRestart(undefined)}>
                      Restart all
                    </Button>
                    <Link href={`/sets/${set.slug}/learn`}>
                      <Button size="lg" variant={learning.length === 0 ? "primary" : "secondary"} className="w-full">
                        Continue in Learn
                      </Button>
                    </Link>
                  </>
                }
              >
                <div className="mx-auto flex max-w-sm items-center justify-center gap-8">
                  <ProgressRing value={known.length / items.length} size={120} stroke={10}>
                    <span className="font-display text-3xl font-bold tabular-nums">
                      {Math.round((known.length / items.length) * 100)}%
                    </span>
                  </ProgressRing>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-2 font-semibold text-green">
                      <IconCheck size={18} /> {known.length} know
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-purple">
                      <IconRepeat18 /> {learning.length} still learning
                    </div>
                  </div>
                </div>
              </ResultScreen>
            </motion.div>
          ) : (
            <motion.div key="deck" exit={{ opacity: 0, scale: 0.96 }}>
              <div className="relative mx-auto aspect-[4/5] max-h-[62dvh] w-full max-w-xl sm:aspect-[3/2]">
                {/* the next card peeks from behind */}
                {items[index + 1] && (
                  <motion.div
                    key={`peek-${items[index + 1].key}`}
                    className="absolute inset-0 rounded-[2rem] border border-line bg-surface shadow-card"
                    initial={{ scale: 0.88, y: 30, opacity: 0 }}
                    animate={{ scale: 0.94, y: 18, opacity: 0.7 }}
                    transition={spring.gentle}
                  />
                )}
                <AnimatePresence custom={exitDir} initial={false}>
                  <SwipeCard
                    key={item.key + index}
                    item={item}
                    flipped={flipped}
                    exitDir={exitDir}
                    starred={!!p.stars[starKey(item.slug, item.card.id)]}
                    onFlip={flip}
                    onGrade={grade}
                  />
                </AnimatePresence>
              </div>

              <div className="mx-auto mt-8 flex max-w-xl items-center justify-between gap-3">
                <Button size="lg" onClick={() => grade("learning")} className="flex-1 !text-purple">
                  <IconX size={20} /> Still learning
                </Button>
                <IconButton label="Undo (Z)" onClick={undo} disabled={history.length === 0} className="h-14 w-14 bg-surface shadow-card disabled:opacity-30">
                  <IconUndo />
                </IconButton>
                <Button size="lg" onClick={() => grade("know")} className="flex-1 !text-green">
                  <IconCheck size={20} /> Know it
                </Button>
              </div>

              <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-2">
                <Chip
                  active={settings.shuffle}
                  onClick={() => updateSettings({ shuffle: !settings.shuffle })}
                  icon={<IconShuffle size={15} />}
                >
                  Shuffle
                </Chip>
                <Chip
                  active={false}
                  onClick={() =>
                    updateSettings({
                      direction: settings.direction === "es-pl" ? "pl-es" : settings.direction === "pl-es" ? "mixed" : "es-pl",
                    })
                  }
                  icon={<IconSwap size={15} />}
                >
                  {settings.direction === "mixed" ? "Mixed" : settings.direction === "es-pl" ? "🇪🇸 front" : "🇵🇱 front"}
                </Chip>
              </div>

              <div className="mt-6 hidden items-center justify-center gap-5 text-xs text-ink-3 sm:flex">
                <span className="flex items-center gap-1.5"><Kbd>Space</Kbd> flip</span>
                <span className="flex items-center gap-1.5"><Kbd>←</Kbd> still learning</span>
                <span className="flex items-center gap-1.5"><Kbd>→</Kbd> know</span>
                <span className="flex items-center gap-1.5"><Kbd>Z</Kbd> undo</span>
                <span className="flex items-center gap-1.5"><Kbd>S</Kbd> star</span>
                <span className="flex items-center gap-1.5"><Kbd>P</Kbd> pronounce</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </StudyStage>
    </>
  );
}

function IconRepeat18() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
    </svg>
  );
}

function Chip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
        active ? "bg-purple/12 text-purple" : "bg-surface-2 text-ink-2 hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </motion.button>
  );
}

const cardVariants = {
  enter: (dir: number) => ({ x: dir * -60, opacity: 0, scale: 0.94, y: 18 }),
  center: { x: 0, opacity: 1, scale: 1, y: 0, rotate: 0 },
  exit: (dir: number) => ({
    x: dir * 700,
    rotate: dir * 24,
    opacity: 0,
    transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] as const },
  }),
};

function SwipeCard({
  item,
  flipped,
  exitDir,
  starred,
  onFlip,
  onGrade,
}: {
  item: Item;
  flipped: boolean;
  exitDir: number;
  starred: boolean;
  onFlip: () => void;
  onGrade: (g: Grade) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 320], [-16, 16]);
  const knowOpacity = useTransform(x, [30, 140], [0, 1]);
  const learnOpacity = useTransform(x, [-140, -30], [1, 0]);

  // a drag must never also count as a tap-to-flip
  const dragged = useRef(false);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110 || info.velocity.x > 600) onGrade("know");
    else if (info.offset.x < -110 || info.velocity.x < -600) onGrade("learning");
  };

  const pLang = promptLang(item.dir);
  const aLang = answerLang(item.dir);

  return (
    <motion.div
      className="perspective absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, rotate }}
      custom={exitDir}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={spring.gentle}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      onTapStart={() => {
        dragged.current = false;
      }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={onDragEnd}
      onTap={() => {
        if (!dragged.current) onFlip();
      }}
    >
      <motion.div
        className="preserve-3d relative h-full w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={spring.flip}
      >
        <Face lang={pLang} text={item.card[pLang]} hint={item.card.hint?.[pLang]} item={item} starred={starred} />
        <Face
          back
          lang={aLang}
          text={item.card[aLang]}
          note={item.card.note}
          example={item.card.example}
          item={item}
          starred={starred}
        />
      </motion.div>

      {/* swipe feedback */}
      <motion.div
        style={{ opacity: knowOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-start rounded-[2rem] bg-green/10 p-6 ring-4 ring-green ring-inset"
      >
        <span className="-rotate-12 rounded-xl border-[3px] border-green px-3 py-1 font-display text-2xl font-extrabold uppercase text-green">Know</span>
      </motion.div>
      <motion.div
        style={{ opacity: learnOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-end rounded-[2rem] bg-purple/10 p-6 ring-4 ring-purple ring-inset"
      >
        <span className="rotate-12 rounded-xl border-[3px] border-purple px-3 py-1 font-display text-2xl font-extrabold uppercase text-purple">Learning</span>
      </motion.div>
    </motion.div>
  );
}

function Face({
  back,
  lang,
  text,
  hint,
  note,
  example,
  item,
  starred,
}: {
  back?: boolean;
  lang: "es" | "pl";
  text: string;
  hint?: string;
  note?: string;
  example?: { es: string; pl: string };
  item: Item;
  starred: boolean;
}) {
  return (
    <div
      className={`backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border border-line bg-surface p-6 shadow-lift ${
        back ? "[transform:rotateY(180deg)]" : ""
      }`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60 ${
          back ? "bg-gradient-to-b from-green/12 to-transparent" : "bg-gradient-to-b from-blue/12 to-transparent"
        }`}
      />
      <div className="relative flex items-center justify-between">
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
          {LANG_FLAG[lang]} {LANG_LABEL[lang]}
        </span>
        <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
          {lang === "es" && (
            <IconButton
              label="Pronounce"
              onClick={(e) => {
                e.stopPropagation();
                speak(text, "es");
              }}
            >
              <IconSpeaker size={19} />
            </IconButton>
          )}
          <IconButton
            label={starred ? "Unstar" : "Star"}
            className={starred ? "text-amber hover:text-amber" : ""}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(item.slug, item.card.id);
            }}
          >
            <IconStar size={19} filled={starred} />
          </IconButton>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-2 text-center">
        <div className={`font-display font-bold leading-tight tracking-[-0.025em] ${fitText(text)}`}>{text}</div>
        {hint && <div className="mt-3 text-[15px] font-medium text-ink-3">({hint})</div>}
        {note && <div className="mt-5 max-w-md text-[15px] leading-snug text-ink-2">{note}</div>}
        {example && (
          <div className="mt-4 max-w-md rounded-2xl bg-surface-2 px-4 py-2.5 text-[14px] leading-snug">
            <div className="font-medium">{example.es}</div>
            <div className="text-ink-3">{example.pl}</div>
          </div>
        )}
      </div>
      {!back && <div className="relative text-center text-xs font-medium text-ink-3">Tap to flip</div>}
    </div>
  );
}
