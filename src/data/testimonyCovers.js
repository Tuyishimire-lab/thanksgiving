export const TESTIMONY_COVER_PRESETS = [
  {
    id: "gratitude-dawn-journal",
    label: "Dawn Journal",
    themes: ["Gratitude", "Peace"],
    url: "/assets/images/testimonies/gratitude-dawn-journal.png",
    kind: "photo",
  },
  {
    id: "gratitude-lifted-hands",
    label: "Lifted Hands",
    themes: ["Gratitude", "Answered Prayer", "Joy"],
    url: "/assets/images/testimonies/gratitude-lifted-hands.png",
    kind: "photo",
  },
  {
    id: "hope-open-scripture",
    label: "Open Scripture",
    themes: ["Hope", "Patience", "Gratitude"],
    url: "/assets/images/testimonies/hope-open-scripture.png",
    kind: "photo",
  },
  {
    id: "answered-prayer-candles",
    label: "Prayer Candles",
    themes: ["Answered Prayer", "Peace", "Hope"],
    url: "/assets/images/testimonies/answered-prayer-candles.png",
    kind: "photo",
  },
  {
    id: "strength-mountain-sunrise",
    label: "Mountain Sunrise",
    themes: ["Strength", "Hope", "Healing"],
    url: "/assets/images/testimonies/strength-mountain-sunrise.png",
    kind: "photo",
  },
  {
    id: "joy-golden-fields",
    label: "Golden Fields",
    themes: ["Joy", "Gratitude", "Love"],
    url: "/assets/images/testimonies/joy-golden-fields.png",
    kind: "photo",
  },
  {
    id: "gratitude-harvest",
    label: "Harvest Wheat",
    themes: ["Gratitude", "Answered Prayer"],
    url: "/assets/images/plans/gratitude-harvest.png",
    kind: "photo",
  },
  {
    id: "gratitude-morning-cup",
    label: "Morning Cup",
    themes: ["Gratitude", "Peace"],
    url: "/assets/images/plans/gratitude-morning-cup.png",
    kind: "photo",
  },
  {
    id: "gratitude-quiet-path",
    label: "Quiet Meadow Path",
    themes: ["Gratitude", "Patience"],
    url: "/assets/images/plans/gratitude-quiet-path.png",
    kind: "photo",
  },
  {
    id: "hope-dawn-horizon",
    label: "Dawn Horizon",
    themes: ["Hope", "Strength"],
    url: "/assets/images/plans/hope-dawn-horizon.png",
    kind: "photo",
  },
  {
    id: "fear-lighthouse-storm",
    label: "Storm Lighthouse",
    themes: ["Strength", "Hope"],
    url: "/assets/images/plans/fear-lighthouse-storm.png",
    kind: "photo",
  },
  {
    id: "doubt-ancient-compass",
    label: "Ancient Compass",
    themes: ["Patience", "Hope"],
    url: "/assets/images/plans/doubt-ancient-compass.png",
    kind: "photo",
  },
  {
    id: "love-lanterns",
    label: "Evening Lanterns",
    themes: ["Love", "Peace"],
    url: "/assets/images/plans/love-lanterns.png",
    kind: "photo",
  },
  {
    id: "love-helping-hands",
    label: "Helping Hands",
    themes: ["Love", "Answered Prayer"],
    url: "/assets/images/plans/love-helping-hands.png",
    kind: "photo",
  },
  {
    id: "healing-golden-kintsugi",
    label: "Golden Kintsugi",
    themes: ["Healing", "Strength", "Love"],
    url: "/assets/images/plans/healing-golden-kintsugi.png",
    kind: "photo",
  },
  {
    id: "healing-sunrise-forest",
    label: "Sunrise Forest",
    themes: ["Healing", "Strength"],
    url: "/assets/images/plans/healing-sunrise-forest.png",
    kind: "photo",
  },
  {
    id: "patience-seedling-dawn",
    label: "Seedling at Dawn",
    themes: ["Patience", "Healing"],
    url: "/assets/images/plans/patience-seedling-dawn.png",
    kind: "photo",
  },
  {
    id: "peace-olive-branch",
    label: "Olive Branch Dawn",
    themes: ["Peace", "Patience", "Love"],
    url: "/assets/images/plans/peace-olive-branch.png",
    kind: "photo",
  },
  {
    id: "joy-sunlit-meadow",
    label: "Sunlit Meadow",
    themes: ["Joy", "Love"],
    url: "/assets/images/plans/joy-sunlit-meadow.png",
    kind: "photo",
  },
  {
    id: "anxiety-still-lake",
    label: "Still Alpine Lake",
    themes: ["Peace", "Healing"],
    url: "/assets/images/plans/anxiety-still-lake.png",
    kind: "photo",
  },
  {
    id: "loss-twilight-stars",
    label: "Twilight Stars",
    themes: ["Healing", "Answered Prayer"],
    url: "/assets/images/plans/loss-twilight-stars.png",
    kind: "photo",
  },
  {
    id: "depression-candle-sanctuary",
    label: "Sanctuary Candle",
    themes: ["Answered Prayer", "Patience"],
    url: "/assets/images/plans/depression-candle-sanctuary.png",
    kind: "photo",
  },
  {
    id: "texture-gold-watercolor",
    label: "Gold Watercolor",
    themes: ["Gratitude", "Joy"],
    url: "/assets/images/card_bgs/gold_watercolor.png",
    kind: "texture",
  },
  {
    id: "texture-marble-gold",
    label: "Marble & Gold",
    themes: ["Hope", "Answered Prayer"],
    url: "/assets/images/card_bgs/marble_gold.png",
    kind: "texture",
  },
  {
    id: "texture-moody-forest",
    label: "Moody Sanctuary Forest",
    themes: ["Strength", "Peace"],
    url: "/assets/images/card_bgs/moody_forest.png",
    kind: "texture",
  },
  {
    id: "texture-autumn-leaves",
    label: "Warm Autumn Leaves",
    themes: ["Love", "Patience", "Joy"],
    url: "/assets/images/card_bgs/autumn_leaves.png",
    kind: "texture",
  },
];

export const LEGACY_FEATURED_IMAGES = new Set([
  "/assets/images/featured/featured-1.jpg",
  "/assets/images/featured/featured-2.jpg",
]);

const UPLOADED_MEDIA_URL_RE = /^\/api\/media\/med_[a-f0-9-]{8,64}$/;
const STATIC_COVER_URL_RE = /^\/assets\/images\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp)$/;

export function getThemeCovers(tag = "Gratitude") {
  const needle = String(tag || "").trim().replace(/^#/, "").toLowerCase();
  if (needle) {
    const matches = TESTIMONY_COVER_PRESETS.filter((preset) =>
      preset.themes.some((theme) => theme.toLowerCase() === needle)
    );
    if (matches.length > 0) return matches;
  }
  return TESTIMONY_COVER_PRESETS.filter((preset) =>
    preset.themes.some((theme) => theme === "Gratitude" || theme === "Hope")
  );
}

export function getDefaultTestimonyCover(tag = "Gratitude", offset = 0) {
  const matches = getThemeCovers(tag);
  const safeOffset = Number.isFinite(Number(offset)) ? Math.abs(Math.trunc(Number(offset))) : 0;
  return matches[safeOffset % matches.length].url;
}

export function isUploadedMediaUrl(url) {
  return typeof url === "string" && UPLOADED_MEDIA_URL_RE.test(url);
}

export function isSafeTestimonyCoverUrl(url) {
  if (typeof url !== "string") return false;
  if (isUploadedMediaUrl(url)) return true;
  if (url.includes("..")) return false;
  return STATIC_COVER_URL_RE.test(url);
}

export function shouldBypassNextImageOpt(src) {
  return (
    typeof src !== "string" ||
    !src.startsWith("/") ||
    src.startsWith("//") ||
    src.startsWith("/api/media/") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  );
}

export function estimateReadTime(text) {
  if (typeof text !== "string") return "1 Min read";
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`>#~]+/g, " ")
    .trim();
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  return `${Math.max(1, Math.ceil(words / 200))} Min read`;
}
