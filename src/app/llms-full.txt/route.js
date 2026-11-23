import { devotionals } from "@/data/devotionals";
import { posts } from "@/data/posts";
import { SITE_URL, stripMarkup } from "@/lib/seo";
import { getCustomDevotionals, getPublicTestimoniesList } from "@/app/actions/dbActions";

export const revalidate = 3600;

function formatContentBlocksToPlainMarkdown(content) {
  if (Array.isArray(content)) {
    const blocks = [];
    for (const block of content) {
      if (!block) continue;
      if (block.type === "blockquote" && block.text) {
        blocks.push(`> ${stripMarkup(block.text)}`);
      } else if (block.type === "list" && Array.isArray(block.items)) {
        for (const item of block.items) {
          const cleanItem = stripMarkup(String(item || ""));
          if (cleanItem) blocks.push(`- ${cleanItem}`);
        }
      } else if (block.type === "heading" && block.text) {
        blocks.push(`#### ${stripMarkup(block.text)}`);
      } else if (block.text) {
        const cleanText = stripMarkup(block.text);
        if (cleanText) blocks.push(cleanText);
      }
    }
    return blocks.join("\n\n");
  }

  if (typeof content === "string") {
    return stripMarkup(content);
  }

  return "";
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
    console.error("[llms-full.txt] Custom devotionals fallback:", error);
  }

  const allPlans = [...planMap.values()];

  const postMap = new Map();
  try {
    const dbPosts = await getPublicTestimoniesList();
    if (Array.isArray(dbPosts)) {
      for (const post of dbPosts) {
        if (post?.id && !postMap.has(post.id)) {
          postMap.set(post.id, post);
        }
      }
    }
  } catch (error) {
    console.error("[llms-full.txt] Public testimonies fallback:", error);
  }
  for (const post of posts) {
    if (post?.id && !postMap.has(post.id)) {
      postMap.set(post.id, post);
    }
  }
  const allPosts = [...postMap.values()];

  const lines = [
    "# PraisePage — Full Devotional Plans & Community Testimonies",
    "",
    `Canonical Site: ${SITE_URL}`,
    `Summary Index: ${SITE_URL}/llms.txt`,
    "",
    `This document contains the full text of ${allPlans.length} devotional reading plans and ${allPosts.length} community testimonies published on PraisePage.`,
    "",
  ];

  for (const plan of allPlans) {
    const planUrl = `${SITE_URL}/plans/${encodeURIComponent(plan.id)}`;
    lines.push("---");
    lines.push("");
    lines.push(`## Devotional Plan: ${stripMarkup(plan.title || plan.id)}`);
    lines.push(`Category: ${stripMarkup(plan.category || "Faith")}`);
    lines.push(`Identifier: ${plan.id}`);
    lines.push(`URL: ${planUrl}`);
    lines.push("");

    const days = Array.isArray(plan.days) ? plan.days : [];
    days.forEach((day, idx) => {
      const dayNum = day?.day || idx + 1;
      const dayTitle = stripMarkup(day?.title || `Day ${dayNum}`);
      const reflection = stripMarkup(day?.reflection || day?.content || "");
      const verseText = stripMarkup(day?.verseText || day?.verse || "");
      const verseTag = stripMarkup(day?.verseTag || day?.scripture || "");

      lines.push(`### Day ${dayNum}: ${dayTitle}`);
      lines.push("");
      if (reflection) {
        lines.push("**Reflection:**");
        lines.push(reflection);
        lines.push("");
      }
      if (verseText || verseTag) {
        lines.push("**Scripture Verse:**");
        if (verseText) {
          lines.push(`> "${verseText}"`);
        }
        if (verseTag) {
          lines.push(`> — *${verseTag}*`);
        }
        lines.push("");
      }
    });
  }

  lines.push("---");
  lines.push("");
  lines.push("# Community Testimonies");
  lines.push("");

  for (const post of allPosts) {
    const postUrl = `${SITE_URL}/posts/${encodeURIComponent(post.id)}`;
    const tag = stripMarkup(post.tag || (post.id === "post1" ? "Hope" : "Gratitude"));
    const author = stripMarkup(post.author || "Ju & Vicky");
    const bodyText = formatContentBlocksToPlainMarkdown(post.content);

    lines.push(`## Testimony: ${stripMarkup(post.title || post.id)}`);
    lines.push(`Topic: ${tag}`);
    lines.push(`Author: ${author}`);
    if (post.date) lines.push(`Date: ${post.date}`);
    lines.push(`URL: ${postUrl}`);
    lines.push("");
    if (bodyText) {
      lines.push(bodyText);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return new Response(`${lines.join("\n")}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
