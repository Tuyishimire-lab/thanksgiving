import { getPublicTestimonyById } from "@/app/actions/dbActions";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  createSanctuaryOgResponse,
} from "@/lib/ogCard";

export const revalidate = 300;
export const alt = "PraisePage Community Testimony";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

function extractFirstParagraph(post) {
  if (!Array.isArray(post?.content)) return "";
  return post.content.find((block) => block?.type === "paragraph")?.text || "";
}

export default async function Image({ params }) {
  const { id } = await params;
  let post = null;

  try {
    post = await getPublicTestimonyById(id);
  } catch (error) {
    console.error("[posts/opengraph-image] Testimony lookup fallback:", error);
  }

  if (!post) {
    return createSanctuaryOgResponse({
      eyebrow: "COMMUNITY TESTIMONY",
      title: "Stories of God's Faithfulness",
      subtitle:
        "Read community testimonies of answered prayer, healing, strength, and gratitude on PraisePage.",
      badge: "Voices of Gratitude",
      footerMeta: "PraisePage Community Feed",
      accent: "amber",
    });
  }

  const tag = post.tag || "Gratitude";
  const snippet = post.excerpt || extractFirstParagraph(post) || post.title;
  const author = post.author || "PraisePage Community";

  return createSanctuaryOgResponse({
    eyebrow: `TESTIMONY · ${tag.toUpperCase()}`,
    title: post.title,
    subtitle: snippet,
    badge: post.readTime || tag,
    footerMeta: post.date ? `Shared by ${author} · ${post.date}` : `Shared by ${author}`,
    accent: "gold",
  });
}
