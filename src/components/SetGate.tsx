import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSet } from "@/lib/sets";
import type { StudySet } from "@/lib/types";

async function Resolve({ params, render }: { params: Promise<{ slug: string }>; render: (set: StudySet) => React.ReactNode }) {
  const set = getSet((await params).slug);
  if (!set) notFound();
  return render(set);
}

/** Resolves the `[slug]` param inside Suspense so navigation can start instantly. */
export function SetGate(props: { params: Promise<{ slug: string }>; render: (set: StudySet) => React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-[60dvh]" />}>
      <Resolve {...props} />
    </Suspense>
  );
}
