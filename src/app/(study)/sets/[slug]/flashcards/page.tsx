import type { Metadata } from "next";
import { Flashcards } from "@/components/study/Flashcards";
import { SetGate } from "@/components/SetGate";
import { getAllSets, getSet } from "@/lib/sets";

export function generateStaticParams() {
  return getAllSets().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/sets/[slug]/flashcards">): Promise<Metadata> {
  return { title: `Flashcards · ${getSet((await params).slug)?.title ?? ""}` };
}

export default function FlashcardsPage({ params }: PageProps<"/sets/[slug]/flashcards">) {
  return <SetGate params={params} render={(set) => <Flashcards set={set} />} />;
}
