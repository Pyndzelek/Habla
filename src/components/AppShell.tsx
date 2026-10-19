"use client";

import { MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useState } from "react";
import { SettingsPanel } from "./SettingsPanel";
import { Sheet } from "./ui/Sheet";

const SettingsCtx = createContext<{ open: (compact?: boolean) => void }>({ open: () => {} });

export function useOpenSettings() {
  return useContext(SettingsCtx).open;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; compact: boolean }>({ open: false, compact: false });
  const open = useCallback((compact = false) => setState({ open: true, compact }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <MotionConfig reducedMotion="user">
      <SettingsCtx.Provider value={{ open }}>
        {children}
        <Sheet open={state.open} onClose={close} title={state.compact ? "Study options" : "Settings"}>
          <SettingsPanel compact={state.compact} />
        </Sheet>
      </SettingsCtx.Provider>
    </MotionConfig>
  );
}

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="blob h-[42vw] w-[42vw] bg-blue"
        style={{ top: "-12vw", left: "-8vw", animation: "drift-a 28s ease-in-out infinite" }}
      />
      <div
        className="blob h-[36vw] w-[36vw] bg-purple"
        style={{ top: "10vh", right: "-10vw", animation: "drift-b 34s ease-in-out infinite" }}
      />
      <div
        className="blob h-[30vw] w-[30vw] bg-green"
        style={{ bottom: "-10vw", left: "30vw", animation: "drift-c 40s ease-in-out infinite", opacity: "calc(var(--blob-opacity) * 0.7)" }}
      />
    </div>
  );
}
