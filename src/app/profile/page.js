"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStreak, getHighlights, getNotes, getPlansProgress, getPlanReflections as getPlanReflectionsLocal } from "@/data/userState";
import { devotionals } from "@/data/devotionals";
import { getProfileData } from "@/app/actions/dbActions";

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
  const [reflections, setReflections] = useState({});
  const [activeTab, setActiveTab] = useState("notebook");
  const [notebookSubTab, setNotebookSubTab] = useState("bible-notes");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      const data = await getProfileData();
      const currentUser = data.user;
      setUser(currentUser);
      
      const today = new Date();
      const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
      setDayOfWeek(dayName);

      if (currentUser) {
        // Load data from DB consolidated payload
        setStreak({ count: currentUser.streak_count, lastActive: currentUser.last_active });
        setNotes(data.notebook?.notes || {});
        setHighlights(data.notebook?.highlights || {});
        setPlansProg(data.progress || {});
        setReflections(data.reflections || {});
      } else {
        // Fallback to local storage for guests
        setStreak(getStreak());
        setHighlights(getHighlights());
        setNotes(getNotes());
        setPlansProg(getPlansProgress());
        setReflections(getPlanReflectionsLocal());
      }
      setLoadingUser(false);
    }
    
    loadUserData();
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

  if (loadingUser) {
    return (
      <div className="place-items-center" style={{ width: "100%", height: "80vh", color: "var(--light-color-alt)" }}>
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <section className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", paddingBlock: "4rem" }}>
        <div 
          style={{
            maxWidth: "600px",
            width: "100%",
            textAlign: "center",
            background: "var(--secondary-background-color)",
            padding: "5rem 4rem",
            borderRadius: "16px",
            boxShadow: "0 10px 45px rgba(0,0,0,0.15)",
            border: "1px solid var(--transparent-light-color)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2.5rem"
          }}
        >
          <div 
            style={{ 
              width: "8.5rem", 
              height: "8.5rem", 
              borderRadius: "50%", 
              background: "radial-gradient(circle, rgba(79, 207, 112, 0.15) 0%, transparent 70%)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "4rem",
              color: "var(--accent-color)",
              border: "1px solid rgba(79, 207, 112, 0.2)"
            }}
          >
            <i className="ri-lock-2-line"></i>
          </div>
          <div>
            <h2 style={{ fontSize: "2.4rem", color: "var(--light-color)", fontWeight: "700", marginBottom: "1rem" }}>
              Your Sacred Notebook
            </h2>
            <p style={{ fontSize: "1.5rem", color: "var(--light-color-alt)", lineHeight: "1.6", maxWidth: "450px", margin: "0 auto" }}>
              Create an account or log in to sync your study notes, scripture highlights, habit streaks, and devotional progress securely in the cloud.
            </p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", width: "100%", justifyContent: "center", marginTop: "1rem" }}>
            <Link 
              href="/login" 
              style={{ 
                background: "var(--accent-color)", 
                color: "#131417", 
                padding: "1.2rem 3.5rem", 
                borderRadius: "30px", 
                fontWeight: "700", 
                fontSize: "1.4rem",
                boxShadow: "0 4px 15px rgba(79, 207, 112, 0.2)"
              }}
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              style={{ 
                background: "rgba(255,255,255,0.05)", 
                color: "var(--light-color)", 
                padding: "1.2rem 3.5rem", 
                borderRadius: "30px", 
                fontWeight: "600", 
                fontSize: "1.4rem",
                border: "1px solid var(--transparent-light-color)"
              }}
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Profile Card / Streak */}
        <div className="streak-card" style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
            <div className="streak-number-wrapper" style={{ gap: "1.2rem", display: "flex", alignItems: "center" }}>
              <div className="streak-fire-icon" style={{ fontSize: "3.2rem", color: "var(--accent-color)" }}>
                <i className="ri-fire-fill"></i>
              </div>
              <div>
                <h3 style={{ fontSize: "2.4rem", color: "var(--light-color)" }}>
                  {streak.count} Day Streak!
                </h3>
                <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                  A daily habit of scripture and prayer &bull; Welcome, {user.name}
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "1.1rem", display: "block", color: "var(--light-color-alt)" }}>LAST ACTIVE</span>
              <span style={{ fontSize: "1.4rem", fontWeight: "600", color: "var(--light-color)" }}>
                {streak.lastActive ? streak.lastActive.split(" ").slice(1, 3).join(" ") : "Today"}
              </span>
            </div>
          </div>

          {/* 7-Day Habit Progress Row */}
          {dayOfWeek && (
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

        {/* Navigation Tabs */}
        <div 
          style={{ 
            display: "flex", 
            borderBottom: "2px solid var(--transparent-light-color)",
            marginBottom: "3rem",
            gap: "0.8rem",
            justifyContent: "space-between"
          }}
        >
          {[
            { id: "notebook", label: "Notebook", icon: "ri-booklet-line" },
            { id: "highlights", label: "Highlights", icon: "ri-markup-line" },
            { id: "plans", label: "My Plans", icon: "ri-calendar-todo-line" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                paddingBlock: "1.2rem",
                color: activeTab === tab.id ? "var(--light-color)" : "var(--light-color-alt)",
                borderBottom: activeTab === tab.id ? "3px solid var(--accent-color)" : "3px solid transparent",
                fontSize: "1.3rem",
                fontWeight: activeTab === tab.id ? "700" : "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                flex: 1,
                textAlign: "center",
                whiteSpace: "nowrap",
                transition: "all 0.25s"
              }}
            >
              <i className={tab.icon} style={{ fontSize: "1.6rem" }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div>
          {/* 1. Notebook Tab */}
          {activeTab === "notebook" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              {/* Sub-tab Pill Selectors */}
              <div 
                style={{ 
                  display: "inline-flex", 
                  background: "rgba(255, 255, 255, 0.03)", 
                  padding: "0.4rem", 
                  borderRadius: "24px",
                  border: "1px solid var(--transparent-light-color)",
                  width: "100%",
                  maxWidth: "480px"
                }}
              >
                <button 
                  onClick={() => setNotebookSubTab("bible-notes")}
                  style={{
                    background: notebookSubTab === "bible-notes" ? "var(--secondary-background-color)" : "transparent",
                    color: notebookSubTab === "bible-notes" ? "#fad648" : "var(--light-color-alt)",
                    border: "none",
                    padding: "0.8rem 1.4rem",
                    borderRadius: "20px",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    flex: 1,
                    textAlign: "center",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                >
                  Bible Notes ({Object.keys(notes).length})
                </button>
                <button 
                  onClick={() => setNotebookSubTab("devotionals")}
                  style={{
                    background: notebookSubTab === "devotionals" ? "var(--secondary-background-color)" : "transparent",
                    color: notebookSubTab === "devotionals" ? "#fad648" : "var(--light-color-alt)",
                    border: "none",
                    padding: "0.8rem 1.4rem",
                    borderRadius: "20px",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    flex: 1,
                    textAlign: "center",
                    transition: "all 0.2s",
                    outline: "none"
                  }}
                >
                  Reflections ({Object.keys(reflections).length})
                </button>
              </div>

              {/* Render Bible Notes */}
              {notebookSubTab === "bible-notes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {!hasNotes ? (
                    <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--light-color-alt)" }}>
                      <i className="ri-quill-pen-line" style={{ fontSize: "5rem", display: "block", marginBottom: "1.5rem" }}></i>
                      <p style={{ fontSize: "1.5rem" }}>You haven't written any Bible notes yet.</p>
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

              {/* Render Devotional Reflections */}
              {notebookSubTab === "devotionals" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {Object.keys(reflections).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--light-color-alt)" }}>
                      <i className="ri-book-read-line" style={{ fontSize: "5rem", display: "block", marginBottom: "1.5rem" }}></i>
                      <p style={{ fontSize: "1.5rem" }}>You haven't saved any devotional reflections yet.</p>
                      <Link href="/plans" style={{ display: "inline-block", marginTop: "2rem", padding: "1rem 2rem", background: "var(--accent-color)", color: "white", borderRadius: "30px", fontWeight: "600" }}>
                        Browse Devotional Plans
                      </Link>
                    </div>
                  ) : (
                    Object.keys(reflections).map((key) => {
                      const reflection = reflections[key];
                      const lastUnderscoreIdx = key.lastIndexOf("_");
                      const planId = key.substring(0, lastUnderscoreIdx);
                      const dayNum = parseInt(key.substring(lastUnderscoreIdx + 1), 10);
                      
                      const plan = devotionals[planId];
                      const planTitle = plan ? plan.title : "Devotional Plan";
                      const dayObj = plan ? plan.days.find(d => d.day === dayNum) : null;
                      const dayTitle = dayObj ? dayObj.title : `Day ${dayNum}`;

                      return (
                        <div 
                          key={key} 
                          style={{
                            background: "var(--secondary-background-color)",
                            padding: "3rem",
                            borderRadius: "10px",
                            borderLeft: "4px solid #fad648",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                            <div>
                              <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "#fad648", textTransform: "uppercase", display: "block", marginBottom: "0.2rem" }}>
                                {planTitle}
                              </span>
                              <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
                                Day {dayNum}: {dayTitle}
                              </span>
                            </div>
                            <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                              {reflection.timestamp}
                            </span>
                          </div>
                          <p style={{ fontSize: "1.5rem", lineHeight: "1.6", color: "var(--light-color)", fontStyle: "italic" }}>
                            "{reflection.text}"
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
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
