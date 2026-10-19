"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import {
  exportProgress,
  importProgress,
  resetAll,
  updateSettings,
  useSettings,
  type Settings,
} from "@/lib/progress";
import { Button } from "./ui/Button";
import { SegmentedControl, Toggle } from "./ui/controls";

function Row({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[15px] font-medium">{title}</div>
        {detail && <div className="mt-0.5 text-[13px] leading-snug text-ink-3">{detail}</div>}
      </div>
      {children}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-1 px-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">{label}</h3>
      <div className="divide-y divide-line rounded-2xl bg-surface-2/60 px-4">{children}</div>
    </section>
  );
}

export const DIRECTION_OPTIONS: { value: Settings["direction"]; label: string }[] = [
  { value: "es-pl", label: "🇪🇸 → 🇵🇱" },
  { value: "pl-es", label: "🇵🇱 → 🇪🇸" },
  { value: "mixed", label: "Mixed" },
];

const STRICTNESS_DETAIL: Record<Settings["strictness"], string> = {
  strict: "Only accents are forgiven.",
  normal: "Small typos like swapped or neighbouring keys are accepted.",
  lenient: "More typos are accepted — good when you're tired.",
};

export function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 2500);
  };

  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `habla-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    flash("Backup downloaded");
  };

  const onImport = async (file: File) => {
    try {
      importProgress(await file.text());
      flash("Progress restored ✓");
    } catch (e) {
      flash((e as Error).message);
    }
  };

  return (
    <div className="pb-2">
      <Group label="Cards">
        <div className="py-3.5">
          <div className="mb-2.5 text-[15px] font-medium">Prompt → answer</div>
          <SegmentedControl
            className="w-full"
            value={s.direction}
            options={DIRECTION_OPTIONS}
            onChange={(direction) => updateSettings({ direction })}
          />
        </div>
        <Row title="Shuffle" detail="Randomise the order every session.">
          <Toggle checked={s.shuffle} onChange={(shuffle) => updateSettings({ shuffle })} />
        </Row>
        <Row title="Starred only" detail="Study just the terms you've starred.">
          <Toggle checked={s.starredOnly} onChange={(starredOnly) => updateSettings({ starredOnly })} />
        </Row>
      </Group>

      <Group label="Learn & Write">
        <div className="py-3.5">
          <div className="mb-2.5 text-[15px] font-medium">Typo tolerance</div>
          <SegmentedControl
            className="w-full"
            value={s.strictness}
            options={[
              { value: "strict", label: "Strict" },
              { value: "normal", label: "Normal" },
              { value: "lenient", label: "Lenient" },
            ]}
            onChange={(strictness) => updateSettings({ strictness })}
          />
          <p className="mt-2 px-1 text-[13px] text-ink-3">{STRICTNESS_DETAIL[s.strictness]}</p>
        </div>
        <Row title="Start with multiple choice" detail="New words are recognised first, then typed.">
          <Toggle checked={s.learnWithChoices} onChange={(learnWithChoices) => updateSettings({ learnWithChoices })} />
        </Row>
        <Row title="Retype mistakes" detail="Copy the right answer once — it sticks better.">
          <Toggle checked={s.retypeMistakes} onChange={(retypeMistakes) => updateSettings({ retypeMistakes })} />
        </Row>
        <Row title="Round size">
          <SegmentedControl
            size="sm"
            value={String(s.roundSize)}
            options={["5", "7", "10", "15"].map((v) => ({ value: v, label: v }))}
            onChange={(v) => updateSettings({ roundSize: Number(v) })}
          />
        </Row>
      </Group>

      <Group label="Sound">
        <Row title="Pronounce Spanish" detail="Read words aloud automatically.">
          <Toggle checked={s.autoSpeak} onChange={(autoSpeak) => updateSettings({ autoSpeak })} />
        </Row>
        <Row title="Sound effects">
          <Toggle checked={s.sounds} onChange={(sounds) => updateSettings({ sounds })} />
        </Row>
      </Group>

      {!compact && (
        <>
          <Group label="Daily goal">
            <Row title="Answers per day">
              <SegmentedControl
                size="sm"
                value={String(s.dailyGoal)}
                options={["20", "40", "80", "150"].map((v) => ({ value: v, label: v }))}
                onChange={(v) => updateSettings({ dailyGoal: Number(v) })}
              />
            </Row>
          </Group>

          <Group label="Your data">
            <div className="flex flex-wrap gap-2 py-3.5">
              <Button size="sm" onClick={download}>
                Export backup
              </Button>
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                Import backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImport(f);
                  e.target.value = "";
                }}
              />
              <AnimatePresence mode="wait" initial={false}>
                {confirmReset ? (
                  <motion.div key="confirm" className="flex gap-2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        resetAll();
                        setConfirmReset(false);
                        flash("All progress cleared");
                      }}
                    >
                      Yes, erase everything
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                      Cancel
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
                      Reset progress
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="pb-3.5 text-[13px] text-ink-3">
              Progress is saved in this browser. Export a backup to move it to another device.
            </p>
          </Group>
        </>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 rounded-xl bg-green/12 px-4 py-2.5 text-center text-sm font-medium text-green"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
