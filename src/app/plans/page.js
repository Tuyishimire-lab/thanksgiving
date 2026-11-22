import { devotionals } from "@/data/devotionals";
import {
  getPlansDashboardData,
  getCustomDevotionalSummaries,
} from "@/app/actions/dbActions";
import PlansClient from "./PlansClient";

const PREFERRED_CATEGORY_ORDER = [
  "Gratitude",
  "Peace",
  "Joy",
  "Hope",
  "Love",
  "Fear",
  "Anxiety",
  "Patience",
  "Stress",
  "Healing",
  "Loss",
  "Anger",
  "Depression",
  "Doubt",
  "Temptation",
  "Jealousy",
  "Pride",
];

function interleaveByCategory(items) {
  const buckets = new Map();
  for (const item of items) {
    const key = item.category || "Other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  const orderedKeys = [
    ...PREFERRED_CATEGORY_ORDER.filter((k) => buckets.has(k)),
    ...[...buckets.keys()].filter((k) => !PREFERRED_CATEGORY_ORDER.includes(k)),
  ];

  const result = [];
  let idx = 0;
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const key of orderedKeys) {
      const list = buckets.get(key);
      if (idx < list.length) {
        result.push(list[idx]);
        remaining = true;
      }
    }
    idx += 1;
  }
  return result;
}

export default async function PlansPage() {
  const [dashboardData, customRes] = await Promise.all([
    getPlansDashboardData(),
    getCustomDevotionalSummaries(),
  ]);

  const rawSummaries = Object.values(devotionals).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    daysCount: p.days?.length || 0,
    firstDayReflection: p.days?.[0]?.reflection || "",
    image: p.image || "",
    isCustom: false,
  }));

  const flagshipPlans = rawSummaries.filter((p) => !p.id.includes("_"));
  const thematicPlans = rawSummaries.filter((p) => p.id.includes("_"));
  const staticSummaries = [
    ...interleaveByCategory(flagshipPlans),
    ...interleaveByCategory(thematicPlans),
  ];

  const customSummaries =
    customRes?.success && Array.isArray(customRes.plans) ? customRes.plans : [];
  const customIds = new Set(customSummaries.map((p) => p.id));

  const plansList = [
    ...staticSummaries.filter((p) => !customIds.has(p.id)),
    ...customSummaries,
  ];

  return (
    <PlansClient
      initialUser={dashboardData.user}
      initialProgress={dashboardData.progress || {}}
      initialSavedPlans={dashboardData.savedPlans || []}
      plansList={plansList}
    />
  );
}
