"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { spring } from "@/lib/motion";
import { sfx } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import type { Item } from "@/lib/session";
import { Button } from "../ui/Button";
import { Kbd } from "../ui/controls";
import { IconCheck, IconX } from "../ui/icons";
import { useKeys } from "./StudyChrome";
import type { Outcome } from "./TypedQuestion";

export function ChoiceQuestion({
  item,
  options,
  autoSpeak,
  onDone,
}: {
  item: Item;
  options: string[];
  autoSpeak: boolean;
  onDone: (o: Outcome) => void;
}) {
  const answer = item.card[item.dir === "es-pl" ? "pl" : "es"];
  const [picked, setPicked] = useState<number | null>(null);
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctIndex = options.indexOf(answer);
  const isRight = picked !== null && picked === correctIndex;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const finish = () => {
    if (finished.current || picked === null) return;
    finished.current = true;
    if (timer.current) clearTimeout(timer.current);
    onDone({ accepted: isRight, verdict: isRight ? "correct" : "wrong" });
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (autoSpeak && item.dir === "pl-es") speak(item.card.es, "es");
    if (i === correctIndex) {
      sfx.correct();
      timer.current = setTimeout(() => {
        finished.current = true;
        onDone({ accepted: true, verdict: "correct" });
      }, 800);
    } else {
      sfx.wrong();
    }
  };

  useKeys(
    (e) => {
      const n = Number(e.key);
      if (picked === null && n >= 1 && n <= options.length) choose(n - 1);
      else if (picked === null && e.key === "0") choose(-1);
      else if (picked !== null && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        finish();
      }
    },
    [picked, options],
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o, i) => {
          const state =
            picked === null ? "idle" : i === correctIndex ? "right" : i === picked ? "wrong" : "dim";
          return (
            <motion.button
              key={o}
              initial={{ opacity: 0, y: 12 }}
              animate={
                state === "wrong"
                  ? { opacity: 1, y: 0, x: [0, -8, 7, -4, 0] }
                  : state === "right" && picked !== null
                    ? { opacity: 1, y: 0, scale: [1, 1.04, 1] }
                    : { opacity: state === "dim" ? 0.45 : 1, y: 0 }
              }
              transition={{
                ...spring.gentle,
                delay: picked === null ? i * 0.04 : 0,
                x: { duration: 0.4 },
                scale: { duration: 0.35 },
              }}
              whileHover={picked === null ? { y: -2 } : undefined}
              whileTap={picked === null ? { scale: 0.97 } : undefined}
              onClick={() => (picked === null ? choose(i) : finish())}
              className={`group flex min-h-16 items-center gap-3 rounded-[1.25rem] border-2 px-4 py-3 text-left text-[17px] font-medium transition-colors ${
                state === "right"
                  ? "border-green bg-green/10"
                  : state === "wrong"
                    ? "border-red bg-red/8"
                    : "border-line bg-surface shadow-card hover:border-blue/50"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold transition-colors ${
                  state === "right"
                    ? "bg-green text-white"
                    : state === "wrong"
                      ? "bg-red text-white"
                      : "bg-surface-2 text-ink-3"
                }`}
              >
                {state === "right" ? <IconCheck size={16} strokeWidth={3} /> : state === "wrong" ? <IconX size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0">{o}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 flex min-h-14 items-center justify-between gap-3">
        {picked === null ? (
          <Button variant="ghost" onClick={() => choose(-1)}>
            Don&apos;t know <span className="ml-1 hidden sm:inline"><Kbd>0</Kbd></span>
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle} className="flex w-full items-center justify-between gap-3">
            <span className={`font-display text-lg font-bold ${isRight ? "text-green" : "text-red"}`}>
              {isRight ? "¡Correcto!" : "You'll get it next time"}
            </span>
            {!isRight && (
              <Button variant="primary" size="lg" onClick={finish} className="min-w-36">
                Continue <span className="ml-1 hidden opacity-70 sm:inline"><Kbd>↵</Kbd></span>
              </Button>
            )}
          </motion.div>
        )}
      </div>
      {item.card.note && picked !== null && !isRight && (
        <p className="mt-2 text-[14px] text-ink-2">💡 {item.card.note}</p>
      )}
    </div>
  );
}
