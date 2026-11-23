import { devotionals } from "@/data/devotionals";
import { getTopicBySlug, getTopicScriptures } from "@/data/topics";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

export const alt = "PraisePage Biblical Topic & Devotional Guide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);

  if (!topic) {
    return createSanctuaryOgResponse({
      eyebrow: "FAITH & SCRIPTURE HUB",
      title: "Biblical Topics & Devotionals",
      subtitle:
        "Discover comforting Scripture passages, guided multi-day reading plans, and prayers for every season.",
      badge: "Topics Directory",
      footerMeta: "PraisePage Topics · Bible · Prayers",
      accent: "gold",
    });
  }

  const matchingPlans = Object.values(devotionals).filter(
    (plan) => plan?.category === topic.category
  );
  const scriptures = getTopicScriptures(topic, matchingPlans);
  const featured = scriptures[0];

  return createSanctuaryOgResponse({
    eyebrow: `TOPIC · ${topic.category.toUpperCase()}`,
    title: topic.headline || topic.seoTitle || topic.name,
    subtitle: featured
      ? `"${featured.verse}" — ${featured.reference}`
      : topic.metaDescription,
    badge: `${matchingPlans.length} Reading ${matchingPlans.length === 1 ? "Plan" : "Plans"}`,
    footerMeta: `Scriptures · Prayer · Devotionals for ${topic.name}`,
    accent: "emerald",
  });
}
