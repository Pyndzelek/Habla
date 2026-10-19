"use client";

import { useSearchParams } from "next/navigation";
import type { StudySet } from "@/lib/types";
import { StudySession } from "./StudySession";

/** Review everything that's due, or only one set with `?set=<slug>`. */
export function ReviewEntry({ sets }: { sets: StudySet[] }) {
  const slug = useSearchParams().get("set");
  const only = slug ? sets.filter((s) => s.slug === slug) : [];
  const scoped = only.length > 0;
  return (
    <StudySession
      key={slug ?? "all"}
      mode="review"
      sets={scoped ? only : sets}
      backHref={scoped ? `/sets/${slug}` : "/"}
      title={scoped ? `Review · ${only[0].title}` : "Review"}
    />
  );
}
