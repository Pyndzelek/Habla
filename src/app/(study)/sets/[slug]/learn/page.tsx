import type { Metadata } from "next";
import { StudySession } from "@/components/study/StudySession";
import { SetGate } from "@/components/SetGate";
import { getAllSets, getSet } from "@/lib/sets";

export function generateStaticParams() {
  return getAllSets().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/sets/[slug]/learn">): Promise<Metadata> {
  return { title: `Learn · ${getSet((await params).slug)?.title ?? ""}` };
}

export default function LearnPage({ params }: PageProps<"/sets/[slug]/learn">) {
  return <SetGate params={params} render={(set) => <StudySession mode="learn" sets={[set]} backHref={`/sets/${set.slug}`} />} />;
}
