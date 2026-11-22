"use client";

import { useState } from "react";
import Link from "next/link";
import { BADGES } from "@/data/badges";

const HIGHLIGHT_COLOR_NAMES = {
  "highlight-yellow": "Yellow",
  "highlight-green": "Green",
  "highlight-blue": "Blue",
  "highlight-pink": "Pink",
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX_MAP = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export default function ProfileClient({
  initialData = { user: null },
  planMetaMap = {},
  dayOfWeek = "",
}) {
  const [activeTab, setActiveTab] = useState("notebook");
  const [notebookSubTab, setNotebookSubTab] = useState("bible-notes");

  const user = initialData?.user || null;

  if (!user) {
    return (
      <section className="sanc-page">
        <div className="sanc-auth-wrap">
          <div className="sanc-auth-card" style={{ textAlign: "center" }}>
            <div
              style={{
                width: "7.6rem",
                height: "7.6rem",
                borderRadius: "50%",
                margin: "0 auto 1.6rem",
                background: "var(--sanc-emerald-soft)",
                border: "1px solid var(--sanc-emerald-border)",
                color: "var(--sanc-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.4rem",
              }}
            >
              <i className="ri-lock-2-line" aria-hidden="true"></i>
            </div>

            <span className="sanc-eyebrow">Sanctuary Account</span>
            <h1 className="sanc-title" style={{ marginBottom: "1rem" }}>
              Your Sacred <span className="sanc-title-accent">Notebook</span>
            </h1>
            <p className="sanc-subtitle" style={{ margin: "0 auto 2.4rem" }}>
              Create an account or log in to sync your study notes, scripture highlights, habit
              streaks, and devotional progress securely in the cloud.
            </p>

            <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login" className="sanc-btn-primary">
                Sign In
              </Link>
              <Link href="/signup" className="sanc-btn-secondary">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const streak = {
    count: user.streak_count || 0,
    lastActive: user.last_active || null,
    freezes: user.streak_freezes_count ?? 1,
  };
  const notes = initialData.notebook?.notes || {};
  const highlights = initialData.notebook?.highlights || {};
  const plansProg = initialData.progress || {};
  const reflections = initialData.reflections || {};
  const journalEntries = initialData.journalEntries || [];
  const unlockedBadges = initialData.badges || [];

  const hasNotes = Object.keys(notes).length > 0;
  const hasHighlights = Object.keys(highlights).length > 0;

  const activePlanList = Object.keys(plansProg)
    .map((id) => {
      const detail = planMetaMap[id];
      if (!detail || !detail.daysCount) return null;
      const progress = plansProg[id];
      const completedCount = progress?.completedDays?.length || 0;
      return {
        id,
        title: detail.title,
        days: detail.daysCount,
        completed: completedCount,
        isCompleted: progress.isCompleted,
        percent: Math.round((completedCount / detail.daysCount) * 100),
      };
    })
    .filter(Boolean);

  // Parse human-readable citations from verseId keys (e.g., "John_3_16" -> "John 3:16")
  const formatVerseRef = (key) => {
    if (!key) return "";
    if (key.startsWith("votd_")) {
      const [, month, day] = key.split("_");
      return month && day ? `Verse of the Day (${month}/${day})` : "Verse of the Day";
    }
    const parts = key.split("_");
    if (parts.length >= 3) {
      const book = parts.slice(0, parts.length - 2).join(" ");
      const chapter = parts[parts.length - 2];
      const verse = parts[parts.length - 1];
      return `${book} ${chapter}:${verse}`;
    }
    return key;
  };

  const todayAbbr = (dayOfWeek || "").substring(0, 3);
  const currentDayIdx = DAY_INDEX_MAP[todayAbbr] ?? 0;
  const formattedLastActive = streak.lastActive
    ? streak.lastActive.split(" ").slice(1, 3).join(" ") || streak.lastActive
    : "Today";

  return (
    <section className="sanc-page">
      <div className="sanc-container-md sanc-stack">
        {/* Profile Streak & Walk Hero Card */}
        <div className="sanc-profile-hero">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "1.6rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1.4rem" }}>
              <div
                style={{
                  width: "5.4rem",
                  height: "5.4rem",
                  borderRadius: "16px",
                  background: "var(--sanc-gold-soft)",
                  border: "1px solid var(--sanc-gold-border)",
                  color: "var(--sanc-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.8rem",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <i className="ri-fire-fill"></i>
              </div>

              <div>
                <span className="sanc-eyebrow" style={{ marginBottom: "0.3rem" }}>
                  Welcome, {user.name}
                </span>
                <h1 className="sanc-title" style={{ marginBottom: "0.3rem" }}>
                  {streak.count} {streak.count === 1 ? "Day" : "Days"}{" "}
                  <span className="sanc-title-accent">Streak</span>
                </h1>
                <p className="sanc-subtitle" style={{ fontSize: "1.35rem" }}>
                  A daily habit of scripture and prayer &bull; Last active: {formattedLastActive}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                flexWrap: "wrap",
              }}
            >
              <span className="sanc-badge emerald">ACTIVE</span>
              <span className="sanc-badge sky">
                <i className="ri-snowflake-line" aria-hidden="true"></i>
                {streak.freezes} {streak.freezes === 1 ? "Freeze" : "Freezes"}
              </span>
              {user.role === "admin" && (
                <span className="sanc-badge gold">
                  <i className="ri-shield-user-line" aria-hidden="true"></i>
                  Admin
                </span>
              )}
              <button
                type="button"
                className="sanc-btn-secondary sanc-btn-sm"
                onClick={() => window.openNotifSettings?.()}
              >
                <i className="ri-notification-3-line" aria-hidden="true"></i>
                Notifications
              </button>
            </div>
          </div>

          {dayOfWeek && (
            <div className="sanc-week-strip">
              <span
                style={{
                  fontSize: "1.15rem",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  color: "var(--sanc-muted)",
                  textTransform: "uppercase",
                }}
              >
                THIS WEEK&apos;S WALK
              </span>
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                {WEEK_DAYS.map((dayAbbr, idx) => {
                  const isActive =
                    idx === currentDayIdx ||
                    (idx < currentDayIdx && idx >= currentDayIdx - (streak.count - 1));
                  const isToday = idx === currentDayIdx;

                  return (
                    <div
                      key={dayAbbr}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <div
                        className={`sanc-week-day${isActive ? " active" : ""}${isToday ? " today" : ""}`}
                      >
                        {isActive ? (
                          <i className="ri-check-line" aria-hidden="true"></i>
                        ) : (
                          dayAbbr[0]
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: isToday ? "700" : "600",
                          color: isToday ? "var(--sanc-text)" : "var(--sanc-muted)",
                        }}
                      >
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
        <div className="sanc-tab-bar no-scrollbar" role="tablist" aria-label="Profile Sections">
          {[
            { id: "notebook", label: "Notebook", icon: "ri-booklet-line" },
            { id: "highlights", label: "Highlights", icon: "ri-markup-line" },
            { id: "plans", label: "My Plans", icon: "ri-calendar-todo-line" },
            { id: "badges", label: "Milestones", icon: "ri-award-line" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`sanc-tab-btn${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={tab.icon} aria-hidden="true"></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. Notebook Tab */}
        {activeTab === "notebook" && (
          <div className="sanc-stack">
            <div className="sanc-segmented no-scrollbar" role="tablist" aria-label="Notebook Filters">
              <button
                type="button"
                role="tab"
                aria-selected={notebookSubTab === "bible-notes"}
                className={`sanc-seg-btn${notebookSubTab === "bible-notes" ? " active" : ""}`}
                onClick={() => setNotebookSubTab("bible-notes")}
              >
                Bible Notes ({Object.keys(notes).length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notebookSubTab === "devotionals"}
                className={`sanc-seg-btn${notebookSubTab === "devotionals" ? " active" : ""}`}
                onClick={() => setNotebookSubTab("devotionals")}
              >
                Reflections ({Object.keys(reflections).length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notebookSubTab === "journal"}
                className={`sanc-seg-btn${notebookSubTab === "journal" ? " active" : ""}`}
                onClick={() => setNotebookSubTab("journal")}
              >
                Journal ({journalEntries.length})
              </button>
            </div>

            {notebookSubTab === "bible-notes" && (
              <div className="sanc-stack">
                {!hasNotes ? (
                  <div className="sanc-card sanc-card-pad sanc-empty">
                    <i className="ri-quill-pen-line" aria-hidden="true"></i>
                    <p>You haven&apos;t written any Bible notes yet.</p>
                    <Link href="/bible" className="sanc-btn-primary">
                      Read the Bible &amp; Add Notes
                    </Link>
                  </div>
                ) : (
                  Object.keys(notes).map((key) => {
                    const note = notes[key];
                    const citation = formatVerseRef(key);
                    return (
                      <div key={key} className="sanc-note-card violet">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "1rem",
                            flexWrap: "wrap",
                            marginBottom: "1rem",
                          }}
                        >
                          <span className="sanc-badge violet">{citation}</span>
                          <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                            {note.timestamp}
                          </span>
                        </div>
                        <p style={{ fontSize: "1.5rem", lineHeight: "1.65", color: "var(--sanc-text)" }}>
                          {note.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {notebookSubTab === "devotionals" && (
              <div className="sanc-stack">
                {Object.keys(reflections).length === 0 ? (
                  <div className="sanc-card sanc-card-pad sanc-empty">
                    <i className="ri-book-read-line" aria-hidden="true"></i>
                    <p>You haven&apos;t saved any devotional reflections yet.</p>
                    <Link href="/plans" className="sanc-btn-primary">
                      Browse Devotional Plans
                    </Link>
                  </div>
                ) : (
                  Object.keys(reflections).map((key) => {
                    const reflection = reflections[key];
                    const lastUnderscoreIdx = key.lastIndexOf("_");
                    const planId = key.substring(0, lastUnderscoreIdx);
                    const dayNum = parseInt(key.substring(lastUnderscoreIdx + 1), 10);

                    const plan = planMetaMap[planId];
                    const planTitle = plan ? plan.title : "Devotional Plan";
                    const dayTitle = plan?.dayTitles?.[dayNum] || `Day ${dayNum}`;

                    return (
                      <div key={key} className="sanc-note-card gold">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "1rem",
                            flexWrap: "wrap",
                            marginBottom: "1rem",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <span className="sanc-badge gold" style={{ alignSelf: "flex-start" }}>
                              {planTitle}
                            </span>
                            <span style={{ fontSize: "1.35rem", fontWeight: "600", color: "var(--sanc-text)" }}>
                              Day {dayNum}: {dayTitle}
                            </span>
                          </div>
                          <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                            {reflection.timestamp}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "1.55rem",
                            lineHeight: "1.65",
                            color: "var(--sanc-text)",
                            fontStyle: "italic",
                            fontFamily: "var(--font-family-reader), Georgia, serif",
                          }}
                        >
                          &quot;{reflection.text}&quot;
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {notebookSubTab === "journal" && (
              <div className="sanc-stack">
                {journalEntries.length === 0 ? (
                  <div className="sanc-card sanc-card-pad sanc-empty">
                    <i className="ri-booklet-line" aria-hidden="true"></i>
                    <p>You haven&apos;t written any gratitude entries yet.</p>
                    <Link href="/" className="sanc-btn-primary">
                      Reflect on Today&apos;s Prompt
                    </Link>
                  </div>
                ) : (
                  journalEntries.map((entry) => (
                    <div key={entry.id} className="sanc-note-card sky">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "1rem",
                          flexWrap: "wrap",
                          marginBottom: "1rem",
                        }}
                      >
                        <span className="sanc-badge sky">Prompt: {entry.prompt}</span>
                        <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                          {entry.date}
                        </span>
                      </div>
                      <p style={{ fontSize: "1.5rem", lineHeight: "1.65", color: "var(--sanc-text)" }}>
                        {entry.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. Highlights Tab */}
        {activeTab === "highlights" && (
          <div className="sanc-stack">
            {!hasHighlights ? (
              <div className="sanc-card sanc-card-pad sanc-empty">
                <i className="ri-markup-line" aria-hidden="true"></i>
                <p>You haven&apos;t highlighted any scriptures yet.</p>
                <Link href="/bible" className="sanc-btn-primary">
                  Browse Bible
                </Link>
              </div>
            ) : (
              <div className="sanc-grid-2">
                {Object.keys(highlights).map((key) => {
                  const colorClass = highlights[key];
                  const citation = formatVerseRef(key);
                  const colorName = HIGHLIGHT_COLOR_NAMES[colorClass] || "Highlighted";

                  return (
                    <div key={key} className="sanc-highlight-card">
                      <div>
                        <span
                          style={{
                            fontSize: "1.6rem",
                            fontWeight: "700",
                            color: "var(--sanc-text)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {citation}
                        </span>
                        <span style={{ fontSize: "1.25rem", color: "var(--sanc-muted)" }}>
                          Color: {colorName}
                        </span>
                      </div>

                      <div className={`sanc-highlight-dot ${colorClass}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Plans Tab */}
        {activeTab === "plans" && (
          <div className="sanc-stack">
            {activePlanList.length > 0 && (
              <div className="sanc-stat-strip">
                <div className="sanc-stat-item">
                  <div className="sanc-stat-icon gold">
                    <i className="ri-book-open-line" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="sanc-stat-label">Active Plans</span>
                    <span className="sanc-stat-value">
                      {activePlanList.filter((p) => !p.isCompleted).length}
                    </span>
                  </div>
                </div>

                <div className="sanc-stat-item">
                  <div className="sanc-stat-icon emerald">
                    <i className="ri-checkbox-circle-line" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="sanc-stat-label">Completed Plans</span>
                    <span className="sanc-stat-value">
                      {activePlanList.filter((p) => p.isCompleted).length}
                    </span>
                  </div>
                </div>

                <div className="sanc-stat-item">
                  <div className="sanc-stat-icon sky">
                    <i className="ri-calendar-check-line" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="sanc-stat-label">Total Days Read</span>
                    <span className="sanc-stat-value">
                      {activePlanList.reduce((acc, curr) => acc + curr.completed, 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activePlanList.length === 0 ? (
              <div className="sanc-card sanc-card-pad sanc-empty">
                <i className="ri-calendar-todo-line" aria-hidden="true"></i>
                <p>You aren&apos;t enrolled in any reading plans.</p>
                <Link href="/plans" className="sanc-btn-primary">
                  Find a Devotional Plan
                </Link>
              </div>
            ) : (
              <div className="sanc-stack">
                {activePlanList.map((plan) => (
                  <div key={plan.id} className="sanc-card sanc-card-pad">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "1.2rem",
                        marginBottom: "1.6rem",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: "1.9rem",
                            fontFamily: "var(--font-family-serif), Georgia, serif",
                            color: "var(--sanc-text)",
                            marginBottom: "0.4rem",
                          }}
                        >
                          {plan.title}
                        </h3>
                        <span
                          className={`sanc-badge ${plan.isCompleted ? "emerald" : "gold"}`}
                        >
                          {plan.isCompleted
                            ? "COMPLETED"
                            : `DAY ${plan.completed} OF ${plan.days}`}
                        </span>
                      </div>

                      <Link
                        href={`/plans/${plan.id}`}
                        className={
                          plan.isCompleted
                            ? "sanc-btn-secondary sanc-btn-sm"
                            : "sanc-btn-primary sanc-btn-sm"
                        }
                      >
                        {plan.isCompleted ? "Read Again" : "Resume Plan"}
                      </Link>
                    </div>

                    <div className="sanc-progress-track">
                      <div
                        className="sanc-progress-fill"
                        style={{ width: `${plan.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Badges / Milestones Tab */}
        {activeTab === "badges" && (
          <div className="sanc-stack">
            <div className="sanc-section-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.6rem" }}>
              <span className="sanc-eyebrow">Faith Milestones</span>
              <h2 className="sanc-section-title">Milestone Badges</h2>
              <p className="sanc-subtitle">
                Earn milestone badges and unlock rewards like Streak Freezes by reading daily,
                writing study notes, journaling, and standing in prayer with others.
              </p>
            </div>

            <div className="sanc-grid-2">
              {BADGES.map((badge) => {
                const unlockInfo = unlockedBadges.find((b) => b.badgeId === badge.id);
                const isUnlocked = Boolean(unlockInfo);

                return (
                  <div
                    key={badge.id}
                    className={`sanc-badge-card ${isUnlocked ? "unlocked" : "locked"}`}
                  >
                    <div className="sanc-badge-medallion">
                      <i className={badge.icon} aria-hidden="true"></i>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <h3 style={{ fontSize: "1.55rem", fontWeight: "700", color: "var(--sanc-text)" }}>
                        {badge.title}
                      </h3>
                      <p style={{ fontSize: "1.25rem", color: "var(--sanc-muted)", lineHeight: "1.45" }}>
                        {badge.desc}
                      </p>

                      {isUnlocked ? (
                        <span className="sanc-badge emerald" style={{ alignSelf: "flex-start", marginTop: "0.3rem" }}>
                          <i className="ri-checkbox-circle-fill" aria-hidden="true"></i>
                          Unlocked {unlockInfo.unlockedAt}
                        </span>
                      ) : (
                        <span className="sanc-badge" style={{ alignSelf: "flex-start", marginTop: "0.3rem" }}>
                          Reward: {badge.reward}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
