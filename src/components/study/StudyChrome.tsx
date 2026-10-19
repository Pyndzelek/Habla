"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { fadeUp, spring, stagger } from "@/lib/motion";
import { useHydrated } from "@/lib/progress";
import { useOpenSettings } from "../AppShell";
import { IconButton } from "../ui/Button";
import { ProgressBar } from "../ui/controls";
import { IconSettings, IconX } from "../ui/icons";

export function StudyTopBar({
  backHref,
  title,
  progress,
  right,
}: {
  backHref: string;
  title: React.ReactNode;
  progress?: number;
  right?: React.ReactNode;
}) {
  const openSettings = useOpenSettings();
  return (
    <div className="glass sticky top-0 z-30 border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link
          href={backHref}
          aria-label="Close"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-90"
        >
          <IconX />
        </Link>
        <div className="min-w-0 flex-1 text-center text-[15px] font-semibold tracking-tight">
          <div className="truncate">{title}</div>
        </div>
        {right}
        <IconButton label="Study options" onClick={() => openSettings(true)}>
          <IconSettings />
        </IconButton>
      </div>
      {progress !== undefined && <ProgressBar value={progress} className="h-[3px] rounded-none" />}
    </div>
  );
}

/** Render children only on the client, once saved progress & settings are available. */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <motion.div
          className="h-10 w-10 rounded-full border-[3px] border-line border-t-purple"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function StudyStage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:pt-10">{children}</div>;
}

export function ResultScreen({
  emoji,
  title,
  subtitle,
  children,
  actions,
}: {
  emoji: string;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...spring.bouncy, delay: 0.05 }}
        className="text-7xl"
      >
        {emoji}
      </motion.div>
      <motion.h1 variants={fadeUp} className="mt-5 font-display text-4xl font-bold tracking-[-0.03em]">
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p variants={fadeUp} className="mt-2 max-w-md text-lg text-ink-3">
          {subtitle}
        </motion.p>
      )}
      {children && (
        <motion.div variants={fadeUp} className="mt-8 w-full">
          {children}
        </motion.div>
      )}
      <motion.div variants={fadeUp} className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row">
        {actions}
      </motion.div>
    </motion.div>
  );
}

/** Global keyboard shortcuts that ignore typing in inputs (unless allowInInput). */
export function useKeys(handler: (e: KeyboardEvent) => void, deps: unknown[], allowInInput = false) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (!allowInInput && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (document.querySelector('[role="dialog"]')) return;
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function fitText(text: string): string {
  const n = text.length;
  if (n <= 10) return "text-5xl sm:text-6xl";
  if (n <= 18) return "text-4xl sm:text-5xl";
  if (n <= 32) return "text-3xl sm:text-4xl";
  return "text-2xl sm:text-3xl";
}
