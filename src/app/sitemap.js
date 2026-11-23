import { posts } from "@/data/posts";
import { devotionals } from "@/data/devotionals";
import { bibleBooks } from "@/data/bibleBooks";
import { TOPICS } from "@/data/topics";
import { SITE_URL } from "@/lib/seo";
import { getCustomDevotionals, getPublicTestimoniesList } from "@/app/actions/dbActions";

export const revalidate = 3600;

const STATIC_LAST_MODIFIED = "2026-11-23T00:00:00.000Z";

function toSafeIsoDate(value) {
  if (!value) return STATIC_LAST_MODIFIED;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? STATIC_LAST_MODIFIED : parsed.toISOString();
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function sitemap() {
  const staticRoutes = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/verse-of-the-day", changeFrequency: "daily", priority: 0.9 },
    { path: "/topics", changeFrequency: "weekly", priority: 0.9 },
    { path: "/bible", changeFrequency: "weekly", priority: 0.8 },
    { path: "/plans", changeFrequency: "weekly", priority: 0.8 },
    { path: "/feed", changeFrequency: "weekly", priority: 0.8 },
    { path: "/prayers", changeFrequency: "weekly", priority: 0.8 },
    { path: "/quotes", changeFrequency: "weekly", priority: 0.8 },
    { path: "/contacts", changeFrequency: "monthly", priority: 0.4 },
    { path: "/share", changeFrequency: "monthly", priority: 0.4 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];

  const staticUrls = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const topicUrls = TOPICS.map((topic) => ({
    url: `${SITE_URL}/topics/${encodeURIComponent(topic.slug)}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // Static devotional plans
  const staticPlanIds = new Set(Object.keys(devotionals));
  const staticPlanUrls = [...staticPlanIds].map((key) => ({
    url: `${SITE_URL}/plans/${encodeURIComponent(key)}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Custom devotional plans from database (deduplicated against static plan IDs)
  const customPlanUrls = [];
  const seenCustomIds = new Set();
  try {
    const customRes = await getCustomDevotionals();
    if (customRes?.success && Array.isArray(customRes.plans)) {
      for (const plan of customRes.plans) {
        if (!plan?.id || staticPlanIds.has(plan.id) || seenCustomIds.has(plan.id)) {
          continue;
        }
        seenCustomIds.add(plan.id);
        customPlanUrls.push({
          url: `${SITE_URL}/plans/${encodeURIComponent(plan.id)}`,
          lastModified: toSafeIsoDate(plan.created_at),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching custom devotionals for sitemap:", error);
  }

  // Public community testimonies + static posts (deduplicated by ID)
  const mergedPosts = [];
  const seenPostIds = new Set();
  try {
    const dbPosts = await getPublicTestimoniesList();
    if (Array.isArray(dbPosts)) {
      for (const post of dbPosts) {
        if (post?.id && !seenPostIds.has(post.id)) {
          seenPostIds.add(post.id);
          mergedPosts.push(post);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching public testimonies for sitemap:", error);
  }
  for (const post of posts) {
    if (post?.id && !seenPostIds.has(post.id)) {
      seenPostIds.add(post.id);
      mergedPosts.push(post);
    }
  }

  const postUrls = mergedPosts.map((post) => ({
    url: `${SITE_URL}/posts/${encodeURIComponent(post.id)}`,
    lastModified: toSafeIsoDate(post.createdAtRaw || post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Bible books and chapters (escape XML entities because Next.js resolveSitemap writes url raw into <loc>)
  const bibleUrls = [];
  for (const book of bibleBooks) {
    for (let c = 1; c <= book.chapters; c++) {
      bibleUrls.push({
        url: `${SITE_URL}/bible?book=${encodeURIComponent(book.name)}&chapter=${c}`,
        lastModified: STATIC_LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  const entries = [
    ...staticUrls,
    ...topicUrls,
    ...staticPlanUrls,
    ...customPlanUrls,
    ...postUrls,
    ...bibleUrls,
  ];

  return entries.map((entry) => ({
    ...entry,
    url: escapeXml(entry.url),
  }));
}
