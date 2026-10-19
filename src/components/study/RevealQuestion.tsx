"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { spring } from "@/lib/motion";
import { sfx } from "@/lib/sounds";
import type { Item } from "@/lib/session";
import { answerLang, LANG_FLAG, LANG_LABEL } from "@/lib/types";
import { Button } from "../ui/Button";
import { Kbd } from "../ui/controls";
import { IconCheck, IconLightbulb, IconX } from "../ui/icons";
import { useKeys } from "./StudyChrome";
import type { Outcome } from "./TypedQuestion";

/**
 * Self-graded recall for answers in the learner's native language:
 * think of the answer, reveal it, say honestly whether you knew it.
 */
export function RevealQuestion({ item, onDone }: { item: Item; onDone: (o: Outcome) => void }) {
  const lang = answerLang(item.dir);
  const answer = item.card[lang];
  const [revealed, setRevealed] = useState(false);
  const finished = useRef(false);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    sfx.flip();
  };

  const grade = (knew: boolean) => {
    if (!revealed || finished.current) return;
    finished.current = true;
    if (knew) sfx.correct();
    else sfx.tap();
    onDone({ accepted: knew, verdict: knew ? "correct" : "wrong" });
  };

  useKeys(
    (e) => {
      if (!revealed) {
        if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          reveal();
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "2" || e.key === "Enter") {
        e.preventDefault();
        grade(true);
      } else if (e.key === "ArrowLeft" || e.key === "1") {
        grade(false);
      }
    },
    [revealed],
  );

  return (
    <div>
      <div className="perspective">
        <AnimatePresence mode="wait" initial={false}>
          {!revealed ? (
            <motion.button
              key="hidden"
              onClick={reveal}
              exit={{ rotateX: 90, opacity: 0, transition: { duration: 0.16 } }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={spring.snappy}
              className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-[1.75rem] border-2 border-dashed border-line-strong bg-surface/60 px-6 py-8 text-center transition-colors hover:border-purple/50"
            >
              <span className="text-[15px] font-medium text-ink-3">
                Think of the {LANG_FLAG[lang]} {LANG_LABEL[lang]} meaning…
              </span>
              <span className="flex items-center gap-2 font-display text-lg font-bold text-purple">
                Show answer <span className="hidden sm:inline"><Kbd>Space</Kbd></span>
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="shown"
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={spring.flip}
              className="flex min-h-36 w-full flex-col items-center justify-center rounded-[1.75rem] border border-line bg-surface px-6 py-7 text-center shadow-card"
            >
              <span className="mb-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
                {LANG_FLAG[lang]} {LANG_LABEL[lang]}
              </span>
              <div className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{answer}</div>
              {item.card.note && (
                <div className="mt-4 flex max-w-md gap-2 text-left text-[14px] leading-snug text-ink-2">
                  <IconLightbulb size={17} className="mt-0.5 shrink-0 text-amber" />
                  {item.card.note}
                </div>
              )}
              {item.card.example && (
                <div className="mt-3 max-w-md rounded-2xl bg-surface-2 px-4 py-2.5 text-[14px] leading-snug">
                  <div className="font-medium">{item.card.example.es}</div>
                  <div className="text-ink-3">{item.card.example.pl}</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex min-h-14 items-center gap-3">
        <AnimatePresence initial={false}>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.gentle, delay: 0.08 }}
              className="flex w-full gap-3"
            >
              <Button size="lg" onClick={() => grade(false)} className="flex-1 !text-purple">
                <IconX size={20} /> Didn&apos;t know <span className="ml-1 hidden sm:inline"><Kbd>←</Kbd></span>
              </Button>
              <Button size="lg" onClick={() => grade(true)} className="flex-1 !text-green">
                <IconCheck size={20} /> Knew it <span className="ml-1 hidden sm:inline"><Kbd>→</Kbd></span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
