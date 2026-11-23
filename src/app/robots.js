import { SITE_URL } from "@/lib/seo";

const SHARED_ALLOW = [
  "/",
  "/api/media/",
  "/llms.txt",
  "/llms-full.txt",
  "/rss.xml",
  "/indexnow-key.txt",
];
const SHARED_DISALLOW = ["/profile", "/login", "/signup", "/admin", "/offline", "/api/"];

const CRAWLER_USER_AGENTS = [
  "*",
  "OAI-SearchBot",
  "PerplexityBot",
  "Claude-SearchBot",
  "GPTBot",
  "Google-Extended",
];

export default function robots() {
  return {
    rules: CRAWLER_USER_AGENTS.map((userAgent) => ({
      userAgent,
      allow: SHARED_ALLOW,
      disallow: SHARED_DISALLOW,
    })),
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
