import { getPrayersPageData } from "@/app/actions/dbActions";
import PrayersClient from "./PrayersClient";

export default async function PrayersPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const initialTab = resolvedParams?.tab === "answered" ? "answered" : "active";
  const data = await getPrayersPageData(initialTab, 12, 0);

  return (
    <PrayersClient
      initialTab={initialTab}
      initialUser={data.user}
      initialCounts={data.counts || { active: 0, answered: 0 }}
      initialPrayers={data.prayers || []}
    />
  );
}
