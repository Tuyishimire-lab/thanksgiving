import { getVerseOfTheDay } from "@/data/verses";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

export const revalidate = 3600;
export const alt = "PraisePage Verse of the Day";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const votd = getVerseOfTheDay(new Date());

  return createSanctuaryOgResponse({
    eyebrow: "VERSE OF THE DAY",
    title: `"${votd.verse}"`,
    subtitle: `${votd.tag} — Reflect, pray, and open the full passage inside the PraisePage Bible Reader.`,
    badge: `Day ${votd.dayOfYear}`,
    footerMeta: "Daily Scripture · Reflection Prompt · 7-Day Archive",
    accent: "amber",
  });
}
