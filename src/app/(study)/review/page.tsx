import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewEntry } from "@/components/study/ReviewEntry";
import { getAllSets } from "@/lib/sets";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewEntry sets={getAllSets()} />
    </Suspense>
  );
}
