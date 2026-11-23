import Link from "next/link";
import Image from "next/image";
import { TOPICS } from "@/data/topics";
import { devotionals } from "@/data/devotionals";
import { getCustomDevotionals } from "@/app/actions/dbActions";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  toAbsoluteUrl,
  serializeJsonLd,
} from "@/lib/seo";

export const revalidate = 3600;

const PAGE_TITLE = "Faith & Life Topics — Bible Verses & Devotionals";
const PAGE_DESCRIPTION =
  "Explore 17 biblical faith and life topics with curated Scripture passages, guided devotional plans, heartfelt prayers, and community testimonies.";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/topics",
  },
  openGraph: {
    title: `${PAGE_TITLE} | PraisePage`,
    description: PAGE_DESCRIPTION,
    url: toAbsoluteUrl("/topics"),
    type: "website",
    images: [
      {
        url: toAbsoluteUrl(DEFAULT_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: "PraisePage Faith & Life Topics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | PraisePage`,
    description: PAGE_DESCRIPTION,
    images: [toAbsoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

async function getMergedDevotionalPlans() {
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
  return [...staticPlans.filter((p) => !customIds.has(p.id)), ...customPlans];
}

export default async function TopicsDirectoryPage() {
  const allPlans = await getMergedDevotionalPlans();
  const planCountsByCategory = new Map();

  for (const plan of allPlans) {
    const key = String(plan?.category || "").trim().toLowerCase();
    if (!key) continue;
    planCountsByCategory.set(key, (planCountsByCategory.get(key) || 0) + 1);
  }

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
            name: "Faith & Life Topics",
            item: toAbsoluteUrl("/topics"),
          },
        ],
      },
      {
        "@type": "CollectionPage",
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        url: toAbsoluteUrl("/topics"),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: TOPICS.length,
          itemListElement: TOPICS.map((topic, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: topic.name,
            description: topic.metaDescription,
            url: toAbsoluteUrl(`/topics/${topic.slug}`),
          })),
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
        <div className="sanc-container">
          <Link href="/" className="sanc-back-link">
            <i className="ri-arrow-left-line" aria-hidden="true"></i>
            <span>Back to Home</span>
          </Link>

          <header className="sanc-hero">
            <div className="sanc-hero-row">
              <div style={{ maxWidth: "68ch" }}>
                <span className="sanc-eyebrow">Scripture &amp; Guidance</span>
                <h1 className="sanc-title">Faith &amp; Life Topics</h1>
                <p className="sanc-subtitle">
                  Walk through every season with grounded Scripture, guided devotional plans,
                  prayers, and real stories from believers across 17 everyday themes.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                <Link href="/verse-of-the-day" className="sanc-btn-gold">
                  <i className="ri-sun-line" aria-hidden="true"></i>
                  <span>Verse of the Day</span>
                </Link>
                <Link href="/plans" className="sanc-btn-secondary">
                  <i className="ri-book-open-line" aria-hidden="true"></i>
                  <span>Browse All Plans</span>
                </Link>
              </div>
            </div>
          </header>

          <div className="sanc-topic-grid">
            {TOPICS.map((topic) => {
              const planCount =
                planCountsByCategory.get(topic.category.toLowerCase()) || 0;
              return (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="sanc-topic-card"
                >
                  <div className="sanc-topic-cover">
                    <Image
                      src={topic.cover}
                      alt={topic.seoTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 860px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                    <div className="sanc-topic-cover-scrim" />
                  </div>

                  <div className="sanc-topic-body">
                    <span
                      className="sanc-badge gold"
                      style={{ alignSelf: "flex-start" }}
                    >
                      {planCount} {planCount === 1 ? "Devotional Plan" : "Devotional Plans"}
                    </span>
                    <h2
                      style={{
                        fontFamily: "var(--font-family-serif), Georgia, serif",
                        fontSize: "2.15rem",
                        lineHeight: 1.2,
                        color: "var(--sanc-text)",
                        margin: 0,
                      }}
                    >
                      {topic.name}
                    </h2>
                    <p
                      style={{
                        fontSize: "1.38rem",
                        lineHeight: 1.6,
                        color: "var(--sanc-muted)",
                        margin: 0,
                        flex: "1 1 auto",
                      }}
                    >
                      {topic.metaDescription}
                    </p>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        fontSize: "1.32rem",
                        fontWeight: 600,
                        color: "var(--sanc-gold)",
                        marginTop: "0.4rem",
                      }}
                    >
                      <span>Explore Topic</span>
                      <i className="ri-arrow-right-line" aria-hidden="true"></i>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
