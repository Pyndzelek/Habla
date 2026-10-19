"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fadeUp, spring, stagger } from "@/lib/motion";
import { resetSet, starKey, toggleStar, updateSettings, useHydrated, useProgress } from "@/lib/progress";
import { countStarred } from "@/lib/session";
import { speak } from "@/lib/speech";
import { cardMastery, emptyStats, MASTERY_COLOR, MASTERY_LABEL, setStats } from "@/lib/stats";
import type { StudySet } from "@/lib/types";
import { useOpenSettings } from "../AppShell";
import { MasteryBar } from "../MasteryBar";
import { DIRECTION_OPTIONS } from "../SettingsPanel";
import { Button, IconButton } from "../ui/Button";
import { SegmentedControl, Toggle } from "../ui/controls";
import {
  IconBrain,
  IconCards,
  IconChevronLeft,
  IconGrid,
  IconKeyboard,
  IconRepeat,
  IconSettings,
  IconSpeaker,
  IconStar,
} from "../ui/icons";

const ACCENT_BG: Record<string, string> = {
  blue: "from-blue/25 to-blue/5",
  purple: "from-purple/25 to-purple/5",
  green: "from-green/25 to-green/5",
};

export function SetView({ set }: { set: StudySet }) {
  const p = useProgress();
  const hydrated = useHydrated();
  const openSettings = useOpenSettings();
  const [filter, setFilter] = useState<"all" | "starred" | "weak">("all");
  const [confirmReset, setConfirmReset] = useState(false);

  const ids = useMemo(() => set.cards.map((c) => c.id), [set.cards]);
  const stats = hydrated ? setStats(p.cards, set.slug, ids) : emptyStats(ids.length);
  const starred = countStarred(set, p.stars);
  const s = p.settings;

  const visible = set.cards.filter((c) => {
    if (filter === "starred") return p.stars[starKey(set.slug, c.id)];
    if (filter === "weak") return cardMastery(p.cards, set.slug, c.id) !== "mastered";
    return true;
  });

  const base = `/sets/${set.slug}`;
  const modes = [
    {
      href: `${base}/learn`,
      title: "Learn",
      detail: "Adaptive rounds: recognise, then type",
      icon: <IconBrain size={22} />,
      featured: true,
    },
    { href: `${base}/flashcards`, title: "Flashcards", detail: "Flip, swipe, sort", icon: <IconCards size={22} /> },
    { href: `${base}/write`, title: "Write", detail: "Recall every word", icon: <IconKeyboard size={22} /> },
    { href: `${base}/match`, title: "Match", detail: "Race the clock", icon: <IconGrid size={22} /> },
  ];

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <Link href="/" className="-ml-1 inline-flex items-center gap-1 text-[15px] font-medium text-blue">
          <IconChevronLeft size={18} /> Home
        </Link>
      </motion.div>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-5">
          <motion.span
            layoutId={`emoji-${set.slug}`}
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.6rem] bg-gradient-to-br text-[2.6rem] shadow-card ${ACCENT_BG[set.accent]}`}
          >
            {set.emoji}
          </motion.span>
          <div>
            {set.unit && (
              <motion.div variants={fadeUp} className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                {set.unit}
              </motion.div>
            )}
            <motion.h1
              layoutId={`title-${set.slug}`}
              className="font-display text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl"
            >
              {set.title}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-1 text-ink-3">
              {set.description}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <motion.div variants={fadeUp} className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {(["mastered", "familiar", "learning", "new"] as const).map((k) => (
              <span key={k} className="flex items-center gap-2 text-ink-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: MASTERY_COLOR[k] }} />
                {MASTERY_LABEL[k]} <b className="tabular-nums text-ink">{hydrated ? stats[k] : k === "new" ? stats.total : 0}</b>
              </span>
            ))}
          </div>
          {hydrated && stats.due > 0 && (
            <Link href={`/review?set=${set.slug}`}>
              <Button size="sm" variant="primary">
                <IconRepeat size={15} /> Review {stats.due} due
              </Button>
            </Link>
          )}
        </div>
        <MasteryBar stats={hydrated ? stats : { ...stats, new: stats.total, learning: 0, familiar: 0, mastered: 0 }} className="mt-4 h-2.5" />
      </motion.div>

      {/* Modes */}
      <motion.div variants={stagger(0.05)} className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {modes.map((m) => (
          <motion.div key={m.title} variants={fadeUp}>
            <Link href={m.href} prefetch className="block h-full">
              <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                className={`flex h-full flex-col gap-6 rounded-card p-5 shadow-card ${
                  m.featured ? "bg-brand text-white shadow-lift" : "border border-line bg-surface"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    m.featured ? "bg-white/20" : "bg-surface-2 text-purple"
                  }`}
                >
                  {m.icon}
                </span>
                <div>
                  <div className="font-display text-lg font-bold tracking-tight">{m.title}</div>
                  <div className={`text-[13px] leading-snug ${m.featured ? "text-white/80" : "text-ink-3"}`}>{m.detail}</div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick options */}
      <motion.div
        variants={fadeUp}
        className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-surface px-5 py-4 shadow-card"
      >
        <SegmentedControl
          size="sm"
          value={s.direction}
          options={DIRECTION_OPTIONS}
          onChange={(direction) => updateSettings({ direction })}
        />
        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={s.shuffle} onChange={(shuffle) => updateSettings({ shuffle })} label="Shuffle" /> Shuffle
        </label>
        <label className={`flex items-center gap-3 text-sm font-medium ${starred === 0 ? "opacity-40" : ""}`}>
          <Toggle
            checked={s.starredOnly && starred > 0}
            onChange={(starredOnly) => starred > 0 && updateSettings({ starredOnly })}
            label="Starred only"
          />
          Starred only {hydrated && starred > 0 && <span className="text-ink-3">({starred})</span>}
        </label>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" onClick={() => openSettings(true)}>
            <IconSettings size={16} /> More options
          </Button>
        </div>
      </motion.div>

      {/* Terms */}
      <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Terms <span className="text-ink-3">{set.cards.length}</span>
        </h2>
        <SegmentedControl
          size="sm"
          value={filter}
          options={[
            { value: "all", label: "All" },
            { value: "weak", label: "Not mastered" },
            { value: "starred", label: `Starred${hydrated && starred ? ` · ${starred}` : ""}` },
          ]}
          onChange={setFilter}
        />
      </motion.div>

      <motion.ul variants={fadeUp} layout className="mt-4 overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <AnimatePresence initial={false}>
          {visible.map((c) => {
            const isStar = !!p.stars[starKey(set.slug, c.id)];
            const m = cardMastery(p.cards, set.slug, c.id);
            return (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.gentle}
                className="border-b border-line last:border-b-0"
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[auto_1fr_1fr_auto] sm:px-5">
                  <span
                    title={MASTERY_LABEL[m]}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: hydrated ? MASTERY_COLOR[m] : MASTERY_COLOR.new }}
                  />
                  <div className="min-w-0 sm:contents">
                    <div className="truncate text-[17px] font-semibold">{c.es}</div>
                    <div className="truncate text-[15px] text-ink-3 sm:text-[17px] sm:text-ink-2">
                      {c.pl}
                      {c.hint?.pl && <span className="text-ink-3"> · {c.hint.pl}</span>}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <IconButton label={`Pronounce ${c.es}`} onClick={() => speak(c.es, "es")}>
                      <IconSpeaker size={18} />
                    </IconButton>
                    <IconButton
                      label={isStar ? "Unstar" : "Star"}
                      onClick={() => toggleStar(set.slug, c.id)}
                      className={isStar ? "text-amber hover:text-amber" : ""}
                    >
                      <motion.span key={String(isStar)} initial={{ scale: 0.4, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy}>
                        <IconStar size={19} filled={isStar} />
                      </motion.span>
                    </IconButton>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {visible.length === 0 && (
          <li className="px-5 py-10 text-center text-ink-3">
            {filter === "starred" ? "Tap ☆ on any term to star it." : "Everything here is mastered. ¡Muy bien!"}
          </li>
        )}
      </motion.ul>

      <motion.div variants={fadeUp} className="mt-8 flex justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {confirmReset ? (
            <motion.div key="c" className="flex gap-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Button size="sm" variant="danger" onClick={() => { resetSet(set.slug); setConfirmReset(false); }}>
                Reset progress for this set
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </motion.div>
          ) : (
            <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button size="sm" variant="ghost" className="text-ink-3" onClick={() => setConfirmReset(true)}>
                Reset set progress
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
