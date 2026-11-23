import { posts } from "@/data/posts";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPublicTestimonyById } from "@/app/actions/dbActions";
import { getDefaultTestimonyCover, shouldBypassNextImageOpt } from "@/data/testimonyCovers";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  toAbsoluteUrl,
  serializeJsonLd,
  truncateDescription,
  sanitizeArticleHtml,
  stripMarkup,
} from "@/lib/seo";
import ShareCardTrigger from "@/components/ShareCardTrigger";

export const revalidate = 300;

function toSafeIsoDate(value) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return "2026-01-01T00:00:00.000Z";
}

function extractFirstParagraph(post) {
  if (!Array.isArray(post?.content)) return "";
  return post.content.find((c) => c.type === "paragraph")?.text || "";
}

export async function generateStaticParams() {
  return posts.map((post) => ({
    id: post.id,
  }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await getPublicTestimonyById(id);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const cleanDescription =
    truncateDescription(post.excerpt || extractFirstParagraph(post) || post.title, 155) ||
    "Read this community testimony of gratitude and faith on PraisePage.";
  const canonicalPath = `/posts/${encodeURIComponent(id)}`;
  const publishedTime = toSafeIsoDate(post.createdAtRaw || post.date);
  const authorName = post.author || "PraisePage";
  const postTags = post.tag ? [post.tag] : ["Faith"];

  return {
    title: post.title,
    description: cleanDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${post.title} | PraisePage`,
      description: cleanDescription,
      type: "article",
      url: toAbsoluteUrl(canonicalPath),
      publishedTime,
      authors: [authorName],
      tags: postTags,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | PraisePage`,
      description: cleanDescription,
    },
  };
}

export default async function PostPage({ params }) {
  const { id } = await params;
  const post = await getPublicTestimonyById(id);

  if (!post) {
    notFound();
  }

  const coverSrc = post.image || getDefaultTestimonyCover(post.tag) || DEFAULT_OG_IMAGE;
  const coverUrl = toAbsoluteUrl(coverSrc);
  const cleanDescription =
    truncateDescription(post.excerpt || extractFirstParagraph(post) || post.title, 155) ||
    "Read this community testimony of gratitude and faith on PraisePage.";
  const publishedDate = toSafeIsoDate(post.createdAtRaw || post.date);
  const canonicalUrl = toAbsoluteUrl(`/posts/${encodeURIComponent(id)}`);
  const authorName = post.author || "PraisePage";
  const postTag = post.tag || "Gratitude";
  const blocks = Array.isArray(post.content) ? post.content : [];
  const rawStorySnippet =
    extractFirstParagraph(post) || post.excerpt || post.title || "";
  const storySnippet =
    truncateDescription(rawStorySnippet, 180) || stripMarkup(post.title);
  const storyAttribution = `${authorName} · PraisePage`;

  const schemaJson = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Community Feed",
            item: toAbsoluteUrl("/feed"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "Article",
        headline: post.title,
        description: cleanDescription,
        image: [coverUrl],
        datePublished: publishedDate,
        dateModified: publishedDate,
        articleSection: postTag,
        author: {
          "@type": "Person",
          name: authorName,
        },
        publisher: {
          "@type": "Organization",
          name: "PraisePage",
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: toAbsoluteUrl(DEFAULT_OG_IMAGE),
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemaJson) }}
      />

      <section className="sanc-page">
        <div className="sanc-container-sm">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.8rem",
            }}
          >
            <Link href="/feed" className="sanc-back-link" style={{ marginBottom: 0 }}>
              <i className="ri-arrow-left-line" aria-hidden="true"></i>
              <span>Back to Community Feed</span>
            </Link>

            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
              <ShareCardTrigger
                verseText={storySnippet}
                verseTag={storyAttribution}
                sharePath={`/posts/${encodeURIComponent(post.id)}`}
                initialAspectRatio="9:16"
                modalTitle="Share Testimony Card"
                label="Share as Story Card"
                className="sanc-btn-gold"
              />
              <Link
                href={`/feed?post=${encodeURIComponent(post.id)}`}
                className="sanc-btn-secondary"
              >
                <i className="ri-chat-3-line" aria-hidden="true"></i>
                <span>Join Discussion in Feed</span>
              </Link>
            </div>
          </div>

          <article className="sanc-stack" style={{ gap: "2.4rem" }}>
            <header className="sanc-hero sanc-hero-center" style={{ marginBottom: 0 }}>
              <span className="sanc-eyebrow">Community Testimony</span>
              <h1 className="sanc-title">{post.title}</h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "1rem",
                  marginTop: "1.4rem",
                }}
              >
                <span className="sanc-badge gold">#{postTag}</span>
                <span className="sanc-badge">
                  <i className="ri-user-heart-line" aria-hidden="true"></i>
                  <span>{authorName}</span>
                </span>
                {post.date && <span className="sanc-badge">{post.date}</span>}
                {post.readTime && <span className="sanc-badge">{post.readTime}</span>}
              </div>
            </header>

            <div className="sanc-card" style={{ overflow: "hidden" }}>
              <Image
                src={coverSrc}
                alt={post.title || "Testimony cover"}
                width={900}
                height={500}
                unoptimized={shouldBypassNextImageOpt(coverSrc)}
                style={{ width: "100%", height: "auto", display: "block" }}
                preload
              />
            </div>

            <div className="sanc-card sanc-card-pad">
              <div className="sanc-article-prose">
                {blocks.map((block, index) => {
                  if (block.type === "paragraph") {
                    return (
                      <p
                        key={index}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeArticleHtml(block.text),
                        }}
                      />
                    );
                  }
                  if (block.type === "blockquote") {
                    return (
                      <blockquote key={index} className="sanc-blockquote">
                        &ldquo;{block.text}&rdquo;
                      </blockquote>
                    );
                  }
                  if (block.type === "list") {
                    const items = Array.isArray(block.items) ? block.items : [];
                    return (
                      <ul key={index}>
                        {items.map((item, itemIdx) => (
                          <li
                            key={itemIdx}
                            dangerouslySetInnerHTML={{
                              __html: sanitizeArticleHtml(item),
                            }}
                          />
                        ))}
                      </ul>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="sanc-author-card">
                <div
                  style={{
                    width: "7.6rem",
                    height: "7.6rem",
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                    border: "2px solid var(--sanc-gold-border)",
                  }}
                >
                  <Image
                    src="/assets/images/praisepage.jpeg"
                    alt="PraisePage"
                    fill
                    sizes="80px"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div>
                    <span className="sanc-eyebrow" style={{ marginBottom: "0.2rem" }}>
                      About the Ministry
                    </span>
                    <h3 className="sanc-section-title" style={{ fontSize: "2rem" }}>
                      PraisePage
                    </h3>
                  </div>
                  <p style={{ fontSize: "1.38rem", lineHeight: 1.6, color: "var(--sanc-muted)", margin: 0 }}>
                    Share Your Testimony! We believe in the power of stories. Share your PraisePage
                    reflection and encourage believers walking through every season.
                  </p>
                  <div className="sanc-social-row" style={{ marginTop: "0.3rem" }}>
                    <a
                      href="https://www.instagram.com/praisepage__?igsh=czB1MWpndDM5dmxl"
                      className="sanc-social-btn"
                      aria-label="Instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-instagram-line" aria-hidden="true"></i>
                    </a>
                    <a
                      href="https://www.facebook.com/share/17UGpy6s6P/"
                      className="sanc-social-btn"
                      aria-label="Facebook"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-facebook-circle-line" aria-hidden="true"></i>
                    </a>
                    <a
                      href="https://x.com/praisepage_"
                      className="sanc-social-btn"
                      aria-label="X (Twitter)"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-twitter-line" aria-hidden="true"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
