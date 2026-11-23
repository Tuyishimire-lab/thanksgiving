import Link from "next/link";
import { getVerseOfTheDay } from "@/data/verses";
import { JOURNAL_PROMPTS } from "@/data/journalPrompts";
import { parseBibleReference } from "@/data/bibleParser";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  toAbsoluteUrl,
  serializeJsonLd,
  truncateDescription,
} from "@/lib/seo";
import CopyVerseButton from "@/components/CopyVerseButton";

export const revalidate = 3600;

const VOTD_FAQS = [
  {
    q: "How does PraisePage choose the daily Verse of the Day?",
    a: "PraisePage rotates a curated scripture index evenly throughout the calendar year so each day highlights a distinct biblical passage on gratitude, peace, courage, and hope without near-term repetition.",
  },
  {
    q: "How can I read the full chapter and save highlights or notes?",
    a: "Click Read Full Chapter to open today's passage inside the interactive PraisePage Bible Reader, where you can switch translations, highlight verses, and keep private reflections synced to your account.",
  },
];

function buildBibleChapterHref(reference) {
  const parsed = parseBibleReference(reference);
  if (!parsed) return "/bible";
  return `/bible?book=${encodeURIComponent(parsed.book)}&chapter=${parsed.chapter}${
    parsed.verse ? `&verse=${parsed.verse}` : ""
  }`;
}

export async function generateMetadata() {
  const votd = getVerseOfTheDay(new Date());
  const title = `Verse of the Day — ${votd.tag}`;
  const description = truncateDescription(
    `"${votd.verse}" — ${votd.tag}. Daily Bible verse, reflection prompt, and full scripture context on PraisePage.`,
    155
  );
  const ogUrl = toAbsoluteUrl("/verse-of-the-day");
  const ogImage = toAbsoluteUrl(DEFAULT_OG_IMAGE);

  return {
    title,
    description,
    alternates: {
      canonical: "/verse-of-the-day",
    },
    openGraph: {
      title: `${title} | PraisePage`,
      description,
      url: ogUrl,
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Verse of the Day: ${votd.tag}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PraisePage`,
      description,
      images: [ogImage],
    },
  };
}

export default function VerseOfTheDayPage() {
  const today = new Date();
  const votd = getVerseOfTheDay(today);
  const formattedToday = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const reflectionPrompt =
    JOURNAL_PROMPTS[(votd.dayOfYear - 1) % JOURNAL_PROMPTS.length];
  const chapterHref = buildBibleChapterHref(votd.tag);

  const recentDays = Array.from({ length: 6 }, (_, idx) => {
    const offset = idx + 1;
    const pastDate = new Date(today.getTime() - offset * 86400000);
    const pastVerse = getVerseOfTheDay(pastDate);
    return {
      offset,
      label: pastDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      verse: pastVerse.verse,
      tag: pastVerse.tag,
      href: buildBibleChapterHref(pastVerse.tag),
    };
  });

  const canonicalUrl = toAbsoluteUrl("/verse-of-the-day");
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
            name: "Verse of the Day",
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "Article",
        headline: `Verse of the Day: ${votd.tag}`,
        description: truncateDescription(
          `"${votd.verse}" — ${votd.tag}. Daily Bible verse and guided reflection prompt.`,
          155
        ),
        articleBody: votd.verse,
        datePublished: today.toISOString(),
        dateModified: today.toISOString(),
        image: toAbsoluteUrl(DEFAULT_OG_IMAGE),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
        author: {
          "@type": "Organization",
          name: "PraisePage",
          url: SITE_URL,
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
      },
      {
        "@type": "FAQPage",
        mainEntity: VOTD_FAQS.map((faq) => ({
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
        <div className="sanc-container-md sanc-stack" style={{ gap: "3.2rem" }}>
          <div>
            <Link href="/" className="sanc-back-link">
              <i className="ri-arrow-left-line" aria-hidden="true"></i>
              <span>Back to Home</span>
            </Link>

            <article className="sanc-votd-hero" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <span className="sanc-eyebrow" style={{ marginBottom: 0 }}>
                  Daily Scripture Reading
                </span>
                <span className="sanc-badge gold">{formattedToday}</span>
              </div>

              <h1 className="sanc-title">Verse of the Day</h1>

              <blockquote className="sanc-votd-quote">
                &ldquo;{votd.verse}&rdquo;
              </blockquote>

              <cite
                style={{
                  fontStyle: "normal",
                  fontSize: "1.65rem",
                  fontWeight: 700,
                  color: "var(--sanc-gold)",
                }}
              >
                &mdash; {votd.tag}
              </cite>

              <div className="sanc-votd-actions">
                <CopyVerseButton
                  verseText={votd.verse}
                  reference={votd.tag}
                  sharePath="/verse-of-the-day"
                  className="sanc-btn-gold"
                />
                <Link href={chapterHref} className="sanc-btn-primary">
                  <span>Read Full Chapter</span>
                  <i className="ri-arrow-right-line" aria-hidden="true"></i>
                </Link>
                <Link href="/plans" className="sanc-btn-secondary">
                  <i className="ri-book-open-line" aria-hidden="true"></i>
                  <span>Explore Guided Plans</span>
                </Link>
              </div>
            </article>
          </div>

          {/* Daily Reflection Prompt */}
          <section className="sanc-card sanc-card-pad sanc-stack" style={{ gap: "1.2rem" }}>
            <span className="sanc-eyebrow" style={{ marginBottom: 0 }}>
              Daily Reflection Prompt
            </span>
            <h2 className="sanc-section-title" style={{ fontSize: "2.2rem" }}>
              Carry Today&apos;s Word Into Prayer
            </h2>
            <p
              style={{
                fontFamily: "var(--font-family-reader), Georgia, serif",
                fontSize: "1.68rem",
                lineHeight: 1.65,
                color: "var(--sanc-text)",
                margin: 0,
              }}
            >
              {reflectionPrompt}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.4rem" }}>
              <Link href="/#word-of-the-day" className="sanc-btn-secondary sanc-btn-sm">
                <i className="ri-quill-pen-line" aria-hidden="true"></i>
                <span>Open Gratitude Journal</span>
              </Link>
              <Link href="/profile" className="sanc-btn-ghost sanc-btn-sm">
                <i className="ri-bookmark-line" aria-hidden="true"></i>
                <span>View Saved Notebook</span>
              </Link>
            </div>
          </section>

          {/* Recent Daily Verses */}
          <section className="sanc-stack" style={{ gap: "1.6rem" }}>
            <div>
              <span className="sanc-eyebrow">Archive</span>
              <h2 className="sanc-section-title">Recent Daily Verses</h2>
            </div>

            <div className="sanc-votd-history-grid">
              {recentDays.map((day) => (
                <article key={day.offset} className="sanc-votd-day-card">
                  <div className="sanc-stack" style={{ gap: "0.9rem" }}>
                    <span
                      className="sanc-badge gold"
                      style={{ alignSelf: "flex-start" }}
                    >
                      {day.label}
                    </span>
                    <p
                      style={{
                        fontFamily: "var(--font-family-reader), Georgia, serif",
                        fontSize: "1.44rem",
                        lineHeight: 1.6,
                        color: "var(--sanc-text)",
                        margin: 0,
                      }}
                    >
                      &ldquo;{day.verse}&rdquo;
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.8rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid var(--sanc-border)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.28rem",
                        fontWeight: 600,
                        color: "var(--sanc-gold)",
                      }}
                    >
                      {day.tag}
                    </span>
                    <Link
                      href={day.href}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "1.28rem",
                        fontWeight: 600,
                        color: "var(--sanc-text)",
                      }}
                    >
                      <span>Read</span>
                      <i className="ri-arrow-right-line" aria-hidden="true"></i>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* FAQ Accordion */}
          <section className="sanc-stack" style={{ gap: "1.4rem" }}>
            <div>
              <span className="sanc-eyebrow">About Daily Scripture</span>
              <h2 className="sanc-section-title">Questions &amp; Answers</h2>
            </div>
            <div className="sanc-faq-list">
              {VOTD_FAQS.map((faq, idx) => (
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

          {/* Explore Faith Topics */}
          <section className="sanc-stack" style={{ gap: "1.4rem" }}>
            <div>
              <span className="sanc-eyebrow">By Season</span>
              <h2 className="sanc-section-title">Explore Faith Topics</h2>
            </div>
            <div className="sanc-filter-row">
              <Link href="/topics/gratitude" className="sanc-pill">
                Gratitude
              </Link>
              <Link href="/topics/hope" className="sanc-pill">
                Hope
              </Link>
              <Link href="/topics/peace" className="sanc-pill">
                Peace
              </Link>
              <Link href="/topics/anxiety" className="sanc-pill">
                Anxiety
              </Link>
              <Link href="/topics" className="sanc-pill active-gold">
                All Faith Topics
              </Link>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
