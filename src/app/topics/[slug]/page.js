import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TOPICS, getTopicBySlug, getTopicScriptures } from "@/data/topics";
import { devotionals } from "@/data/devotionals";
import {
  getCustomDevotionals,
  getPublicTestimoniesList,
} from "@/app/actions/dbActions";
import {
  getDefaultTestimonyCover,
  shouldBypassNextImageOpt,
} from "@/data/testimonyCovers";
import { SITE_URL, toAbsoluteUrl, serializeJsonLd } from "@/lib/seo";
import CopyVerseButton from "@/components/CopyVerseButton";
import ShareCardTrigger from "@/components/ShareCardTrigger";

export const revalidate = 3600;

export function generateStaticParams() {
  return TOPICS.map((topic) => ({
    slug: topic.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);

  if (!topic) {
    return {
      title: "Topic Not Found",
    };
  }

  const canonicalPath = `/topics/${topic.slug}`;

  return {
    title: topic.seoTitle,
    description: topic.metaDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${topic.seoTitle} | PraisePage`,
      description: topic.metaDescription,
      url: toAbsoluteUrl(canonicalPath),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${topic.seoTitle} | PraisePage`,
      description: topic.metaDescription,
    },
  };
}

async function getMergedTopicPlans(category) {
  const staticPlans = Object.values(devotionals);
  let customPlans = [];

  try {
    const res = await getCustomDevotionals();
    if (res?.success && Array.isArray(res.plans)) {
      customPlans = res.plans;
    }
  } catch {
    customPlans = [];
  }

  const customIds = new Set(customPlans.map((p) => p.id));
  const merged = [...staticPlans.filter((p) => !customIds.has(p.id)), ...customPlans];
  const needle = String(category || "").trim().toLowerCase();

  return merged.filter(
    (plan) => String(plan?.category || "").trim().toLowerCase() === needle
  );
}

async function getMatchingTopicTestimonies(topic) {
  let testimonies = [];
  try {
    const list = await getPublicTestimoniesList();
    if (Array.isArray(list)) {
      testimonies = list;
    }
  } catch {
    testimonies = [];
  }

  const candidateTags =
    Array.isArray(topic.testimonyTags) && topic.testimonyTags.length > 0
      ? topic.testimonyTags
      : [topic.name];
  const tagSet = new Set(candidateTags.map((t) => String(t).trim().toLowerCase()));
  tagSet.add(topic.name.toLowerCase());

  return testimonies
    .filter((post) => tagSet.has(String(post?.tag || "").trim().toLowerCase()))
    .slice(0, 6);
}

export default async function TopicDetailPage({ params }) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);

  if (!topic) {
    notFound();
  }

  const [matchingPlans, matchingTestimonies] = await Promise.all([
    getMergedTopicPlans(topic.category),
    getMatchingTopicTestimonies(topic),
  ]);

  const scriptures = getTopicScriptures(topic, matchingPlans);
  const relatedTopics = (topic.relatedSlugs || [])
    .map((relSlug) => getTopicBySlug(relSlug))
    .filter(Boolean);
  const canonicalUrl = toAbsoluteUrl(`/topics/${topic.slug}`);
  const faqs = Array.isArray(topic.faqs) ? topic.faqs : [];
  const primaryPlanHref =
    matchingPlans.length > 0
      ? `/plans/${encodeURIComponent(matchingPlans[0].id)}`
      : "/plans";

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
            name: "Topics",
            item: toAbsoluteUrl("/topics"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: topic.name,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "CollectionPage",
        name: topic.seoTitle,
        description: topic.metaDescription,
        url: canonicalUrl,
        image: toAbsoluteUrl(topic.cover),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: matchingPlans.length,
          itemListElement: matchingPlans.map((plan, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: plan.title,
            url: toAbsoluteUrl(`/plans/${encodeURIComponent(plan.id)}`),
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
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
        <div className="sanc-container sanc-stack" style={{ gap: "3.6rem" }}>
          <div>
            <Link href="/topics" className="sanc-back-link">
              <i className="ri-arrow-left-line" aria-hidden="true"></i>
              <span>All Faith Topics</span>
            </Link>

            <header className="sanc-topic-hero" style={{ marginBottom: 0 }}>
              <div className="sanc-topic-hero-media">
                <Image
                  src={topic.cover}
                  alt={topic.seoTitle}
                  fill
                  sizes="(max-width: 960px) 100vw, 1140px"
                  preload
                  style={{ objectFit: "cover" }}
                />
                <div className="sanc-topic-hero-overlay">
                  <span
                    className="sanc-badge gold"
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: "rgba(18, 20, 26, 0.72)",
                      borderColor: "rgba(230, 189, 106, 0.55)",
                      color: "#f5d78e",
                    }}
                  >
                    #{topic.name}
                  </span>
                  <h1 className="sanc-title" style={{ color: "#f5f2eb" }}>
                    {topic.headline}
                  </h1>
                  <p
                    className="sanc-subtitle"
                    style={{
                      color: "rgba(245, 242, 235, 0.88)",
                      maxWidth: "68ch",
                      margin: 0,
                    }}
                  >
                    {topic.intro}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1rem",
                      marginTop: "0.6rem",
                    }}
                  >
                    <Link href={primaryPlanHref} className="sanc-btn-primary">
                      <i className="ri-play-circle-line" aria-hidden="true"></i>
                      <span>Start a Plan</span>
                    </Link>
                    <Link href="/bible" className="sanc-btn-secondary">
                      <i className="ri-book-open-line" aria-hidden="true"></i>
                      <span>Read Scripture</span>
                    </Link>
                    <Link href="/prayers" className="sanc-btn-secondary">
                      <i className="ri-hand-heart-line" aria-hidden="true"></i>
                      <span>Prayer Wall</span>
                    </Link>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* Guided Devotional Plans */}
          <section className="sanc-stack" style={{ gap: "1.6rem" }}>
            <div className="sanc-section-head">
              <div>
                <span className="sanc-eyebrow">Structured Reading</span>
                <h2 className="sanc-section-title">
                  Guided Devotional Plans for {topic.name}
                </h2>
              </div>
              <Link href="/plans" className="sanc-btn-secondary sanc-btn-sm">
                <span>All Plans</span>
                <i className="ri-arrow-right-line" aria-hidden="true"></i>
              </Link>
            </div>

            {matchingPlans.length > 0 ? (
              <div className="sanc-grid-3">
                {matchingPlans.map((plan) => {
                  const days = Array.isArray(plan.days) ? plan.days : [];
                  const planImg = plan.image || topic.cover;
                  const firstReflection = days[0]?.reflection || topic.intro;
                  return (
                    <article
                      key={plan.id}
                      className="sanc-card sanc-card-hover sanc-plan-card"
                    >
                      <div className="sanc-plan-cover">
                        <Image
                          src={planImg}
                          alt={plan.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 340px"
                          unoptimized={shouldBypassNextImageOpt(planImg)}
                          style={{ objectFit: "cover" }}
                        />
                        <div className="sanc-plan-cover-overlay">
                          <span
                            className="sanc-badge gold"
                            style={{ alignSelf: "flex-start" }}
                          >
                            {plan.category}
                          </span>
                        </div>
                      </div>

                      <div className="sanc-plan-body">
                        <h3 className="sanc-plan-title">{plan.title}</h3>
                        <p className="sanc-plan-excerpt">{firstReflection}</p>
                        <div className="sanc-plan-footer">
                          <div
                            style={{
                              fontSize: "1.18rem",
                              color: "var(--sanc-muted)",
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {days.length} DAYS DEVOTIONAL
                          </div>
                          <Link
                            href={`/plans/${encodeURIComponent(plan.id)}`}
                            className="sanc-btn-primary sanc-btn-sm sanc-plan-cta"
                          >
                            <span>Read Plan</span>
                            <i className="ri-arrow-right-line" aria-hidden="true"></i>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="sanc-card sanc-card-pad">
                <p style={{ margin: 0, fontSize: "1.45rem", color: "var(--sanc-muted)" }}>
                  Explore all 17 categories in our{" "}
                  <Link href="/plans" style={{ color: "var(--sanc-gold)", fontWeight: 600 }}>
                    Devotional Plans library
                  </Link>
                  .
                </p>
              </div>
            )}
          </section>

          {/* Key Bible Verses */}
          <section className="sanc-stack" style={{ gap: "1.6rem" }}>
            <div>
              <span className="sanc-eyebrow">Scripture Anchor</span>
              <h2 className="sanc-section-title">
                Key Bible Verses for {topic.name}
              </h2>
            </div>

            <div className="sanc-verse-grid">
              {scriptures.map((item) => (
                <article key={item.reference} className="sanc-verse-card">
                  <div className="sanc-stack" style={{ gap: "1rem" }}>
                    <span
                      className="sanc-badge gold"
                      style={{ alignSelf: "flex-start" }}
                    >
                      {item.reference}
                    </span>
                    <blockquote
                      style={{
                        fontFamily: "var(--font-family-reader), Georgia, serif",
                        fontSize: "1.6rem",
                        lineHeight: 1.65,
                        color: "var(--sanc-text)",
                        margin: 0,
                      }}
                    >
                      &ldquo;{item.verse}&rdquo;
                    </blockquote>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.8rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid var(--sanc-border)",
                    }}
                  >
                    <Link
                      href={item.bibleHref}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "1.3rem",
                        fontWeight: 600,
                        color: "var(--sanc-gold)",
                      }}
                    >
                      <span>Read in Context</span>
                      <i className="ri-arrow-right-line" aria-hidden="true"></i>
                    </Link>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.6rem",
                      }}
                    >
                      <CopyVerseButton
                        verseText={item.verse}
                        reference={item.reference}
                        sharePath={`/topics/${topic.slug}`}
                        className="sanc-btn-ghost sanc-btn-sm"
                      />
                      <ShareCardTrigger
                        verseText={item.verse}
                        verseTag={item.reference}
                        sharePath={`/topics/${topic.slug}`}
                        initialAspectRatio="9:16"
                        modalTitle={`Share ${topic.name} Verse`}
                        label="Share Card"
                        className="sanc-btn-gold sanc-btn-sm"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Short Prayer */}
          <section className="sanc-stack" style={{ gap: "1.4rem" }}>
            <div>
              <span className="sanc-eyebrow">Prayer Prompt</span>
              <h2 className="sanc-section-title">A Short Prayer for {topic.name}</h2>
            </div>

            <div className="sanc-topic-prayer">
              <p style={{ margin: "0 0 1.6rem" }}>{topic.shortPrayer}</p>
              <Link href="/prayers" className="sanc-btn-gold sanc-btn-sm">
                <i className="ri-hand-heart-line" aria-hidden="true"></i>
                <span>Submit a Prayer Request</span>
              </Link>
            </div>
          </section>

          {/* Community Testimonies */}
          <section className="sanc-stack" style={{ gap: "1.6rem" }}>
            <div className="sanc-section-head">
              <div>
                <span className="sanc-eyebrow">Real Stories</span>
                <h2 className="sanc-section-title">Community Testimonies</h2>
              </div>
              <Link href="/feed" className="sanc-btn-secondary sanc-btn-sm">
                <span>View Full Feed</span>
                <i className="ri-arrow-right-line" aria-hidden="true"></i>
              </Link>
            </div>

            {matchingTestimonies.length > 0 ? (
              <div className="sanc-grid-3">
                {matchingTestimonies.map((post) => {
                  const postImg = post.image || getDefaultTestimonyCover(post.tag);
                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${encodeURIComponent(post.id)}`}
                      className="sanc-topic-card"
                    >
                      <div className="sanc-topic-cover">
                        <Image
                          src={postImg}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 860px) 50vw, 33vw"
                          unoptimized={shouldBypassNextImageOpt(postImg)}
                          style={{ objectFit: "cover" }}
                        />
                        <div className="sanc-topic-cover-scrim" />
                      </div>
                      <div className="sanc-topic-body">
                        <span
                          className="sanc-badge gold"
                          style={{ alignSelf: "flex-start" }}
                        >
                          #{post.tag || topic.name}
                        </span>
                        <h3
                          style={{
                            fontFamily: "var(--font-family-serif), Georgia, serif",
                            fontSize: "1.95rem",
                            lineHeight: 1.25,
                            color: "var(--sanc-text)",
                            margin: 0,
                          }}
                        >
                          {post.title}
                        </h3>
                        <p
                          style={{
                            fontSize: "1.35rem",
                            lineHeight: 1.55,
                            color: "var(--sanc-muted)",
                            margin: 0,
                            flex: "1 1 auto",
                          }}
                        >
                          {post.excerpt}
                        </p>
                        <span
                          style={{
                            fontSize: "1.22rem",
                            color: "var(--sanc-muted)",
                          }}
                        >
                          By {post.author || "PraisePage"} &bull; {post.date}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div
                className="sanc-card sanc-card-pad"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1.6rem",
                }}
              >
                <div style={{ maxWidth: "56ch" }}>
                  <h3
                    style={{
                      fontFamily: "var(--font-family-serif), Georgia, serif",
                      fontSize: "1.9rem",
                      color: "var(--sanc-text)",
                      margin: "0 0 0.5rem",
                    }}
                  >
                    Walked through {topic.name.toLowerCase()} with God?
                  </h3>
                  <p
                    style={{
                      fontSize: "1.4rem",
                      lineHeight: 1.6,
                      color: "var(--sanc-muted)",
                      margin: 0,
                    }}
                  >
                    Share how Scripture or prayer carried you through this season to encourage
                    another reader.
                  </p>
                </div>
                <Link href="/feed?share=true" className="sanc-btn-primary">
                  <i className="ri-quill-pen-line" aria-hidden="true"></i>
                  <span>Share Your Testimony</span>
                </Link>
              </div>
            )}
          </section>

          {/* FAQs */}
          <section className="sanc-stack" style={{ gap: "1.6rem" }}>
            <div>
              <span className="sanc-eyebrow">Questions &amp; Answers</span>
              <h2 className="sanc-section-title">Frequently Asked Questions</h2>
            </div>

            <div className="sanc-faq-list">
              {faqs.map((faq, idx) => (
                <details
                  key={faq.q}
                  className="sanc-faq-item"
                  open={idx === 0}
                >
                  <summary className="sanc-faq-summary">
                    <span>{faq.q}</span>
                    <i className="ri-arrow-down-s-line" aria-hidden="true"></i>
                  </summary>
                  <div className="sanc-faq-body">{faq.a}</div>
                </details>
              ))}
            </div>
          </section>

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <section className="sanc-stack" style={{ gap: "1.4rem" }}>
              <div>
                <span className="sanc-eyebrow">Continue Exploring</span>
                <h2 className="sanc-section-title">Related Faith Topics</h2>
              </div>
              <div className="sanc-filter-row">
                {relatedTopics.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/topics/${rel.slug}`}
                    className="sanc-pill"
                  >
                    {rel.name}
                  </Link>
                ))}
                <Link href="/topics" className="sanc-pill active-gold">
                  All 17 Topics
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  );
}
