import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  DEFAULT_HOME_OG_CONFIG,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

export const alt = "PraisePage — Daily Gratitude, Scripture & Devotional Sanctuary";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return createSanctuaryOgResponse(DEFAULT_HOME_OG_CONFIG);
}
