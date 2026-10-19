"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { MASTERY_COLOR, type SetStats } from "@/lib/stats";

const ORDER = ["mastered", "familiar", "learning"] as const;

export function MasteryBar({ stats, className = "h-2" }: { stats: SetStats; className?: string }) {
  return (
    <div className={`flex w-full gap-[3px] overflow-hidden rounded-full bg-line ${className}`}>
      {ORDER.map((k) => (
        <motion.div
          key={k}
          className="h-full rounded-full"
          style={{ background: MASTERY_COLOR[k] }}
          initial={false}
          animate={{ width: `${stats.total ? (stats[k] / stats.total) * 100 : 0}%` }}
          transition={spring.gentle}
        />
      ))}
    </div>
  );
}
