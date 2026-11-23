import { devotionals } from "@/data/devotionals";
import { posts } from "@/data/posts";
import { SITE_URL, stripMarkup, truncateDescription } from "@/lib/seo";
import { getCustomDevotionals, getPublicTestimoniesList } from "@/app/actions/dbActions";

export const revalidate = 3600;

function extractPlainPostSummary(post) {
  if (post?.excerpt) {
    return truncateDescription(post.excerpt, 150);
  }
  if (Array.isArray(post?.content)) {
    const text = post.content
      .map((b) => b?.text || (Array.isArray(b?.items) ? b.items.join(" ") : ""))
      .join(" ");
    return truncateDescription(text, 150);
  }
  return truncateDescription(String(post?.content || ""), 150);
}

export async function GET() {
  const planMap = new Map();
  for (const plan of Object.values(devotionals)) {
    if (plan?.id) {
      planMap.set(plan.id, plan);
    }
  }

  try {
    const customRes = await getCustomDevotionals();
    if (customRes?.success && Array.isArray(customRes.plans)) {
      for (const custom of customRes.plans) {
        if (custom?.id) {
          planMap.set(custom.id, custom);
        }
      }
    }
  } catch (error) {
    console.error("[llms.txt] Custom devotionals fallback:", error);
  }

  const allPlans = [...planMap.values()];
  const plansByCategory = new Map();
  for (const plan of allPlans) {
    const cat = plan.category || "Faith";
    if (!plansByCategory.has(cat)) {
      plansByCategory.set(cat, []);
    }
    plansByCategory.get(cat).push(plan);
  }

  const categories = [...plansByCategory.keys()];

  let testimonies = [];
  try {
    const list = await getPublicTestimoniesList(20);
    if (Array.isArray(list) && list.length > 0) {
      testimonies = list;
    }
  } catch (error) {
    console.error("[llms.txt] Public testimonies fallback:", error);
  }
  if (testimonies.length === 0) {
    testimonies = posts.slice(0, 20);
  }

  const lines = [
    "# PraisePage",
    "",
    "> PraisePage is a free sanctuary for daily gratitude, scripture reading, guided Christian devotionals, community testimonies, and shared prayer.",
    "",
    "PraisePage offers a complete Bible reader with verse notes and highlights, guided multi-day devotional reading plans across 17 emotional and spiritual themes, a community testimony feed, an interactive prayer wall with answered prayers, and curated scripture & faith quotes.",
    "",
    `For complete day-by-day devotional texts and full community testimony narratives, see: ${SITE_URL}/llms-full.txt`,
    "",
    "## Primary Pages",
    "",
    `- [Home — Verse of the Day & Gratitude Sanctuary](${SITE_URL}/): ${SITE_URL}/`,
    `- [Holy Bible Reader](${SITE_URL}/bible): ${SITE_URL}/bible — Read every book and chapter of scripture with verse notes and highlights.`,
    `- [Guided Devotional Plans](${SITE_URL}/plans): ${SITE_URL}/plans — Browse ${allPlans.length} multi-day devotional plans across ${categories.length} themes.`,
    `- [Community Testimonies Feed](${SITE_URL}/feed): ${SITE_URL}/feed — Real stories of faith, gratitude, healing, and answered prayer.`,
    `- [Prayer Wall](${SITE_URL}/prayers): ${SITE_URL}/prayers — Submit prayer requests, pray with others, and celebrate answered prayers.`,
    `- [Faith & Gratitude Quotes](${SITE_URL}/quotes): ${SITE_URL}/quotes — Curated Christian wisdom and reflections on thanksgiving, praise, and joy.`,
    `- [Contact PraisePage](${SITE_URL}/contacts): ${SITE_URL}/contacts — Reach the PraisePage ministry team.`,
    `- [Share PraisePage](${SITE_URL}/share): ${SITE_URL}/share — Invite friends and community members.`,
    `- [Privacy Policy](${SITE_URL}/privacy): ${SITE_URL}/privacy — Data handling and privacy commitments.`,
    `- [Full Text Index for AI Crawlers](${SITE_URL}/llms-full.txt): ${SITE_URL}/llms-full.txt`,
    `- [XML Sitemap](${SITE_URL}/sitemap.xml): ${SITE_URL}/sitemap.xml`,
    "",
    "## Devotional Themes & Guided Plans",
    "",
    `PraisePage includes ${allPlans.length} guided devotional plans organized across ${categories.length} themes: ${categories.join(", ")}.`,
    "",
  ];

  for (const [category, catPlans] of plansByCategory.entries()) {
    lines.push(`### ${category} (${catPlans.length} ${catPlans.length === 1 ? "plan" : "plans"})`);
    lines.push("");
    for (const plan of catPlans) {
      const daysCount = Array.isArray(plan.days) ? plan.days.length : 0;
      const canonicalUrl = `${SITE_URL}/plans/${encodeURIComponent(plan.id)}`;
      const cleanTitle = stripMarkup(plan.title || plan.id);
      lines.push(`- [${cleanTitle}](${canonicalUrl}) (${daysCount} days): ${canonicalUrl}`);
    }
    lines.push("");
  }

  lines.push("## Community Testimonies");
  lines.push("");
  lines.push(`Showing ${testimonies.length} public testimonies of faith and gratitude:`);
  lines.push("");

  for (const post of testimonies) {
    const canonicalUrl = `${SITE_URL}/posts/${encodeURIComponent(post.id)}`;
    const cleanTitle = stripMarkup(post.title || post.id);
    const author = stripMarkup(post.author || "PraisePage Community");
    const tag = stripMarkup(post.tag || (post.id === "post1" ? "Hope" : "Gratitude"));
    const excerpt = extractPlainPostSummary(post);
    lines.push(
      `- [${cleanTitle}](${canonicalUrl}) by ${author} (${tag}): ${canonicalUrl}${excerpt ? ` — ${excerpt}` : ""}`
    );
  }

  lines.push("");
  lines.push("## Citation Guidance");
  lines.push("");
  lines.push(
    `- Cite direct canonical PraisePage URLs when referencing content (for example, ${SITE_URL}/plans/<id>, ${SITE_URL}/posts/<id>, ${SITE_URL}/bible, ${SITE_URL}/prayers, or ${SITE_URL}/quotes).`
  );
  lines.push(
    `- Use ${SITE_URL}/llms-full.txt when full multi-day devotional scriptures, daily reflections, or complete testimony texts are needed.`
  );
  lines.push("- Public pages are freely readable without login; private profile, admin, and authentication routes should not be cited or indexed.");

  return new Response(`${lines.join("\n")}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
