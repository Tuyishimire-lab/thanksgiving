"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStreak, updateStreak, getPlansProgress, getHighlights, getLocalTestimonies, saveTestimony } from "@/data/userState";
import { verses } from "@/data/verses";
import { devotionals } from "@/data/devotionals";
import { posts } from "@/data/posts";
import VerseActionsModal from "@/components/VerseActionsModal";
import { getHomepageData } from "@/app/actions/dbActions";

const PLANS_MAPPING = [
  { id: "love", title: "#Love", subtitle: "Walk in Love • 5 Days", image: "/assets/images/tags/travel-tag.jpg" },
  { id: "gratitude", title: "#Gratitude", subtitle: "Thanks in All Things • 5 Days", image: "/assets/images/tags/food-tag.jpg" },
  { id: "happiness", title: "#Happiness", subtitle: "Joy & Cheerfulness • 5 Days", image: "/assets/images/tags/technology-tag.jpg" },
  { id: "patience", title: "#Patience", subtitle: "Stillness & Waiting • 5 Days", image: "/assets/images/tags/health-tag.jpg" },
  { id: "hope", title: "#Hope", subtitle: "Unshakable Hope • 5 Days", image: "/assets/images/tags/nature-tag.jpg" },
  { id: "strength", title: "#Strength", subtitle: "Strength in Weakness • 5 Days", image: "/assets/images/tags/fitness-tag.jpg" }
];

export default function Home() {
  const [streak, setStreak] = useState({ count: 0, lastActive: null });
  const [activePlans, setActivePlans] = useState([]);
  const [verseOfTheDay, setVerseOfTheDay] = useState(null);
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [activeVerse, setActiveVerse] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [homepageTestimonies, setHomepageTestimonies] = useState([]);

  useEffect(() => {
    async function initUserAndState() {
      const data = await getHomepageData();
      setCurrentUser(data.user);
      
      let currentStreak = { count: 0, lastActive: null };
      let activeProgress = {};
      let userHighlights = {};
      let mergeTestimonies = [];

      if (data.user) {
        currentStreak = data.streak || { count: 0, lastActive: null };
        activeProgress = data.progress || {};
        userHighlights = data.highlights || {};
        mergeTestimonies = data.testimonies || [];
      } else {
        // Logged out: fallback to localStorage
        const localStreak = updateStreak();
        currentStreak = localStreak;
        activeProgress = getPlansProgress();
        userHighlights = getHighlights();

        const localPosts = getLocalTestimonies();
        const formattedStatic = posts.map(p => ({
          ...p,
          author: "Ju & Vicky",
          bodyText: p.content.map(c => c.text).join("\n\n")
        }));
        const formattedLocal = localPosts.map(p => ({
          ...p,
          bodyText: p.content.map(c => c.text).join("\n\n")
        }));
        mergeTestimonies = [...formattedLocal, ...formattedStatic];
      }

      setStreak(currentStreak);
      setHighlights(userHighlights);
      setHomepageTestimonies(mergeTestimonies.slice(0, 4));

      // Calculate active plans
      const activeList = Object.keys(activeProgress)
        .map((id) => {
          const detail = devotionals[id];
          if (!detail) return null;
          const prog = activeProgress[id];
          const currentDayIdx = Math.min(detail.days.length - 1, prog.completedDays.length);
          const previewText = detail.days[currentDayIdx]?.reflection || "";
          return {
            id,
            title: detail.title,
            days: detail.days.length,
            completed: prog.completedDays.length,
            isCompleted: prog.isCompleted,
            percent: Math.round((prog.completedDays.length / detail.days.length) * 100),
            preview: previewText
          };
        })
        .filter((plan) => plan && !plan.isCompleted); // Only show ongoing plans
      
      setActivePlans(activeList);

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
      
      setVerseOfTheDay({
        ...currentVerse,
        id: formattedId
      });
      
      const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
      setDayOfWeek(dayName);
    }

    initUserAndState();
  }, [updateTrigger]);

  const isLoading = !verseOfTheDay;

  return (
    <>
      {/* 0. Hero Welcome Banner */}
      <section 
        style={{
          background: "radial-gradient(circle at top right, rgba(79, 207, 112, 0.15), transparent 60%), radial-gradient(circle at bottom left, rgba(167, 103, 229, 0.12), transparent 50%)",
          paddingBlock: "6rem 4rem",
          borderBottom: "1px solid var(--transparent-light-color)",
          textAlign: "center"
        }}
      >
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 
            style={{ 
              fontSize: "3.6rem", 
              fontWeight: "700", 
              color: "var(--light-color)",
              lineHeight: "1.2",
              marginBottom: "1.5rem",
              letterSpacing: "-0.5px"
            }}
          >
            A Sanctuary of <span style={{ color: "var(--accent-color)" }}>Gratitude</span> & <span style={{ background: "linear-gradient(45deg, #a767e5, #12bcfe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Faith</span>
          </h1>
          <p 
            style={{ 
              fontSize: "1.6rem", 
              color: "var(--light-color-alt)", 
              lineHeight: "1.6",
              maxWidth: "600px",
              margin: "0 auto 3rem auto"
            }}
          >
            Reflect on God's word, build your daily devotional habit, and share testimonies of His faithfulness.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link 
              href="/plans" 
              style={{
                background: "var(--accent-color)",
                color: "#131417",
                padding: "1.2rem 2.5rem",
                borderRadius: "30px",
                fontWeight: "700",
                fontSize: "1.4rem",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                boxShadow: "0 4px 15px rgba(79, 207, 112, 0.3)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 207, 112, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 207, 112, 0.3)";
              }}
            >
              Start Daily Reading
            </Link>
            <Link 
              href="/bible" 
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "var(--light-color)",
                padding: "1.2rem 2.5rem",
                borderRadius: "30px",
                fontWeight: "600",
                fontSize: "1.4rem",
                border: "1px solid var(--transparent-light-color)",
                transition: "background 0.2s ease, transform 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Read the Bible
            </Link>
            <Link 
              href="/feed?share=true" 
              style={{
                background: "linear-gradient(45deg, rgba(167, 103, 229, 0.15), rgba(18, 188, 254, 0.15))",
                color: "var(--light-color)",
                padding: "1.2rem 2.5rem",
                borderRadius: "30px",
                fontWeight: "600",
                fontSize: "1.4rem",
                border: "1px solid rgba(167, 103, 229, 0.3)",
                transition: "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "linear-gradient(45deg, rgba(167, 103, 229, 0.25), rgba(18, 188, 254, 0.25))";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(167, 103, 229, 0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "linear-gradient(45deg, rgba(167, 103, 229, 0.15), rgba(18, 188, 254, 0.15))";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Share a Testimony
            </Link>
          </div>
        </div>
      </section>

      {/* 1. Streak Tracker Dashboard Widget */}
      <section style={{ paddingTop: "4rem", paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <div className="streak-card" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
              <div className="streak-number-wrapper" style={{ gap: "1.2rem", display: "flex", alignItems: "center" }}>
                <div className="streak-fire-icon" style={{ fontSize: "3.2rem", color: "var(--accent-color)" }}>
                  <i className="ri-fire-fill"></i>
                </div>
                <div>
                  {isLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div className="shimmer" style={{ width: "100px", height: "1.6rem", borderRadius: "4px" }}></div>
                      <div className="shimmer" style={{ width: "80px", height: "1.1rem", borderRadius: "4px" }}></div>
                    </div>
                  ) : (
                    <>
                      <h3 style={{ fontSize: "1.8rem", fontWeight: "600", color: "var(--light-color)" }}>
                        {streak.count} Day Streak
                      </h3>
                      <p style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                        Nourish your soul daily
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {isLoading ? (
                  <span className="shimmer" style={{ width: "60px", height: "2rem", borderRadius: "30px", display: "inline-block" }}></span>
                ) : (
                  <span style={{
                    background: "rgba(79, 207, 112, 0.12)",
                    color: "var(--accent-color)",
                    padding: "0.4rem 1.2rem",
                    borderRadius: "30px",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    letterSpacing: "0.5px"
                  }}>
                    ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* 7-Day Habit Progress Row */}
            {!isLoading && (
              <div style={{
                borderTop: "1px solid var(--transparent-light-color)",
                paddingTop: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem"
              }}>
                <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600", letterSpacing: "1px" }}>
                  THIS WEEK'S WALK:
                </span>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayAbbr, idx) => {
                    const dayIndexMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
                    const todayAbbr = dayOfWeek.substring(0, 3);
                    const currentDayIdx = dayIndexMap[todayAbbr] ?? 0;
                    
                    // Highlight if it's today or within the active streak range
                    const isActive = idx === currentDayIdx || 
                      (idx < currentDayIdx && idx >= currentDayIdx - (streak.count - 1));
                    
                    const isToday = idx === currentDayIdx;

                    return (
                      <div 
                        key={dayAbbr} 
                        style={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          gap: "0.5rem" 
                        }}
                      >
                        <div 
                          style={{
                            width: "3rem",
                            height: "3rem",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            fontWeight: "700",
                            background: isActive 
                              ? "var(--accent-color)" 
                              : "rgba(255, 255, 255, 0.05)",
                            color: isActive ? "#131417" : "var(--light-color-alt)",
                            border: isToday ? "1.5px solid var(--accent-color)" : "1px solid transparent",
                            boxShadow: isActive ? "0 0 10px rgba(79, 207, 112, 0.4)" : "none",
                            transition: "all 0.3s ease"
                          }}
                        >
                          {isActive ? (
                            <i className="ri-check-line" style={{ fontSize: "1.4rem" }}></i>
                          ) : (
                            dayAbbr[0]
                          )}
                        </div>
                        <span style={{ 
                          fontSize: "1rem", 
                          fontWeight: isToday ? "700" : "500", 
                          color: isToday ? "var(--light-color)" : "var(--light-color-alt)" 
                        }}>
                          {dayAbbr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Verse of the Day Card (Clickable) */}
      <section id="word-of-the-day" style={{ paddingTop: "0.5rem", paddingBottom: "2rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          {isLoading ? (
            <div 
              className="verse-of-the-day-card" 
              style={{ 
                padding: "2rem"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="shimmer" style={{ width: "150px", height: "1.1rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "1.8rem", height: "1.8rem", borderRadius: "4px" }}></div>
                </div>
                <div className="shimmer" style={{ width: "100%", height: "1.7rem", borderRadius: "4px", marginBlock: "0.5rem" }}></div>
                <div className="shimmer" style={{ width: "80%", height: "1.7rem", borderRadius: "4px", marginBlock: "0.5rem" }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--transparent-light-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                  <div className="shimmer" style={{ width: "120px", height: "1.2rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "90px", height: "1.1rem", borderRadius: "4px" }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`verse-of-the-day-card ${highlights[verseOfTheDay.id] || ""}`} 
              onClick={() => setActiveVerse({
                id: verseOfTheDay.id,
                text: verseOfTheDay.verse,
                tag: verseOfTheDay.tag
              })}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.01)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              style={{ cursor: "pointer" }}
            >
              <div className="verse-of-the-day-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span>Verse of the Day • {dayOfWeek}</span>
                <i className="ri-double-quotes-r" style={{ fontSize: "1.8rem", color: "var(--accent-color)", opacity: 0.8 }}></i>
              </div>
              <div className="verse-of-the-day-content">
                "{verseOfTheDay.verse}"
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid var(--transparent-light-color)", paddingTop: "1rem" }}>
                <span className="verse-of-the-day-tag" style={{ margin: 0 }}>
                  — {verseOfTheDay.tag}
                </span>
                <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", display: "flex", alignItems: "center", gap: "0.5rem", opacity: 0.8 }}>
                  <i className="ri-tap-line" style={{ fontSize: "1.3rem" }}></i>
                  Reflect & Share
                </span>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* 3. Active Devotional Plans (If Enrolled) */}
      {activePlans.length > 0 && (
        <section className="section" style={{ paddingBlock: "2rem" }}>
          <div className="container" style={{ maxWidth: "1000px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
              <h2 className="title section-title" data-name="Devotionals" style={{ margin: 0 }}>
                My Active Plans
              </h2>
              {activePlans.length > 3 && (
                <Link 
                  href="/plans" 
                  style={{ 
                    fontSize: "1.4rem", 
                    color: "var(--accent-color)", 
                    fontWeight: "600",
                    textDecoration: "none",
                    borderBottom: "1px solid transparent",
                    transition: "border-color 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--accent-color)"}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "transparent"}
                >
                  View All ({activePlans.length}) &rarr;
                </Link>
              )}
            </div>

            <div className="active-plans-grid">
              {activePlans.slice(0, 3).map((plan) => (
                <Link 
                  href={`/plans/${plan.id}`}
                  key={plan.id}
                  className="active-plan-tile"
                >
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

      {/* 4. Testimonies Section */}
      <section className="older-posts section" style={{ paddingBlock: "4rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <h2 className="title section-title" data-name="Stories">
            Testimonies
          </h2>

          <div className="testimonies-grid">
            {homepageTestimonies.map((post) => (
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
                    By {post.author}
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
              <Link 
                href={`/plans/${beacon.id}`} 
                key={beacon.id} 
                className="article"
                style={{
                  position: "relative",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  aspectRatio: "4 / 3",
                  display: "block"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.03) translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(79, 207, 112, 0.25)";
                  const overlay = e.currentTarget.querySelector('.beacon-overlay');
                  if (overlay) overlay.style.background = "linear-gradient(to top, rgba(19, 20, 23, 0.95), rgba(19, 20, 23, 0.4))";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
                  const overlay = e.currentTarget.querySelector('.beacon-overlay');
                  if (overlay) overlay.style.background = "linear-gradient(to top, rgba(19, 20, 23, 0.9), rgba(19, 20, 23, 0.5))";
                }}
              >
                <img 
                  src={beacon.image} 
                  alt={beacon.title} 
                  className="article-image" 
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    margin: 0
                  }}
                />
                <div 
                  className="beacon-overlay"
                  style={{
                    position: "absolute",
                    inset: "0",
                    background: "linear-gradient(to top, rgba(19, 20, 23, 0.9), rgba(19, 20, 23, 0.5))",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "1.2rem",
                    transition: "background 0.3s ease"
                  }}
                >
                  <span 
                    style={{
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
                    }}
                  >
                    {beacon.title}
                  </span>
                  <span 
                    style={{ 
                      fontSize: "1.1rem", 
                      color: "var(--light-color-alt)",
                      fontWeight: "500"
                    }}
                  >
                    {beacon.subtitle}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Modal Actions Overlay */}
      {activeVerse && (
        <VerseActionsModal
          verseText={activeVerse.text}
          verseTag={activeVerse.tag}
          verseId={activeVerse.id}
          onClose={() => setActiveVerse(null)}
          onStateChange={() => setUpdateTrigger(prev => prev + 1)}
        />
      )}
    </>
  );
}
