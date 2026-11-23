import { SITE_URL, toAbsoluteUrl } from "@/lib/seo";

export const DEFAULT_INDEXNOW_KEY = "1f0ed3d8617a44cbb1fcb9aa32c758e1";

export function getIndexNowKey() {
  return (process.env.INDEXNOW_KEY || "").trim() || DEFAULT_INDEXNOW_KEY;
}

export function isIndexNowConfigured() {
  return Boolean(getIndexNowKey());
}

export async function pingIndexNow(urls = []) {
  const key = getIndexNowKey();
  if (!key || process.env.NODE_ENV === "test" || !Array.isArray(urls) || urls.length === 0) {
    return { skipped: true };
  }

  const seen = new Set();
  const urlList = [];

  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const abs = toAbsoluteUrl(trimmed);
    if (abs !== SITE_URL && !abs.startsWith(`${SITE_URL}/`)) {
      continue;
    }

    if (!seen.has(abs)) {
      seen.add(abs);
      urlList.push(abs);
      if (urlList.length >= 50) break;
    }
  }

  if (urlList.length === 0) {
    return { skipped: true };
  }

  try {
    const host = new URL(SITE_URL).host;
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/indexnow-key.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(3500),
    });

    return { ok: response.ok, status: response.status, submitted: urlList.length };
  } catch (error) {
    return { ok: false, error: error?.message || "IndexNow ping failed", submitted: 0 };
  }
}
