"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStreak, updateStreak, getPlansProgress, getHighlights } from "@/data/userState";
import { verses } from "@/data/verses";
import { devotionals } from "@/data/devotionals";
import { posts } from "@/data/posts";
import VerseActionsModal from "@/components/VerseActionsModal";

const PLANS_MAPPING = [
  { id: "love", title: "#Love", image: "/assets/images/tags/travel-tag.jpg" },
  { id: "gratitude", title: "#Gratitude", image: "/assets/images/tags/food-tag.jpg" },
  { id: "happiness", title: "#Happiness", image: "/assets/images/tags/technology-tag.jpg" },
  { id: "patience", title: "#Patience", image: "/assets/images/tags/health-tag.jpg" },
  { id: "hope", title: "#Hope", image: "/assets/images/tags/nature-tag.jpg" },
  { id: "strength", title: "#Strength", image: "/assets/images/tags/fitness-tag.jpg" }
];

export default function Home() {
  const [streak, setStreak] = useState({ count: 0, lastActive: null });
  const [activePlans, setActivePlans] = useState([]);
  const [verseOfTheDay, setVerseOfTheDay] = useState(null);
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [activeVerse, setActiveVerse] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // 1. Update and load daily streak
    const updated = updateStreak();
    setStreak(updated);

    // 2. Load active plans
    const progress = getPlansProgress();
    const activeList = Object.keys(progress)
      .map((id) => {
        const detail = devotionals[id];
        if (!detail) return null;
        const prog = progress[id];
        return {
          id,
          title: detail.title,
          days: detail.days.length,
          completed: prog.completedDays.length,
          isCompleted: prog.isCompleted,
          percent: Math.round((prog.completedDays.length / detail.days.length) * 100)
        };
      })
      .filter((plan) => plan && !plan.isCompleted); // Only show ongoing plans
    
    setActivePlans(activeList);

    // 3. Load Verse of the Day
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    
    // Match date string used in the verses.js dataset
    const targetDateStr = `2024-${month}-${day}`;
    const currentVerse = verses.find((v) => v.date === targetDateStr) || verses[0];
    
    // Format id for the highlights check (standardize to e.g. "Romans_8_28" or date string)
    // To keep it simple, we key it by a normalized representation
    const formattedId = `votd_${month}_${day}`;
    
    setVerseOfTheDay({
      ...currentVerse,
      id: formattedId
    });
    
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    setDayOfWeek(dayName);
  }, [updateTrigger]);

  useEffect(() => {
    setHighlights(getHighlights());
  }, [updateTrigger]);

  if (!verseOfTheDay) return null;

  return (
    <>
      {/* 1. Streak Tracker Dashboard Widget */}
      <section style={{ paddingTop: "4rem", paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <div className="streak-card">
            <div className="streak-number-wrapper">
              <div className="streak-fire-icon">
                <i className="ri-fire-fill"></i>
              </div>
              <div>
                <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)" }}>
                  Daily Streak: {streak.count} {streak.count === 1 ? "Day" : "Days"}
                </h3>
                <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                  Good job! You logged in today. Keep building your daily reflection habit.
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "1.1rem", display: "block", color: "var(--light-color-alt)" }}>MY BIBLE STATE</span>
              <span style={{ fontSize: "1.4rem", fontWeight: "600", color: "var(--accent-color)" }}>
                Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Verse of the Day Card (Clickable) */}
      <section id="word-of-the-day" style={{ paddingBlock: "2rem" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <div 
            className={`verse-of-the-day-card ${highlights[verseOfTheDay.id] || ""}`} 
            style={{ 
              cursor: "pointer", 
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
              border: "1px solid var(--transparent-light-color)",
              transition: "transform 0.25s, background-color 0.25s"
            }}
            onClick={() => setActiveVerse({
              id: verseOfTheDay.id,
              text: verseOfTheDay.verse,
              tag: verseOfTheDay.tag
            })}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.01)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <div className="verse-of-the-day-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Verse of the Day: {dayOfWeek}</span>
              <i className="ri-bookmark-line" style={{ fontSize: "2.2rem", opacity: 0.7 }}></i>
            </div>
            <div className="verse-of-the-day-content" style={{ fontStyle: "italic", fontSize: "2rem", lineHeight: "1.6" }}>
              "{verseOfTheDay.verse}"
            </div>
            <div className="verse-of-the-day-tag" style={{ color: "var(--light-color-alt)", fontWeight: "600" }}>
              {verseOfTheDay.tag}
            </div>
            
            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", alignItems: "center", fontSize: "1.2rem", opacity: 0.8 }}>
              <i className="ri-tap-line"></i>
              <span>Tap verse to highlight, write a reflection note, or share</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Active Devotional Plans (If Enrolled) */}
      {activePlans.length > 0 && (
        <section className="section" style={{ paddingBlock: "2rem" }}>
          <div className="container" style={{ maxWidth: "1000px" }}>
            <h2 className="title section-title" data-name="Devotionals" style={{ marginBottom: "2rem" }}>
              My Active Plans
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {activePlans.map((plan) => (
                <div 
                  key={plan.id}
                  style={{
                    background: "var(--secondary-background-color)",
                    padding: "2.5rem 3rem",
                    borderRadius: "12px",
                    boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
                    border: "1px solid var(--transparent-light-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <h4 style={{ fontSize: "1.8rem", color: "var(--light-color)" }}>{plan.title}</h4>
                      <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                        Day {plan.completed} of {plan.days} completed
                      </span>
                    </div>

                    <Link 
                      href={`/plans/${plan.id}`}
                      style={{
                        padding: "0.8rem 2.5rem",
                        background: "var(--accent-color)",
                        color: "white",
                        borderRadius: "30px",
                        fontWeight: "700",
                        fontSize: "1.3rem"
                      }}
                    >
                      Continue Reading
                    </Link>
                  </div>

                  <div className="progress-bar-container" style={{ margin: "0" }}>
                    <div className="progress-bar-fill" style={{ width: `${plan.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Testimonies Section */}
      <section className="older-posts section" style={{ paddingBlock: "4rem" }}>
        <div className="container">
          <h2 className="title section-title" data-name="Stories">
            Testimonies
          </h2>

          <div className="older-posts-grid-wrapper d-grid">
            {posts.map((post) => (
              <Link href={`/feed`} key={post.id} className="article d-grid">
                <div className="older-posts-article-image-wrapper">
                  <img src={post.image} alt={post.title} className="article-image" />
                </div>

                <div className="article-data-container">
                  <div className="article-data">
                    <span>{post.date}</span>
                    <span className="article-data-spacer"></span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="title article-title">{post.title}</h3>
                  <p className="article-description">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Six Beacons Section (Reading Plans Shortcuts) */}
      <section className="popular-tags section" style={{ paddingBlock: "4rem" }}>
        <div className="container">
          <h2 className="title section-title" data-name="Plans">
            Our Six Beacons
          </h2>

          <div className="popular-tags-container d-grid">
            {PLANS_MAPPING.map((beacon) => (
              <Link href={`/plans/${beacon.id}`} key={beacon.id} className="article">
                <span className="tag-name">{beacon.title}</span>
                <img src={beacon.image} alt={beacon.title} className="article-image" />
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
