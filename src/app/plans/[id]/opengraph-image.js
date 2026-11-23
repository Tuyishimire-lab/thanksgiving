import { devotionals } from "@/data/devotionals";
import { getCustomDevotionalById } from "@/app/actions/dbActions";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

export const alt = "PraisePage Guided Devotional Plan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

async function resolvePlanById(id) {
  if (devotionals[id]) {
    return devotionals[id];
  }
  try {
    const res = await getCustomDevotionalById(id);
    if (res?.success && res?.plan) {
      return res.plan;
    }
  } catch (error) {
    console.error("[plans/opengraph-image] Custom devotional fallback:", error);
  }
  return null;
}

export default async function Image({ params }) {
  const { id } = await params;
  const plan = await resolvePlanById(id);

  if (!plan) {
    return createSanctuaryOgResponse({
      eyebrow: "DEVOTIONAL PLAN",
      title: "Guided Scripture Reading Plan",
      subtitle:
        "Walk step-by-step through daily Bible passages, pastoral reflections, and prayer on PraisePage.",
      badge: "Reading Plan",
      footerMeta: "Daily Scripture · Guided Reflections",
      accent: "emerald",
    });
  }

  const days = Array.isArray(plan.days) ? plan.days : [];
  const category = plan.category || "Faith";
  const firstReflection = days[0]?.reflection || "";

  return createSanctuaryOgResponse({
    eyebrow: `DEVOTIONAL · ${category.toUpperCase()}`,
    title: plan.title,
    subtitle:
      firstReflection ||
      `Read this ${days.length}-day ${category} devotional plan with scripture reflections on PraisePage.`,
    badge: `${days.length}-Day Plan`,
    footerMeta: "Daily Scripture · Guided Reflections · PraisePage",
    accent: "emerald",
  });
}
