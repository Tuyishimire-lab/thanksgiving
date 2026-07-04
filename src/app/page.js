import Link from "next/link";
import { verses } from "@/data/verses";
import { devotionals } from "@/data/devotionals";
import { getHomepageData, getLatestAnsweredPrayers, getCommunityStats, getCustomDevotionals } from "@/app/actions/dbActions";
import { JOURNAL_PROMPTS } from "@/data/journalPrompts";
import StreakTracker from "@/components/StreakTracker";
import VerseOfTheDaySection from "@/components/VerseOfTheDaySection";
import JournalWidget from "@/components/JournalWidget";
import PrayerWallSnippet from "@/components/PrayerWallSnippet";
import BibleReflectionTrivia from "@/components/BibleReflectionTrivia";
import FaithFootprintsTracker from "@/components/FaithFootprintsTracker";

export const dynamic = "force-dynamic";

const PLANS_MAPPING = [
  { id: "love", title: "#Love", subtitle: "Walk in Love • 5 Days", image: "/assets/images/tags/travel-tag.jpg" },
  { id: "gratitude", title: "#Gratitude", subtitle: "Thanks in All Things • 5 Days", image: "/assets/images/tags/food-tag.jpg" },
  { id: "happiness", title: "#Happiness", subtitle: "Joy & Cheerfulness • 5 Days", image: "/assets/images/tags/technology-tag.jpg" },
  { id: "patience", title: "#Patience", subtitle: "Stillness & Waiting • 5 Days", image: "/assets/images/tags/health-tag.jpg" },
  { id: "hope", title: "#Hope", subtitle: "Unshakable Hope • 5 Days", image: "/assets/images/tags/nature-tag.jpg" },
  { id: "strength", title: "#Strength", subtitle: "Strength in Weakness • 5 Days", image: "/assets/images/tags/fitness-tag.jpg" }
];

export default async function Home() {
  const [data, answeredPrayers, communityStats, customPlansRes] = await Promise.all([
    getHomepageData(),
    getLatestAnsweredPrayers(),
    getCommunityStats(),
    getCustomDevotionals()
  ]);
  const currentUser = data.user;
  const dbStreak = data.streak;
  const dbProgress = data.progress || {};
  const dbHighlights = data.highlights || {};
  const dbTestimonies = data.testimonies || [];

  const customPlans = customPlansRes.success ? customPlansRes.plans : [];
  const customPlansMap = {};
  customPlans.forEach(p => {
    customPlansMap[p.id] = p;
  });
  const allPlansMap = { ...devotionals, ...customPlansMap };

  // Deterministic Verse of the Day (Day of the Year rotation)
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = (today - start) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const verseIndex = dayOfYear % verses.length;
  const currentVerse = verses[verseIndex] || verses[0];
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const formattedId = `votd_${month}_${day}`;
  
  const verseOfTheDay = {
    ...currentVerse,
    id: formattedId
  };
  
  const journalPrompt = JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

  // Calculate active plans
  const activePlans = Object.keys(dbProgress)
    .map((id) => {
      const detail = allPlansMap[id];
      if (!detail) return null;
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
        preview: previewText
      };
    })
    .filter((plan) => plan && !plan.isCompleted);

  return (
    <>
      {/* 0. Hero Welcome Banner */}
      <section className="hero-welcome-section">
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 className="hero-welcome-title">
            A Sanctuary of <span className="hero-welcome-title-accent-green">Gratitude</span> & <span className="hero-welcome-title-accent-gradient">Faith</span>
          </h1>
          <p className="hero-welcome-desc">
            Anchor your soul in God's Word, nurture a daily habit of devotion, and declare His enduring faithfulness through your testimonies.
          </p>
          <div className="hero-welcome-actions">
            <Link href="/plans" className="hero-welcome-btn-primary">
              Start Daily Reading
            </Link>
            <Link href="/bible" className="hero-welcome-btn-secondary">
              Read the Bible
            </Link>
            <Link href="/feed?share=true" className="hero-welcome-btn-accent">
              Share a Testimony
            </Link>
          </div>
        </div>
      </section>

      {/* 0.5 Faith Footprints Community Impact Tracker */}
      <section style={{ paddingTop: "3rem", paddingBottom: "0rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <FaithFootprintsTracker stats={communityStats} />
        </div>
      </section>

      {/* 1. Streak Tracker Dashboard Widget */}
      <section style={{ paddingTop: "4rem", paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <StreakTracker currentUser={currentUser} dbStreak={dbStreak} dayOfWeek={dayOfWeek} />
        </div>
      </section>

      {/* 2. Verse of the Day & Bible Reflection Trivia Side-by-Side */}
      <section id="word-of-the-day" style={{ paddingTop: "0.5rem", paddingBottom: "2rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <div className="homepage-grid-layout" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem",
            alignItems: "stretch"
          }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <VerseOfTheDaySection 
                verseOfTheDay={verseOfTheDay} 
                dayOfWeek={dayOfWeek} 
                initialHighlights={dbHighlights}
                currentUser={currentUser}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <BibleReflectionTrivia />
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 Daily Gratitude Journal Prompt Widget */}
      <section style={{ paddingTop: "0.5rem", paddingBottom: "2rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <JournalWidget currentUser={currentUser} journalPrompt={journalPrompt} />
        </div>
      </section>

      {/* 3. Active Devotional Plans */}
      {activePlans.length > 0 && (
        <section className="section" style={{ paddingBlock: "2rem" }}>
          <div className="container" style={{ maxWidth: "1000px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
              <h2 className="title section-title" data-name="Devotionals" style={{ margin: 0 }}>
                My Active Plans
              </h2>
              {activePlans.length > 3 && (
                <Link href="/plans" className="view-all-plans-link">
                  View All ({activePlans.length}) &rarr;
                </Link>
              )}
            </div>

            <div className="active-plans-grid">
              {activePlans.slice(0, 3).map((plan) => (
                <Link href={`/plans/${plan.id}`} key={plan.id} className="active-plan-tile">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <h4 style={{ 
                      fontSize: "1.6rem", 
                      fontWeight: "700", 
                      color: "var(--light-color)",
                      lineHeight: "1.3",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {plan.title}
                    </h4>
                    <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                      Day {plan.completed} of {plan.days}
                    </span>
                    <p style={{ 
                      fontSize: "1.15rem", 
                      lineHeight: "1.4", 
                      color: "var(--light-color-alt)",
                      opacity: 0.85,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      marginBlockStart: "0.5rem"
                    }}>
                      {plan.preview}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="progress-bar-container" style={{ margin: "0", height: "6px" }}>
                      <div className="progress-bar-fill" style={{ width: `${plan.percent}%` }}></div>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      fontSize: "1.2rem", 
                      fontWeight: "600",
                      color: "var(--accent-color)" 
                    }}>
                      <span>Continue</span>
                      <i className="ri-arrow-right-line"></i>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3.5 Answered Prayers Board Snippet */}
      <PrayerWallSnippet answeredPrayers={answeredPrayers} />

      {/* 4. Testimonies Section */}
      <section className="older-posts section" style={{ paddingBlock: "4rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <h2 className="title section-title" data-name="Stories">
            Testimonies
          </h2>

          <div className="testimonies-grid">
            {dbTestimonies.slice(0, 4).map((post) => (
              <Link href={`/feed`} key={post.id} className="testimony-tile-card">
                <div className="testimony-image-wrapper">
                  <img src={post.image} alt={post.title} />
                </div>

                <div className="testimony-content">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div className="article-data" style={{ margin: 0, padding: 0 }}>
                      <span style={{ fontSize: "1rem" }}>{post.date}</span>
                      <span className="article-data-spacer"></span>
                      <span style={{ fontSize: "1rem" }}>{post.readTime}</span>
                    </div>
                    <h4 style={{ 
                      fontSize: "1.4rem", 
                      fontWeight: "700", 
                      color: "var(--light-color)",
                      lineHeight: "1.3",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      marginBlock: "0.2rem"
                    }}>
                      {post.title}
                    </h4>
                    <p style={{ 
                      fontSize: "1.1rem", 
                      lineHeight: "1.4", 
                      color: "var(--light-color-alt)",
                      opacity: 0.85,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {post.excerpt}
                    </p>
                  </div>
                  
                  <span style={{ 
                    color: "var(--accent-color)", 
                    fontWeight: "600", 
                    fontSize: "1.1rem",
                    marginBlockStart: "0.5rem" 
                  }}>
                    By {post.author || post.author_name || "Ju & Vicky"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Six Beacons Section (Reading Plans Shortcuts) */}
      <section className="popular-tags section" style={{ paddingBlock: "4rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <h2 className="title section-title" data-name="Plans">
            Our Six Beacons
          </h2>

          <div className="popular-tags-container d-grid" style={{ gap: "1.5rem" }}>
            {PLANS_MAPPING.map((beacon) => (
              <Link href={`/plans/${beacon.id}`} key={beacon.id} className="beacon-tile-link">
                <img src={beacon.image} alt={beacon.title} className="article-image" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", margin: 0 }} />
                <div className="beacon-overlay" style={{
                  position: "absolute",
                  inset: "0",
                  background: "linear-gradient(to top, rgba(19, 20, 23, 0.9), rgba(19, 20, 23, 0.5))",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "1.2rem",
                  transition: "background 0.3s ease"
                }}>
                  <span style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "var(--accent-color)",
                    padding: "0.3rem 0.8rem",
                    borderRadius: "20px",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    alignSelf: "flex-start",
                    marginBottom: "0.4rem",
                    letterSpacing: "0.5px"
                  }}>
                    {beacon.title}
                  </span>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "500" }}>
                    {beacon.subtitle}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
