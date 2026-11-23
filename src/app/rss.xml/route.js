import { devotionals } from "@/data/devotionals";
import { posts } from "@/data/posts";
import { getVerseOfTheDay } from "@/data/verses";
import { SITE_URL, stripMarkup, truncateDescription } from "@/lib/seo";
import { getCustomDevotionals, getPublicTestimoniesList } from "@/app/actions/dbActions";

export const revalidate = 3600;

const FALLBACK_STATIC_UTC = "Mon, 23 Nov 2026 00:00:00 GMT";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822Date(value, fallback = FALLBACK_STATIC_UTC) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toUTCString();
}

function extractPostDescription(post) {
  if (post?.excerpt) {
    return truncateDescription(post.excerpt, 240);
  }
  if (Array.isArray(post?.content)) {
    const joined = post.content
      .map((b) => b?.text || (Array.isArray(b?.items) ? b.items.join(" ") : ""))
      .join(" ");
    return truncateDescription(joined, 240);
  }
  return truncateDescription(String(post?.content || ""), 240);
}

export async function GET() {
  const now = new Date();
  const isoDay = now.toISOString().slice(0, 10);
  const votd = getVerseOfTheDay(now);

  // 1. Daily Verse of the Day item
  const votdUrl = `${SITE_URL}/verse-of-the-day`;
  const items = [
    {
      title: `Verse of the Day: ${votd.tag}`,
      link: votdUrl,
      guid: `praisepage-votd-${isoDay}`,
      isPermaLink: false,
      pubDate: new Date(`${isoDay}T00:00:00.000Z`).toUTCString(),
      category: "Verse of the Day",
      description: `"${stripMarkup(votd.verse)}" — ${stripMarkup(votd.tag)}`,
    },
  ];

  // 2. Public community testimonies (with static fallback if DB unreachable)
  let testimonies = [];
  try {
    const dbPosts = await getPublicTestimoniesList(20);
    if (Array.isArray(dbPosts) && dbPosts.length > 0) {
      testimonies = dbPosts;
    }
  } catch (error) {
    console.error("[rss.xml] Public testimonies fallback:", error);
  }
  if (testimonies.length === 0) {
    testimonies = posts.slice(0, 20);
  }

  for (const post of testimonies) {
    if (!post?.id) continue;
    const postUrl = `${SITE_URL}/posts/${encodeURIComponent(post.id)}`;
    items.push({
      title: stripMarkup(post.title || post.id),
      link: postUrl,
      guid: postUrl,
      isPermaLink: true,
      pubDate: toRfc2822Date(post.createdAtRaw || post.date, now.toUTCString()),
      category: stripMarkup(post.tag || (post.id === "post1" ? "Hope" : "Gratitude")),
      description: extractPostDescription(post) || stripMarkup(post.title || ""),
    });
  }

  // 3. Custom & featured devotional plans (deduplicated, up to 15)
  const planMap = new Map();
  try {
    const customRes = await getCustomDevotionals();
    if (customRes?.success && Array.isArray(customRes.plans)) {
      for (const plan of customRes.plans) {
        if (plan?.id && !planMap.has(plan.id)) {
          planMap.set(plan.id, plan);
        }
      }
    }
  } catch (error) {
    console.error("[rss.xml] Custom devotionals fallback:", error);
  }
  for (const plan of Object.values(devotionals)) {
    if (plan?.id && !planMap.has(plan.id)) {
      planMap.set(plan.id, plan);
    }
  }

  const featuredPlans = [...planMap.values()].slice(0, 15);
  for (const plan of featuredPlans) {
    const planUrl = `${SITE_URL}/plans/${encodeURIComponent(plan.id)}`;
    const firstReflection = Array.isArray(plan.days) ? plan.days[0]?.reflection || "" : "";
    const daysLabel = Array.isArray(plan.days) ? `${plan.days.length}-day` : "guided";
    const desc =
      truncateDescription(firstReflection, 220) ||
      `${stripMarkup(plan.title)} — ${daysLabel} ${stripMarkup(plan.category || "Faith")} devotional plan.`;

    items.push({
      title: `${stripMarkup(plan.title || plan.id)} (${daysLabel} devotional)`,
      link: planUrl,
      guid: planUrl,
      isPermaLink: true,
      pubDate: toRfc2822Date(plan.created_at, FALLBACK_STATIC_UTC),
      category: stripMarkup(plan.category || "Devotional Plan"),
      description: desc,
    });
  }

  const itemXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="${item.isPermaLink ? "true" : "false"}">${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.description)}</description>
    </item>`
    )
    .join("\n");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PraisePage — Scripture, Devotionals &amp; Testimonies</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Daily scripture verses, guided Christian devotional plans, and testimonies of faith and gratitude from PraisePage.</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(now.toUTCString())}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>
`;

  return new Response(rssXml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
