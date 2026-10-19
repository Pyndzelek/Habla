"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { streak, todayKey, useHydrated, useProgress } from "@/lib/progress";
import { spring } from "@/lib/motion";
import { useOpenSettings } from "./AppShell";
import { IconButton } from "./ui/Button";
import { IconFlame, IconSettings } from "./ui/icons";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <motion.span
        className="bg-brand relative flex h-8 w-8 items-center justify-center rounded-[0.65rem] text-white shadow-[0_4px_14px_-4px_rgb(110_80_250/0.7)]"
        whileHover={{ rotate: -8, scale: 1.06 }}
        transition={spring.bouncy}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A3.5 3.5 0 0 1 4 12.5v-6Z"
            fill="currentColor"
          />
          <circle cx="9" cy="9.5" r="1.3" fill="#8b5cf6" />
          <circle cx="12" cy="9.5" r="1.3" fill="#0a84ff" />
          <circle cx="15" cy="9.5" r="1.3" fill="#30d158" />
        </svg>
      </motion.span>
      <span className="font-display text-[19px] font-bold tracking-tight">habla</span>
    </Link>
  );
}

export function Header() {
  const p = useProgress();
  const hydrated = useHydrated();
  const openSettings = useOpenSettings();
  // dates are only meaningful in the browser (the page is prerendered)
  const days = hydrated ? streak(p.daily) : 0;
  const today = hydrated ? (p.daily[todayKey()] ?? 0) : 0;

  return (
    <header className="glass sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-1.5">
          {hydrated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring.bouncy}
              title={`${days}-day streak`}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${
                today > 0 ? "bg-amber/12 text-amber" : "bg-surface-2 text-ink-3"
              }`}
            >
              <motion.span
                animate={today > 0 ? { scale: [1, 1.18, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <IconFlame size={16} />
              </motion.span>
              <span className="tabular-nums">{days}</span>
            </motion.div>
          )}
          <IconButton label="Settings" onClick={() => openSettings()}>
            <IconSettings />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
