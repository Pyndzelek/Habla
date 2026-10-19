"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { fadeUp, spring, stagger } from "@/lib/motion";
import { streak, todayKey, useHydrated, useProgress } from "@/lib/progress";
import { emptyStats, setStats, type SetStats } from "@/lib/stats";
import type { SetSummary } from "@/lib/types";
import { AnimatedNumber, ProgressRing } from "../ui/controls";
import { IconCheck, IconChevronRight, IconFlame, IconRepeat, IconSparkle } from "../ui/icons";
import { MasteryBar } from "../MasteryBar";

function greeting(h: number) {
  if (h < 5) return { es: "¡Buenas noches!", en: "Studying late? Respect." };
  if (h < 12) return { es: "¡Buenos días!", en: "Ready for today's Spanish?" };
  if (h < 20) return { es: "¡Buenas tardes!", en: "A few minutes now beats an hour later." };
  return { es: "¡Buenas noches!", en: "A quick review before bed helps memory." };
}

// The hour only matters on the client; render a neutral greeting on the server.
const subscribeNoop = () => () => {};
function useHour() {
  return useSyncExternalStore(subscribeNoop, () => new Date().getHours(), () => 9);
}

export function Dashboard({ sets }: { sets: SetSummary[] }) {
  const p = useProgress();
  const hydrated = useHydrated();
  const hour = useHour();
  const g = greeting(hour);

  const stats = useMemo(() => {
    const per: Record<string, SetStats> = {};
    let due = 0;
    let mastered = 0;
    let seen = 0;
    for (const s of sets) {
      const st = hydrated ? setStats(p.cards, s.slug, s.cardIds) : emptyStats(s.cardCount);
      per[s.slug] = st;
      due += st.due;
      mastered += st.mastered;
      seen += st.total - st.new;
    }
    return { per, due, mastered, seen };
  }, [p.cards, sets, hydrated]);

  const today = hydrated ? (p.daily[todayKey()] ?? 0) : 0;
  const goal = p.settings.dailyGoal;
  const days = hydrated ? streak(p.daily) : 0;

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
          <span className="text-gradient">{g.es}</span>
        </h1>
        <p className="mt-3 text-lg text-ink-3">{g.en}</p>
      </motion.div>

      {/* Today */}
      <motion.div variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <ReviewHero due={hydrated ? stats.due : 0} seen={stats.seen} hydrated={hydrated} />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-1 sm:grid-rows-3">
          <StatTile
            label="Today"
            icon={
              <ProgressRing value={today / goal} size={34} stroke={4.5}>
                {today >= goal && <IconCheck size={14} className="text-green" />}
              </ProgressRing>
            }
          >
            <AnimatedNumber value={hydrated ? today : 0} />
            <span className="text-ink-3">/{goal}</span>
          </StatTile>
          <StatTile label="Day streak" icon={<IconFlame size={22} className={days > 0 ? "text-amber" : "text-ink-3"} />}>
            <AnimatedNumber value={hydrated ? days : 0} />
          </StatTile>
          <StatTile label="Mastered" icon={<IconSparkle size={20} className="text-green" />}>
            <AnimatedNumber value={hydrated ? stats.mastered : 0} />
          </StatTile>
        </div>
      </motion.div>

      {/* Sets */}
      <motion.div variants={fadeUp} className="mt-12 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight">Your sets</h2>
        <span className="text-sm text-ink-3">{sets.length} sets · {sets.reduce((n, s) => n + s.cardCount, 0)} terms</span>
      </motion.div>
      <motion.div id="sets" variants={stagger(0.05)} className="mt-4 scroll-mt-24 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((s) => (
          <SetCard key={s.slug} set={s} stats={stats.per[s.slug]} hydrated={hydrated} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function ReviewHero({ due, seen, hydrated }: { due: number; seen: number; hydrated: boolean }) {
  const caughtUp = hydrated && due === 0;
  const fresh = hydrated && seen === 0;
  return (
    <Link href={due > 0 ? "/review" : "#sets"} className={due > 0 ? "" : "pointer-events-none"}>
      <motion.div
        whileHover={due > 0 ? { y: -3, scale: 1.01 } : undefined}
        whileTap={due > 0 ? { scale: 0.98 } : undefined}
        transition={spring.snappy}
        className={`relative h-full min-h-44 overflow-hidden rounded-card p-6 text-white shadow-lift ${
          caughtUp && !fresh ? "bg-brand-green" : "bg-brand"
        }`}
      >
        <motion.div
          aria-hidden
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl"
          animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex h-full flex-col justify-between gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <IconRepeat size={16} /> Spaced review
          </div>
          <div>
            {!hydrated ? (
              <div className="h-12" />
            ) : fresh ? (
              <>
                <div className="font-display text-3xl font-bold tracking-tight">Start with a set below</div>
                <p className="mt-1 text-white/80">Words you learn will come back here right before you&apos;d forget them.</p>
              </>
            ) : caughtUp ? (
              <>
                <div className="font-display text-3xl font-bold tracking-tight">All caught up ✓</div>
                <p className="mt-1 text-white/80">Nothing is due. Learn something new, or come back later.</p>
              </>
            ) : (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-display text-5xl font-bold tabular-nums tracking-tight">
                    <AnimatedNumber value={due} />
                  </div>
                  <p className="mt-1 text-white/85">{due === 1 ? "word is" : "words are"} ready for review</p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <IconChevronRight size={22} />
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function StatTile({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex">{icon}</span>
        <span className="text-[13px] font-medium text-ink-3">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl font-bold tracking-tight">{children}</span>
        <span className="sm:hidden">{icon}</span>
      </div>
    </div>
  );
}

const ACCENT_BG: Record<string, string> = {
  blue: "from-blue/20 to-blue/5",
  purple: "from-purple/20 to-purple/5",
  green: "from-green/20 to-green/5",
};

function SetCard({ set, stats, hydrated }: { set: SetSummary; stats: SetStats; hydrated: boolean }) {
  const pct = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;
  return (
    <motion.div variants={fadeUp}>
      <Link href={`/sets/${set.slug}`} prefetch className="block h-full">
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={spring.snappy}
          className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
        >
          <div className="flex items-start justify-between">
            <motion.span
              layoutId={`emoji-${set.slug}`}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl ${ACCENT_BG[set.accent]}`}
            >
              {set.emoji}
            </motion.span>
            {hydrated && stats.due > 0 && (
              <span className="rounded-full bg-purple/12 px-2.5 py-1 text-xs font-semibold text-purple">{stats.due} due</span>
            )}
          </div>
          <div className="mt-4 flex-1">
            {set.unit && <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">{set.unit}</div>}
            <motion.h3 layoutId={`title-${set.slug}`} className="mt-1 font-display text-lg font-bold leading-tight tracking-tight">
              {set.title}
            </motion.h3>
            <p className="mt-1 line-clamp-2 text-sm text-ink-3">{set.description}</p>
          </div>
          <div className="mt-5">
            <MasteryBar stats={hydrated ? stats : { ...stats, new: stats.total, learning: 0, familiar: 0, mastered: 0 }} />
            <div className="mt-2 flex justify-between text-xs font-medium text-ink-3">
              <span>{set.cardCount} terms</span>
              <span className={pct === 100 ? "text-green" : ""}>{hydrated ? `${pct}% mastered` : ""}</span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
