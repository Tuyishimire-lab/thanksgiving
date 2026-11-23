export const SITE_URL = "https://www.praisepage.com";
export const SITE_NAME = "PraisePage";
export const DEFAULT_OG_IMAGE = "/assets/images/praisepage.jpeg";

export const SOCIAL_PROFILES = [
  "https://www.instagram.com/praisepage__?igsh=czB1MWpndDM5dmxl",
  "https://www.facebook.com/share/17UGpy6s6P/",
  "https://x.com/praisepage_",
];

export function toAbsoluteUrl(pathOrUrl) {
  if (typeof pathOrUrl !== "string") return SITE_URL;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return SITE_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const normalized = `/${trimmed.replace(/^\/+/, "")}`;
  return `${SITE_URL}${normalized}`;
}

export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function stripMarkup(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`>#~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateDescription(text, maxLen = 155) {
  const clean = stripMarkup(text);
  if (!clean || clean.length <= maxLen) return clean;
  if (maxLen <= 3) return clean.slice(0, Math.max(0, maxLen));
  const slice = clean.slice(0, maxLen - 3);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > Math.floor(slice.length * 0.6)) {
    return `${slice.slice(0, lastSpace).trimEnd()}...`;
  }
  return `${slice.trimEnd()}...`;
}

export function sanitizeArticleHtml(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed\s*>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}
