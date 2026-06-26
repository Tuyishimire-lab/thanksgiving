"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStreak, getHighlights, getNotes, getPlansProgress } from "@/data/userState";
import { devotionals } from "@/data/devotionals";

const HIGHLIGHT_COLOR_NAMES = {
  "highlight-yellow": "Yellow",
  "highlight-green": "Green",
  "highlight-blue": "Blue",
  "highlight-pink": "Pink"
};

export default function PersonalProfile() {
  const [streak, setStreak] = useState({ count: 0, lastActive: null });
  const [highlights, setHighlights] = useState({});
  const [notes, setNotes] = useState({});
  const [plansProg, setPlansProg] = useState({});
  const [activeTab, setActiveTab] = useState("notebook");

  useEffect(() => {
    setStreak(getStreak());
    setHighlights(getHighlights());
    setNotes(getNotes());
    setPlansProg(getPlansProgress());
  }, []);

  const hasNotes = Object.keys(notes).length > 0;
  const hasHighlights = Object.keys(highlights).length > 0;
  
  // Find active plans details
  const activePlanList = Object.keys(plansProg).map(id => {
    const detail = devotionals[id];
    if (!detail) return null;
    const progress = plansProg[id];
    return {
      id,
      title: detail.title,
      days: detail.days.length,
      completed: progress.completedDays.length,
      isCompleted: progress.isCompleted,
      percent: Math.round((progress.completedDays.length / detail.days.length) * 100)
    };
  }).filter(Boolean);

  // Parse human readable citations from verseId keys (e.g., "John_3_16" -> "John 3:16")
  const formatVerseRef = (key) => {
    const parts = key.split("_");
    if (parts.length >= 3) {
      const book = parts.slice(0, parts.length - 2).join(" ");
      const chapter = parts[parts.length - 2];
      const verse = parts[parts.length - 1];
      return `${book} ${chapter}:${verse}`;
    }
    return key;
  };

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Profile Card / Streak */}
        <div className="streak-card">
          <div className="streak-number-wrapper">
            <div className="streak-fire-icon">
              <i className="ri-fire-fill"></i>
            </div>
            <div>
              <h3 style={{ fontSize: "2.4rem", color: "var(--light-color)" }}>
                {streak.count} Day Streak!
              </h3>
              <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                {streak.count > 0 ? "Keep growing your daily scripture habit." : "Log in tomorrow to start your streak."}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "1.1rem", display: "block", color: "var(--light-color-alt)" }}>LAST ACTIVE</span>
            <span style={{ fontSize: "1.4rem", fontWeight: "600", color: "var(--light-color)" }}>
              {streak.lastActive ? streak.lastActive.split(" ").slice(1, 3).join(" ") : "Not active yet"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div 
          style={{ 
            display: "flex", 
            borderBottom: "2px solid var(--transparent-light-color)",
            marginBottom: "3rem",
            gap: "2rem"
          }}
        >
          {[
            { id: "notebook", label: "My Notebook", icon: "ri-booklet-line" },
            { id: "highlights", label: "Highlights", icon: "ri-markup-line" },
            { id: "plans", label: "My Plans", icon: "ri-calendar-todo-line" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                paddingBlock: "1.5rem",
                color: activeTab === tab.id ? "var(--light-color)" : "var(--light-color-alt)",
                borderBottom: activeTab === tab.id ? "3px solid var(--accent-color)" : "3px solid transparent",
                fontSize: "1.5rem",
                fontWeight: activeTab === tab.id ? "700" : "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                transition: "all 0.25s"
              }}
            >
              <i className={tab.icon} style={{ fontSize: "1.8rem" }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div>
          {/* 1. Notebook Tab */}
          {activeTab === "notebook" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {!hasNotes ? (
                <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--light-color-alt)" }}>
                  <i className="ri-quill-pen-line" style={{ fontSize: "5rem", display: "block", marginBottom: "1.5rem" }}></i>
                  <p style={{ fontSize: "1.5rem" }}>You haven't written any reflections yet.</p>
                  <Link href="/bible" style={{ display: "inline-block", marginTop: "2rem", padding: "1rem 2rem", background: "var(--accent-color)", color: "white", borderRadius: "30px", fontWeight: "600" }}>
                    Read the Bible & Add Notes
                  </Link>
                </div>
              ) : (
                Object.keys(notes).map((key) => {
                  const note = notes[key];
                  const citation = formatVerseRef(key);
                  return (
                    <div 
                      key={key} 
                      style={{
                        background: "var(--secondary-background-color)",
                        padding: "3rem",
                        borderRadius: "10px",
                        borderLeft: "4px solid #a767e5",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "#a767e5", textTransform: "uppercase" }}>
                          {citation}
                        </span>
                        <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                          {note.timestamp}
                        </span>
                      </div>
                      <p style={{ fontSize: "1.5rem", lineHeight: "1.6", color: "var(--light-color)" }}>
                        {note.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. Highlights Tab */}
          {activeTab === "highlights" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {!hasHighlights ? (
                <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--light-color-alt)" }}>
                  <i className="ri-markup-line" style={{ fontSize: "5rem", display: "block", marginBottom: "1.5rem" }}></i>
                  <p style={{ fontSize: "1.5rem" }}>You haven't highlighted any scriptures yet.</p>
                  <Link href="/bible" style={{ display: "inline-block", marginTop: "2rem", padding: "1rem 2rem", background: "var(--accent-color)", color: "white", borderRadius: "30px", fontWeight: "600" }}>
                    Browse Bible
                  </Link>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "2rem" }}>
                  {Object.keys(highlights).map((key) => {
                    const colorClass = highlights[key];
                    const citation = formatVerseRef(key);
                    const colorName = HIGHLIGHT_COLOR_NAMES[colorClass] || "Highlighted";
                    
                    return (
                      <div 
                        key={key} 
                        style={{
                          background: "var(--secondary-background-color)",
                          padding: "2.5rem",
                          borderRadius: "8px",
                          border: "1px solid var(--transparent-light-color)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "1.6rem", fontWeight: "700", color: "var(--light-color)", display: "block" }}>
                            {citation}
                          </span>
                          <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                            Color: {colorName}
                          </span>
                        </div>

                        {/* Dot indicator */}
                        <div 
                          className={colorClass} 
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            borderRadius: "50%",
                            border: "1px solid rgba(255,255,255,0.15)"
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Plans Tab */}
          {activeTab === "plans" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {activePlanList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--light-color-alt)" }}>
                  <i className="ri-calendar-todo-line" style={{ fontSize: "5rem", display: "block", marginBottom: "1.5rem" }}></i>
                  <p style={{ fontSize: "1.5rem" }}>You aren't enrolled in any reading plans.</p>
                  <Link href="/plans" style={{ display: "inline-block", marginTop: "2rem", padding: "1rem 2rem", background: "var(--accent-color)", color: "white", borderRadius: "30px", fontWeight: "600" }}>
                    Find a Devotional Plan
                  </Link>
                </div>
              ) : (
                activePlanList.map((plan) => (
                  <div 
                    key={plan.id}
                    style={{
                      background: "var(--secondary-background-color)",
                      padding: "3rem",
                      borderRadius: "10px",
                      border: "1px solid var(--transparent-light-color)",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <h4 style={{ fontSize: "1.8rem", color: "var(--light-color)", marginBottom: "0.5rem" }}>
                          {plan.title}
                        </h4>
                        <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>
                          {plan.isCompleted ? "COMPLETED" : `DAY ${plan.completed} OF ${plan.days}`}
                        </span>
                      </div>
                      
                      <Link
                        href={`/plans/${plan.id}`}
                        style={{
                          padding: "0.6rem 1.8rem",
                          borderRadius: "20px",
                          background: plan.isCompleted ? "var(--transparent-light-color)" : "var(--accent-color)",
                          color: "white",
                          fontSize: "1.2rem",
                          fontWeight: "700"
                        }}
                      >
                        {plan.isCompleted ? "Read Again" : "Resume Plan"}
                      </Link>
                    </div>

                    <div>
                      <div className="progress-bar-container" style={{ margin: "0" }}>
                        <div className="progress-bar-fill" style={{ width: `${plan.percent}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
