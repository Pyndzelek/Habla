"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { grade, type DiffSegment, type GradeResult, type Strictness, type Verdict } from "@/lib/grade";
import { spring } from "@/lib/motion";
import { sfx } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import type { Item } from "@/lib/session";
import { answerLang } from "@/lib/types";
import { Button } from "../ui/Button";
import { Kbd } from "../ui/controls";
import { IconCheck, IconLightbulb, IconX } from "../ui/icons";

const SPANISH_KEYS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];

export interface Outcome {
  accepted: boolean;
  verdict: Verdict;
}

type Phase = "answer" | "feedback";

export function TypedQuestion({
  item,
  strictness,
  retype,
  autoSpeak,
  onDone,
}: {
  item: Item;
  strictness: Strictness;
  retype: boolean;
  autoSpeak: boolean;
  onDone: (o: Outcome) => void;
}) {
  const lang = answerLang(item.dir);
  const expected = item.card[lang];
  const alts = item.card.alt?.[lang];

  const [phase, setPhase] = useState<Phase>("answer");
  const [input, setInput] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [retypeValue, setRetypeValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const retypeRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate();
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const finish = (o: Outcome) => {
    if (finished.current) return;
    finished.current = true;
    if (timer.current) clearTimeout(timer.current);
    onDone(o);
  };

  const shake = () => {
    void animate(scope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.4 });
  };

  const submit = (dontKnow = false) => {
    if (phase !== "answer") return;
    if (!dontKnow && !input.trim()) {
      shake();
      return;
    }
    const r = dontKnow
      ? { ...grade("", expected, { alts, strictness, lang }), verdict: "wrong" as const, accepted: false }
      : grade(input, expected, { alts, strictness, lang });
    setTyped(dontKnow ? "" : input);
    setResult(r);
    setPhase("feedback");
    if (autoSpeak && item.dir === "pl-es") speak(item.card.es, "es");

    if (r.verdict === "correct" && !r.missingArticle) {
      sfx.correct();
      timer.current = setTimeout(() => finish({ accepted: true, verdict: r.verdict }), item.card.note ? 1700 : 850);
    } else if (r.accepted) {
      sfx.almost();
      timer.current = setTimeout(() => finish({ accepted: true, verdict: r.verdict }), 2600);
    } else {
      sfx.wrong();
      shake();
    }
  };

  const continueAfterWrong = () => {
    if (!result) return;
    if (retype) {
      const r = grade(retypeValue, expected, { alts, strictness: "lenient", lang });
      if (!r.accepted) {
        shake();
        sfx.wrong();
        return;
      }
      sfx.pop();
    }
    finish({ accepted: false, verdict: "wrong" });
  };

  const override = () => {
    sfx.correct();
    finish({ accepted: true, verdict: "typo" });
  };

  const insert = (ch: string, target: HTMLInputElement | null, value: string, set: (v: string) => void) => {
    if (!target) return set(value + ch);
    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    set(next);
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const accepted = result?.accepted ?? false;
  const tone =
    phase === "answer"
      ? "border-line-strong focus-within:border-blue focus-within:shadow-[0_0_0_4px_rgb(10_132_255/0.15)]"
      : result?.verdict === "correct" && !result.missingArticle
        ? "border-green shadow-[0_0_0_4px_rgb(48_209_88/0.18)]"
        : accepted
          ? "border-amber shadow-[0_0_0_4px_rgb(255_159_10/0.16)]"
          : "border-red shadow-[0_0_0_4px_rgb(255_69_58/0.14)]";

  const showRetype = phase === "feedback" && !accepted && retype;
  const keysFor = showRetype ? "retype" : phase === "answer" ? "answer" : null;

  return (
    <div>
      <div ref={scope}>
        <motion.div layout className={`relative flex items-center rounded-[1.25rem] border-2 bg-surface transition-[border-color,box-shadow] duration-300 ${tone}`}>
          <input
            ref={inputRef}
            value={phase === "answer" ? input : typed}
            readOnly={phase !== "answer"}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (phase === "answer") submit();
              else if (accepted) finish({ accepted: true, verdict: result!.verdict });
              else if (!retype) continueAfterWrong();
            }}
            placeholder={lang === "es" ? "Type in Spanish…" : "Type in Polish…"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            lang={lang}
            className={`h-16 w-full bg-transparent px-5 text-xl font-medium outline-none placeholder:text-ink-3/70 ${
              phase === "feedback" && !accepted ? "text-ink-3 line-through decoration-red/60" : ""
            }`}
          />
          <AnimatePresence>
            {phase === "feedback" && (
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={spring.bouncy}
                className={`mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                  result?.verdict === "correct" && !result.missingArticle ? "bg-green" : accepted ? "bg-amber" : "bg-red"
                }`}
              >
                {accepted ? <IconCheck size={20} strokeWidth={3} /> : <IconX size={18} strokeWidth={3} />}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {keysFor === "answer" && lang === "es" && (
          <AccentKeys onKey={(ch) => insert(ch, inputRef.current, input, setInput)} />
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "answer" ? (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-5 flex items-center justify-between gap-3"
          >
            <Button variant="ghost" onClick={() => submit(true)}>
              Don&apos;t know
            </Button>
            <Button variant="primary" size="lg" onClick={() => submit()} className="min-w-36">
              Check <span className="ml-1 hidden opacity-70 sm:inline"><Kbd>↵</Kbd></span>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.gentle}
            className="mt-5"
          >
            {result && (
              <Feedback
                result={result}
                typed={typed}
                note={item.card.note}
                onContinue={() => finish({ accepted: true, verdict: result.verdict })}
              />
            )}
            {!accepted && (
              <div className="mt-4">
                {showRetype && (
                  <div>
                    <div className="mb-2 text-sm font-medium text-ink-3">Type it once to lock it in:</div>
                    <div className="rounded-[1.25rem] border-2 border-line-strong bg-surface focus-within:border-purple">
                      <input
                        ref={retypeRef}
                        autoFocus
                        value={retypeValue}
                        onChange={(e) => setRetypeValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            continueAfterWrong();
                          }
                        }}
                        placeholder={expected}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        lang={lang}
                        className="h-14 w-full bg-transparent px-5 text-lg font-medium outline-none placeholder:text-ink-3/50"
                      />
                    </div>
                    {lang === "es" && (
                      <AccentKeys onKey={(ch) => insert(ch, retypeRef.current, retypeValue, setRetypeValue)} />
                    )}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="ghost" onClick={override} disabled={!typed}>
                    I was right
                  </Button>
                  <div className="flex gap-2">
                    {showRetype && (
                      <Button variant="ghost" onClick={() => finish({ accepted: false, verdict: "wrong" })}>
                        Skip
                      </Button>
                    )}
                    <Button variant="primary" size="lg" onClick={continueAfterWrong} className="min-w-36">
                      Continue <span className="ml-1 hidden opacity-70 sm:inline"><Kbd>↵</Kbd></span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Feedback({
  result,
  typed,
  note,
  onContinue,
}: {
  result: GradeResult;
  typed: string;
  note?: string;
  onContinue: () => void;
}) {
  const perfect = result.verdict === "correct" && !result.missingArticle;
  const config = perfect
    ? { title: pick(["¡Correcto!", "¡Muy bien!", "¡Perfecto!", "¡Genial!", "¡Exacto!"]), cls: "bg-green/10 text-green" }
    : result.verdict === "accent"
      ? { title: "Correct — mind the accents", cls: "bg-amber/12 text-amber" }
      : result.verdict === "typo"
        ? { title: "Almost! Accepted with a typo", cls: "bg-amber/12 text-amber" }
        : result.accepted
          ? { title: "Correct — remember the article", cls: "bg-amber/12 text-amber" }
          : { title: typed ? "Not quite" : "Here's the answer", cls: "bg-red/10 text-red" };

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-[1.25rem] px-5 py-4 ${config.cls}`}
      onClick={result.accepted ? onContinue : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-lg font-bold tracking-tight">{config.title}</div>
        {result.accepted && <span className="hidden text-xs font-medium opacity-70 sm:inline">Enter to continue</span>}
      </div>
      {!perfect && (
        <div className="mt-2 text-ink">
          <div className="text-[13px] font-medium text-ink-3">{result.accepted ? "Correct spelling" : "Correct answer"}</div>
          <div className="mt-0.5 text-2xl font-semibold tracking-tight">
            <Diff segments={showDiff(result, typed) ? result.diff : [{ text: result.expected, ok: true }]} />
          </div>
        </div>
      )}
      {note && (
        <div className="mt-3 flex gap-2 text-[14px] leading-snug text-ink-2">
          <IconLightbulb size={17} className="mt-0.5 shrink-0 text-amber" />
          {note}
        </div>
      )}
      {result.accepted && (
        <motion.div
          className="mt-3 h-[3px] origin-left rounded-full bg-current opacity-30"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: perfect ? (note ? 1.7 : 0.85) : 2.6, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}

/** Letter highlights help with near-misses; for a completely different word they're just noise. */
function showDiff(r: GradeResult, typed: string) {
  if (!typed) return false;
  if (r.accepted) return true;
  const wrong = r.diff.filter((d) => !d.ok).reduce((n, d) => n + d.text.length, 0);
  return wrong / Math.max(1, r.expected.length) <= 0.4;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function Diff({ segments }: { segments: DiffSegment[] }) {
  return (
    <span>
      {segments.map((s, i) =>
        s.ok ? (
          <span key={i}>{s.text}</span>
        ) : (
          <motion.span
            key={i}
            initial={{ backgroundColor: "rgb(255 159 10 / 0)" }}
            animate={{ backgroundColor: "rgb(255 159 10 / 0.28)" }}
            transition={{ delay: 0.15 + i * 0.03 }}
            className="rounded-[0.3em] px-[1px] text-amber underline decoration-amber decoration-2 underline-offset-4"
          >
            {s.text}
          </motion.span>
        ),
      )}
    </span>
  );
}

export function AccentKeys({ onKey }: { onKey: (ch: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
      {SPANISH_KEYS.map((k) => (
        <motion.button
          key={k}
          type="button"
          tabIndex={-1}
          whileTap={{ scale: 0.88, y: 2 }}
          transition={spring.snappy}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onKey(k)}
          className="h-10 w-10 rounded-xl border border-line bg-surface text-lg font-medium text-ink-2 shadow-[0_1px_0_var(--line-strong)] transition-colors hover:text-ink"
        >
          {k}
        </motion.button>
      ))}
    </div>
  );
}
