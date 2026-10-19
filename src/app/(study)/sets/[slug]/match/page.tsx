import type { Metadata } from "next";
import { MatchGame } from "@/components/study/MatchGame";
import { SetGate } from "@/components/SetGate";
import { getAllSets, getSet } from "@/lib/sets";

export function generateStaticParams() {
  return getAllSets().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/sets/[slug]/match">): Promise<Metadata> {
  return { title: `Match · ${getSet((await params).slug)?.title ?? ""}` };
}

export default function MatchPage({ params }: PageProps<"/sets/[slug]/match">) {
  return <SetGate params={params} render={(set) => <MatchGame set={set} />} />;
}
