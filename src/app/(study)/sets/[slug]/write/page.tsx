import type { Metadata } from "next";
import { StudySession } from "@/components/study/StudySession";
import { SetGate } from "@/components/SetGate";
import { getAllSets, getSet } from "@/lib/sets";

export function generateStaticParams() {
  return getAllSets().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/sets/[slug]/write">): Promise<Metadata> {
  return { title: `Write · ${getSet((await params).slug)?.title ?? ""}` };
}

export default function WritePage({ params }: PageProps<"/sets/[slug]/write">) {
  return <SetGate params={params} render={(set) => <StudySession mode="write" sets={[set]} backHref={`/sets/${set.slug}`} />} />;
}
