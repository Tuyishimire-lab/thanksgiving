import { TOPICS } from "@/data/topics";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

export const alt = "PraisePage Faith & Emotion Topics Directory";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return createSanctuaryOgResponse({
    eyebrow: "FAITH & EMOTION DIRECTORY",
    title: `${TOPICS.length} Biblical Topics for Every Season`,
    subtitle:
      "Explore curated Bible verses, guided reading plans, short prayers, and honest answers across life's defining moments.",
    badge: `${TOPICS.length} Guided Hubs`,
    footerMeta: "Gratitude · Anxiety · Peace · Hope · Healing · Joy",
    accent: "sky",
  });
}
