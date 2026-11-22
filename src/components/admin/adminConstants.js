export const ADMIN_PLAN_CATEGORIES = [
  "Gratitude",
  "Love",
  "Anxiety",
  "Healing",
  "Anger",
  "Hope",
  "Depression",
  "Fear",
  "Peace",
  "Stress",
  "Patience",
  "Loss",
  "Jealousy",
  "Joy",
  "Temptation",
  "Pride",
  "Doubt",
];

export const PLAN_COVER_PRESETS = [
  {
    label: "Harvest Wheat",
    category: "Gratitude",
    url: "/assets/images/plans/gratitude-harvest.png",
  },
  {
    label: "Morning Cup",
    category: "Gratitude",
    url: "/assets/images/plans/gratitude-morning-cup.png",
  },
  {
    label: "Quiet Meadow Path",
    category: "Gratitude",
    url: "/assets/images/plans/gratitude-quiet-path.png",
  },
  {
    label: "Evening Lanterns",
    category: "Love",
    url: "/assets/images/plans/love-lanterns.png",
  },
  {
    label: "Helping Hands",
    category: "Love",
    url: "/assets/images/plans/love-helping-hands.png",
  },
  {
    label: "Still Alpine Lake",
    category: "Anxiety",
    url: "/assets/images/plans/anxiety-still-lake.png",
  },
  {
    label: "Shepherd Valley",
    category: "Anxiety",
    url: "/assets/images/plans/anxiety-shepherd-valley.png",
  },
  {
    label: "Sunrise Forest",
    category: "Healing",
    url: "/assets/images/plans/healing-sunrise-forest.png",
  },
  {
    label: "Golden Kintsugi",
    category: "Healing",
    url: "/assets/images/plans/healing-golden-kintsugi.png",
  },
  {
    label: "Calm Twilight Waters",
    category: "Anger",
    url: "/assets/images/plans/anger-calm-waters.png",
  },
  {
    label: "Dawn Horizon",
    category: "Hope",
    url: "/assets/images/plans/hope-dawn-horizon.png",
  },
  {
    label: "Sanctuary Candle",
    category: "Depression",
    url: "/assets/images/plans/depression-candle-sanctuary.png",
  },
  {
    label: "Storm Lighthouse",
    category: "Fear",
    url: "/assets/images/plans/fear-lighthouse-storm.png",
  },
  {
    label: "Olive Branch Dawn",
    category: "Peace",
    url: "/assets/images/plans/peace-olive-branch.png",
  },
  {
    label: "Quiet Sanctuary Window",
    category: "Stress",
    url: "/assets/images/plans/stress-quiet-sanctuary.png",
  },
  {
    label: "Seedling at Dawn",
    category: "Patience",
    url: "/assets/images/plans/patience-seedling-dawn.png",
  },
  {
    label: "Twilight Stars",
    category: "Loss",
    url: "/assets/images/plans/loss-twilight-stars.png",
  },
  {
    label: "Wildflower Meadow",
    category: "Jealousy",
    url: "/assets/images/plans/jealousy-wildflower-field.png",
  },
  {
    label: "Sunlit Spring Meadow",
    category: "Joy",
    url: "/assets/images/plans/joy-sunlit-meadow.png",
  },
  {
    label: "Narrow Ridge Trail",
    category: "Temptation",
    url: "/assets/images/plans/temptation-narrow-trail.png",
  },
  {
    label: "Humble Valley Stream",
    category: "Pride",
    url: "/assets/images/plans/pride-humble-valley.png",
  },
  {
    label: "Ancient Compass",
    category: "Doubt",
    url: "/assets/images/plans/doubt-ancient-compass.png",
  },
];

const DEFAULT_CATEGORY_COVERS = {
  Gratitude: "/assets/images/plans/gratitude-harvest.png",
  Love: "/assets/images/plans/love-lanterns.png",
  Anxiety: "/assets/images/plans/anxiety-still-lake.png",
  Healing: "/assets/images/plans/healing-sunrise-forest.png",
  Strength: "/assets/images/plans/healing-golden-kintsugi.png",
  Anger: "/assets/images/plans/anger-calm-waters.png",
  Hope: "/assets/images/plans/hope-dawn-horizon.png",
  Depression: "/assets/images/plans/depression-candle-sanctuary.png",
  Fear: "/assets/images/plans/fear-lighthouse-storm.png",
  Peace: "/assets/images/plans/peace-olive-branch.png",
  Stress: "/assets/images/plans/stress-quiet-sanctuary.png",
  Patience: "/assets/images/plans/patience-seedling-dawn.png",
  Loss: "/assets/images/plans/loss-twilight-stars.png",
  Jealousy: "/assets/images/plans/jealousy-wildflower-field.png",
  Joy: "/assets/images/plans/joy-sunlit-meadow.png",
  Temptation: "/assets/images/plans/temptation-narrow-trail.png",
  Pride: "/assets/images/plans/pride-humble-valley.png",
  Doubt: "/assets/images/plans/doubt-ancient-compass.png",
};

export function getDefaultPlanCover(category) {
  return DEFAULT_CATEGORY_COVERS[category] || "/assets/images/plans/hope-dawn-horizon.png";
}

export function isSafeImageUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  const lower = trimmed.toLowerCase();
  return lower.startsWith("https://") || lower.startsWith("http://");
}

export function sanitizeAdminHtml(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}
