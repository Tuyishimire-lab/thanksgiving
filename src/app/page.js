import Link from "next/link";
import Image from "next/image";
import { getVerseOfTheDay } from "@/data/verses";
import { getDailyTriviaSet } from "@/data/triviaQuestions";
import { devotionals } from "@/data/devotionals";
import {
  getHomepageData,
  getLatestAnsweredPrayers,
  getCommunityStats,
  getCustomDevotionals,
} from "@/app/actions/dbActions";
import { JOURNAL_PROMPTS } from "@/data/journalPrompts";
import StreakTracker from "@/components/StreakTracker";
import VerseOfTheDaySection from "@/components/VerseOfTheDaySection";
import JournalWidget from "@/components/JournalWidget";
import PrayerWallSnippet from "@/components/PrayerWallSnippet";
import BibleReflectionTrivia from "@/components/BibleReflectionTrivia";
import FaithFootprintsTracker from "@/components/FaithFootprintsTracker";
import { getDefaultTestimonyCover, shouldBypassNextImageOpt } from "@/data/testimonyCovers";

export const revalidate = 3600; // Revalidate homepage at most once per hour

export const metadata = {
  alternates: {
    canonical: "/",
  },
};

const PLANS_MAPPING = [
  {
    id: "love",
    tag: "#Love",
    title: "Walk in Love",
    meta: "5-Day Guided Plan",
    image: "/assets/images/plans/love-lanterns.png",
  },
  {
    id: "gratitude",
    tag: "#Gratitude",
    title: "Thanks in All Things",
    meta: "5-Day Guided Plan",
    image: "/assets/images/plans/gratitude-harvest.png",
  },
  {
    id: "happiness",
    tag: "#Happiness",
    title: "Joy & Cheerfulness",
    meta: "5-Day Guided Plan",
    image: "/assets/images/plans/joy-sunlit-meadow.png",
  },
  {
    id: "patience",
    tag: "#Patience",
    title: "Stillness & Waiting",
    meta: "5-Day Guided Plan",
    image: "/assets/images/plans/patience-seedling-dawn.png",
  },
  {
    id: "hope",
    tag: "#Hope",
    title: "Unshakable Hope",
    meta: "5-Day Guided Plan",
    image: "/assets/images/plans/hope-dawn-horizon.png",
  },
  {
    id: "strength",
    tag: "#Strength",
    title: "Strength in Weakness",
    meta: "5-Day Guided Plan",
    image: "/assets/images/plans/healing-golden-kintsugi.png",
  },
];

export default async function Home() {
  const [data, answeredPrayers, communityStats, customPlansRes] = await Promise.all([
    getHomepageData(),
    getLatestAnsweredPrayers(),
    getCommunityStats(),
    getCustomDevotionals(),
  ]);

  const currentUser = data.user;
  const dbStreak = data.streak;
  const dbProgress = data.progress || {};
  const dbHighlights = data.highlights || {};
  const dbTestimonies = data.testimonies || [];

  const customPlans = customPlansRes.success ? customPlansRes.plans : [];
  const customPlansMap = {};
  customPlans.forEach((p) => {
    customPlansMap[p.id] = p;
  });
  const allPlansMap = { ...devotionals, ...customPlansMap };

  const today = new Date();
  const verseOfTheDay = getVerseOfTheDay(today);
  const dailyTrivia = getDailyTriviaSet(3, today);
  const journalPrompt = JOURNAL_PROMPTS[(verseOfTheDay.dayOfYear - 1) % JOURNAL_PROMPTS.length];
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const firstName = currentUser?.name?.trim()?.split(/\s+/)[0] || "";

  // Calculate active plans
  const activePlans = Object.keys(dbProgress)
    .map((id) => {
      const detail = allPlansMap[id];
      if (!detail || !detail.days?.length) return null;
      const prog = dbProgress[id];
      const completedDaysList = prog.completedDays || [];
      const currentDayIdx = Math.min(detail.days.length - 1, completedDaysList.length);
      const previewText = detail.days[currentDayIdx]?.reflection || "";
      return {
        id,
        title: detail.title,
        days: detail.days.length,
        completed: completedDaysList.length,
        isCompleted: prog.isCompleted,
        percent: Math.round((completedDaysList.length / detail.days.length) * 100),
        preview: previewText,
      };
    })
    .filter((plan) => plan && !plan.isCompleted);

  return (
    <div className="home-shell">
      {/* 1. Split Editorial Hero */}
      <section className="home-hero">
        <div className="container">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <span className="home-hero-pill">
                <i className="ri-sun-line" aria-hidden="true"></i>
                {firstName
                  ? `Welcome back, ${firstName} \u2022 ${formattedDate}`
                  : `${formattedDate} \u2022 Daily Sanctuary`}
              </span>

              <h1 className="home-hero-title">
                A Quiet Sanctuary of{" "}
                <span className="home-hero-accent">Gratitude</span> &amp; Living Faith
              </h1>

              <p className="home-hero-subtitle">
                Anchor your morning in Scripture, build a steady habit of prayerful reflection,
                and bear witness to God&apos;s enduring faithfulness alongside the community.
              </p>

              <div className="home-hero-actions">
                <Link href="/plans" className="home-btn-primary">
                  <i className="ri-compass-3-line" aria-hidden="true"></i>
                  <span>Start Daily Reading</span>
                </Link>
                <Link href="/bible" className="home-btn-secondary">
                  <i className="ri-book-open-line" aria-hidden="true"></i>
                  <span>Read the Bible</span>
                </Link>
                <Link href="/feed?share=true" className="home-btn-ghost">
                  <span>Share a Testimony</span>
                  <i className="ri-arrow-right-line" aria-hidden="true"></i>
                </Link>
              </div>

              <FaithFootprintsTracker stats={communityStats} />
            </div>

            <div>
              <VerseOfTheDaySection
                verseOfTheDay={verseOfTheDay}
                dayOfWeek={dayOfWeek}
                initialHighlights={dbHighlights}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Daily Rhythm Bento */}
      <section id="word-of-the-day" className="home-section">
        <div className="container">
          <div className="home-section-header">
            <div>
              <span className="home-eyebrow">Daily Rhythm</span>
              <h2 className="home-section-title">Walk in Faith Today</h2>
            </div>
            <Link href="/bible" className="home-section-link">
              <span>Open Scripture Reader</span>
              <i className="ri-arrow-right-line" aria-hidden="true"></i>
            </Link>
          </div>

          <div className="home-bento-grid">
            <div className="home-bento-left">
              <StreakTracker currentUser={currentUser} dbStreak={dbStreak} dayOfWeek={dayOfWeek} />
              <JournalWidget currentUser={currentUser} journalPrompt={journalPrompt} />
            </div>

            <div className="home-bento-right">
              <BibleReflectionTrivia
                dailyQuestions={dailyTrivia.questions}
                todayKey={dailyTrivia.dateKey}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. My Active Plans */}
      {activePlans.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="home-section-header">
              <div>
                <span className="home-eyebrow">In Progress</span>
                <h2 className="home-section-title">My Active Plans</h2>
              </div>
              <Link href="/plans" className="home-section-link">
                <span>View All Plans</span>
                <i className="ri-arrow-right-line" aria-hidden="true"></i>
              </Link>
            </div>

            <div className="home-active-grid">
              {activePlans.slice(0, 3).map((plan) => (
                <Link href={`/plans/${plan.id}`} key={plan.id} className="home-active-card">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <span
                      style={{
                        fontSize: "1.18rem",
                        fontWeight: 600,
                        color: "var(--home-gold)",
                      }}
                    >
                      Day {plan.completed} of {plan.days} &bull; {plan.percent}%
                    </span>
                    <h3>{plan.title}</h3>
                    <p
                      style={{
                        fontSize: "1.32rem",
                        lineHeight: 1.55,
                        color: "var(--home-text-muted)",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {plan.preview}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="home-progress-track">
                      <div
                        className="home-progress-fill"
                        style={{ width: `${plan.percent}%` }}
                      ></div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "1.28rem",
                        fontWeight: 600,
                        color: "var(--home-emerald)",
                      }}
                    >
                      <span>Continue Reading</span>
                      <i className="ri-arrow-right-line" aria-hidden="true"></i>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Six Beacons — Guided Devotionals */}
      <section className="home-section">
        <div className="container">
          <div className="home-section-header">
            <div>
              <span className="home-eyebrow">Guided Devotionals</span>
              <h2 className="home-section-title">Six Beacons of Faith</h2>
            </div>
            <Link href="/plans" className="home-section-link">
              <span>Explore All Plans</span>
              <i className="ri-arrow-right-line" aria-hidden="true"></i>
            </Link>
          </div>

          <div className="home-beacons-grid">
            {PLANS_MAPPING.map((beacon) => (
              <Link href={`/plans/${beacon.id}`} key={beacon.id} className="home-beacon-card">
                <Image
                  src={beacon.image}
                  alt={beacon.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 960px) 50vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
                <div className="home-beacon-overlay">
                  <span className="home-beacon-tag">{beacon.tag}</span>
                  <span className="home-beacon-title">{beacon.title}</span>
                  <span className="home-beacon-meta">{beacon.meta}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Answered Prayers */}
      <PrayerWallSnippet answeredPrayers={answeredPrayers} />

      {/* 6. Community Testimonies */}
      {dbTestimonies.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="home-section-header">
              <div>
                <span className="home-eyebrow">Community Stories</span>
                <h2 className="home-section-title">Voices of Gratitude</h2>
              </div>
              <Link href="/feed" className="home-section-link">
                <span>Read All Stories</span>
                <i className="ri-arrow-right-line" aria-hidden="true"></i>
              </Link>
            </div>

            <div className="home-stories-grid">
              {dbTestimonies.slice(0, 4).map((post) => {
                const postImg = post.image || getDefaultTestimonyCover(post.tag);
                return (
                  <Link
                    href={`/posts/${encodeURIComponent(post.id)}`}
                    key={post.id}
                    className="home-story-card"
                  >
                    <div className="home-story-media">
                      <Image
                        src={postImg}
                        alt={post.title || "Testimony"}
                        fill
                        sizes="(max-width: 960px) 100vw, 240px"
                        unoptimized={shouldBypassNextImageOpt(postImg)}
                        style={{ objectFit: "cover" }}
                      />
                    </div>

                    <div className="home-story-body">
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                        <div className="home-story-meta">
                          <span>{post.date}</span>
                          {post.readTime && (
                            <>
                              <span aria-hidden="true">&bull;</span>
                              <span>{post.readTime}</span>
                            </>
                          )}
                        </div>
                        <h3 className="home-story-title">{post.title}</h3>
                        <p className="home-story-excerpt">{post.excerpt}</p>
                      </div>

                      <div className="home-story-author">
                        <span>By {post.author || post.author_name || "Ju & Vicky"}</span>
                        <i className="ri-arrow-right-up-line" aria-hidden="true"></i>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. Sanctuary Closing Banner */}
      <section className="home-section">
        <div className="container">
          <div className="home-closing-card">
            {!currentUser ? (
              <>
                <div>
                  <span className="home-eyebrow">Personal Sanctuary</span>
                  <h2>Carry Your Quiet Time Across Every Device</h2>
                  <p>
                    Create a free PraisePage account to back up scripture highlights, journal
                    reflections, prayer support, and daily reading streaks in the cloud.
                  </p>
                </div>
                <div className="home-closing-actions">
                  <Link href="/signup" className="home-btn-primary">
                    <span>Create Free Account</span>
                    <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  </Link>
                  <Link href="/login" className="home-btn-secondary">
                    Sign In
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="home-eyebrow">Your Sanctuary Notebook</span>
                  <h2>Continue Your Walk Today</h2>
                  <p>
                    Revisit saved scripture highlights and journal entries, gather inspiration from
                    curated quotes, or lift up a prayer with the community.
                  </p>
                </div>
                <div className="home-closing-actions">
                  <Link href="/profile" className="home-btn-primary">
                    <i className="ri-book-mark-line" aria-hidden="true"></i>
                    <span>Open Notebook</span>
                  </Link>
                  <Link href="/quotes" className="home-btn-secondary">
                    <i className="ri-double-quotes-l" aria-hidden="true"></i>
                    <span>Faith Quotes</span>
                  </Link>
                  <Link href="/prayers" className="home-btn-ghost">
                    <span>Prayer Wall</span>
                    <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
