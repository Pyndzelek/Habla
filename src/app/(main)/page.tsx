import { Dashboard } from "@/components/home/Dashboard";
import { getAllSets, summarize } from "@/lib/sets";

export default function Home() {
  return <Dashboard sets={getAllSets().map(summarize)} />;
}
