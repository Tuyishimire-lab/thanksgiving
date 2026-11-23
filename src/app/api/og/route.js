import { getBookByName, normalizeTranslation } from "@/data/bibleParser";
import {
  DEFAULT_HOME_OG_CONFIG,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

const ALLOWED_TYPES = new Set(["bible", "feed", "plans", "prayers", "quotes", "home"]);

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
};

const STATIC_CARD_CONFIGS = {
  home: DEFAULT_HOME_OG_CONFIG,
  feed: {
    eyebrow: "COMMUNITY FEED",
    title: "Voices of Gratitude & Faith",
    subtitle:
      "Read heartfelt stories of answered prayer, healing, courage, and daily thanksgiving shared by the community.",
    badge: "Community Stories",
    footerMeta: "Share Your Testimony · Encourage Believers",
    accent: "gold",
  },
  plans: {
    eyebrow: "DEVOTIONAL LIBRARY",
    title: "Guided Bible Reading Plans",
    subtitle:
      "Explore 51 multi-day devotional journeys across 17 emotional and spiritual themes anchored in Scripture.",
    badge: "51 Plans · 17 Themes",
    footerMeta: "Daily Scripture · Reflections · Milestones",
    accent: "emerald",
  },
  prayers: {
    eyebrow: "COMMUNITY PRAYER WALL",
    title: "Carry One Another in Prayer",
    subtitle:
      "Submit prayer requests, stand in faith with others, and celebrate testimonies of answered prayer.",
    badge: "Shared Prayer",
    footerMeta: "Prayer Requests · Encouragements · Answered Prayers",
    accent: "amber",
  },
  quotes: {
    eyebrow: "FAITH & WISDOM QUOTES",
    title: "Timeless Words of Praise & Trust",
    subtitle:
      "Curated Christian reflections and quotes celebrating gratitude, harvest, love, justice, and salvation.",
    badge: "6 Quote Themes",
    footerMeta: "Daily Inspiration · Scripture Wisdom",
    accent: "gold",
  },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawType = (searchParams.get("type") || "home").trim().toLowerCase();
  const type = ALLOWED_TYPES.has(rawType) ? rawType : "home";

  if (type === "bible") {
    const bookObj = getBookByName(searchParams.get("book"));
    const translation = normalizeTranslation(searchParams.get("translation"));
    const trUpper = translation.toUpperCase();

    if (!bookObj) {
      return createSanctuaryOgResponse({
        eyebrow: "HOLY BIBLE READER",
        title: `Read Scripture (${trUpper})`,
        subtitle:
          "Browse all 66 books of the Holy Bible across four classic translations with verse highlights and notes.",
        badge: `${trUpper} Translation`,
        footerMeta: "66 Books · Highlights · Personal Notes",
        accent: "sky",
        headers: CACHE_HEADERS,
      });
    }

    const parsedCh = Number.parseInt(searchParams.get("chapter") || "1", 10);
    const boundedChapter =
      Number.isInteger(parsedCh) && parsedCh >= 1
        ? Math.min(150, bookObj.chapters, parsedCh)
        : 1;

    return createSanctuaryOgResponse({
      eyebrow: "HOLY BIBLE READER",
      title: `${bookObj.name} Chapter ${boundedChapter}`,
      subtitle: `Read ${bookObj.name} ${boundedChapter} in the ${trUpper} translation with clean typography, highlights, and personal notes.`,
      badge: `${trUpper} · ${bookObj.chapters} Ch.`,
      footerMeta: "66 Books · Highlights · Personal Notes",
      accent: "sky",
      headers: CACHE_HEADERS,
    });
  }

  return createSanctuaryOgResponse({
    ...(STATIC_CARD_CONFIGS[type] || DEFAULT_HOME_OG_CONFIG),
    headers: CACHE_HEADERS,
  });
}
