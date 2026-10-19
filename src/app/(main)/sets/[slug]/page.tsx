import type { Metadata } from "next";
import { SetView } from "@/components/set/SetView";
import { SetGate } from "@/components/SetGate";
import { getAllSets, getSet } from "@/lib/sets";

export function generateStaticParams() {
  return getAllSets().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/sets/[slug]">): Promise<Metadata> {
  const set = getSet((await params).slug);
  return { title: set?.title ?? "Set" };
}

export default function SetPage({ params }: PageProps<"/sets/[slug]">) {
  return <SetGate params={params} render={(set) => <SetView set={set} />} />;
}
