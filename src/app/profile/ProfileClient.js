"use client";

import Image from "next/image";
import { getDefaultPlanCover, isSafeImageUrl } from "@/components/admin/adminConstants";
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

function buildBibleVerseHref(key) {
  if (!key || key.startsWith("votd_")) return null;
  const parts = key.split("_");
  if (parts.length < 3) return null;
  const book = parts.slice(0, -2).join(" ");
  const chapter = parts[parts.length - 2];
  const verse = parts[parts.length - 1];
  if (!/^\d+$/.test(chapter) || !/^\d+$/.test(verse)) return null;
  return `/bible?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`;
}

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

  const noteKeys = Object.keys(notes);
  const reflectionKeys = Object.keys(reflections);
  const highlightKeys = Object.keys(highlights);
  const hasNotes = noteKeys.length > 0;
  const hasHighlights = highlightKeys.length > 0;
  const notebookTotalCount = noteKeys.length + reflectionKeys.length + journalEntries.length;

  const activePlanList = Object.keys(plansProg)
    .map((id) => {
      const detail = planMetaMap[id];
      if (!detail || !detail.daysCount) return null;
      const progress = plansProg[id];
      const completedCount = progress?.completedDays?.length || 0;
      return {
        id,
        title: detail.title,
        category: detail.category || "Devotional",
        image: detail.image || "",
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
  const weekStatus = WEEK_DAYS.map((dayAbbr, idx) => {
    const isToday = idx === currentDayIdx;
    const isActive =
      streak.count > 0 &&
      (isToday || (idx < currentDayIdx && idx >= currentDayIdx - (streak.count - 1)));
    return { dayAbbr, isToday, isActive };
  });
  const activeDaysThisWeek = weekStatus.filter((d) => d.isActive).length;

  const formattedLastActive = streak.lastActive
    ? streak.lastActive.split(" ").slice(1, 3).join(" ") || streak.lastActive
    : "Today";
  const userInitial = (user.name || user.email || "U").trim().charAt(0).toUpperCase() || "U";
  const milestonePct =
    BADGES.length > 0 ? Math.round((unlockedBadges.length / BADGES.length) * 100) : 0;

  return (
    <section className="sanc-page">
      <div className="sanc-container-md sanc-stack">
        {/* Profile Hero Card */}
        <header className="sanc-profile-hero">
          <div className="sanc-profile-top">
            <div className="sanc-profile-user">
              <div className="sanc-profile-avatar" aria-hidden="true">
                {userInitial}
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 className="sanc-profile-user-name">Welcome back, {user.name}</h1>
                <div className="sanc-profile-user-meta">
                  <i className="ri-time-line" aria-hidden="true"></i>
                  <span>Last active: {formattedLastActive}</span>
                  {user.role === "admin" && (
                    <span className="sanc-badge gold">
                      <i className="ri-shield-user-line" aria-hidden="true"></i>
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sanc-profile-top-actions">
              <button
                type="button"
                className="sanc-btn-secondary sanc-btn-sm"
                onClick={() => window.openNotifSettings?.()}
              >
                <i className="ri-notification-3-line" aria-hidden="true"></i>
                Notifications
              </button>
              {user.role === "admin" && (
                <Link href="/admin" className="sanc-btn-gold sanc-btn-sm">
                  <i className="ri-dashboard-3-line" aria-hidden="true"></i>
                  Admin Panel
                </Link>
              )}
              <Link href="/bible" className="sanc-btn-primary sanc-btn-sm">
                <i className="ri-book-open-line" aria-hidden="true"></i>
                Read Bible
              </Link>
            </div>
          </div>

          <div className="sanc-profile-hero-grid">
            {/* Left: Streak Panel */}
            <div className="sanc-profile-streak-panel">
              <div className="sanc-profile-streak-head">
                <div className="sanc-profile-flame" aria-hidden="true">
                  <i className="ri-fire-fill"></i>
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: "var(--font-family-serif), Georgia, serif",
                      fontSize: "2.1rem",
                      fontWeight: 700,
                      color: "var(--sanc-text)",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {streak.count} {streak.count === 1 ? "Day" : "Days"} Streak
                  </h2>
                  <p
                    style={{
                      fontSize: "1.3rem",
                      color: "var(--sanc-muted)",
                      margin: "0.25rem 0 0",
                    }}
                  >
                    A daily rhythm of scripture &amp; prayer
                  </p>
                </div>
              </div>

              <div className="sanc-profile-streak-badges">
                <span className="sanc-badge emerald">ACTIVE</span>
                <span className="sanc-badge sky">
                  <i className="ri-snowflake-line" aria-hidden="true"></i>
                  {streak.freezes} {streak.freezes === 1 ? "Freeze" : "Freezes"}
                </span>
              </div>
            </div>

            {/* Right: Weekly Walk */}
            <div className="sanc-profile-walk-panel">
              <div className="sanc-profile-walk-head">
                <span className="sanc-label">THIS WEEK&apos;S WALK</span>
                <span className="sanc-badge gold">{activeDaysThisWeek}/7 Days</span>
              </div>

              <div className="sanc-week-strip">
                <div className="sanc-week-grid">
                  {weekStatus.map(({ dayAbbr, isToday, isActive }) => (
                    <div key={dayAbbr} className="sanc-week-cell">
                      <div
                        className={`sanc-week-day${isActive ? " active" : ""}${isToday ? " today" : ""}`}
                        aria-label={`${dayAbbr}: ${isActive ? "active" : "inactive"}`}
                      >
                        {isActive ? (
                          <i className="ri-check-line" aria-hidden="true"></i>
                        ) : (
                          dayAbbr[0]
                        )}
                      </div>
                      <span className={`sanc-week-day-label${isToday ? " today" : ""}`}>
                        {dayAbbr}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Metric Strip */}
          <div className="sanc-profile-metrics">
            {[
              { id: "notebook", label: "Notebook", value: notebookTotalCount },
              { id: "highlights", label: "Highlights", value: highlightKeys.length },
              { id: "plans", label: "Reading Plans", value: activePlanList.length },
              {
                id: "badges",
                label: "Milestones",
                value: `${unlockedBadges.length}/${BADGES.length}`,
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sanc-profile-metric${activeTab === item.id ? " active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="sanc-profile-metric-val">{item.value}</span>
                <span className="sanc-profile-metric-label">{item.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="sanc-profile-tabs" role="tablist" aria-label="Profile Sections">
          {[
            { id: "notebook", label: "Notebook", icon: "ri-booklet-line", count: notebookTotalCount },
            {
              id: "highlights",
              label: "Highlights",
              icon: "ri-markup-line",
              count: highlightKeys.length,
            },
            {
              id: "plans",
              label: "My Plans",
              icon: "ri-calendar-todo-line",
              count: activePlanList.length,
            },
            {
              id: "badges",
              label: "Milestones",
              icon: "ri-award-line",
              count: unlockedBadges.length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`sanc-profile-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={tab.icon} aria-hidden="true"></i>
              <span>{tab.label}</span>
              <span className="sanc-profile-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* 1. Notebook Tab */}
        {activeTab === "notebook" && (
          <div className="sanc-stack">
            <div className="sanc-profile-subbar">
              <div className="sanc-segmented" role="tablist" aria-label="Notebook Filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={notebookSubTab === "bible-notes"}
                  className={`sanc-seg-btn${notebookSubTab === "bible-notes" ? " active" : ""}`}
                  onClick={() => setNotebookSubTab("bible-notes")}
                >
                  Bible Notes ({noteKeys.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={notebookSubTab === "devotionals"}
                  className={`sanc-seg-btn${notebookSubTab === "devotionals" ? " active" : ""}`}
                  onClick={() => setNotebookSubTab("devotionals")}
                >
                  Reflections ({reflectionKeys.length})
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
                <Link href="/bible" className="sanc-note-link">
                  <i className="ri-book-open-line" aria-hidden="true"></i>
                  Open Bible Reader
                </Link>
              )}
              {notebookSubTab === "devotionals" && (
                <Link href="/plans" className="sanc-note-link">
                  <i className="ri-compass-3-line" aria-hidden="true"></i>
                  Browse Devotional Plans
                </Link>
              )}
              {notebookSubTab === "journal" && (
                <Link href="/#daily-journal" className="sanc-note-link">
                  <i className="ri-quill-pen-line" aria-hidden="true"></i>
                  Write Daily Journal
                </Link>
              )}
            </div>

            {notebookSubTab === "bible-notes" && (
              <div>
                {!hasNotes ? (
                  <div className="sanc-card sanc-card-pad sanc-empty">
                    <i className="ri-quill-pen-line" aria-hidden="true"></i>
                    <p>You haven&apos;t written any Bible notes yet.</p>
                    <Link href="/bible" className="sanc-btn-primary">
                      Read the Bible &amp; Add Notes
                    </Link>
                  </div>
                ) : (
                  <div className={`sanc-profile-note-grid${noteKeys.length === 1 ? " single" : ""}`}>
                    {noteKeys.map((key) => {
                      const note = notes[key];
                      const citation = formatVerseRef(key);
                      const verseHref = buildBibleVerseHref(key);
                      return (
                        <article key={key} className="sanc-note-card violet">
                          <div className="sanc-note-head">
                            <span className="sanc-badge violet">{citation}</span>
                            <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                              {note.timestamp}
                            </span>
                          </div>
                          <p className="sanc-note-body">{note.text}</p>
                          {verseHref && (
                            <div className="sanc-note-foot">
                              <span style={{ fontSize: "1.18rem", color: "var(--sanc-muted)" }}>
                                Scripture Study Note
                              </span>
                              <Link href={verseHref} className="sanc-note-link">
                                Read in Bible
                                <i className="ri-arrow-right-line" aria-hidden="true"></i>
                              </Link>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {notebookSubTab === "devotionals" && (
              <div>
                {reflectionKeys.length === 0 ? (
                  <div className="sanc-card sanc-card-pad sanc-empty">
                    <i className="ri-book-read-line" aria-hidden="true"></i>
                    <p>You haven&apos;t saved any devotional reflections yet.</p>
                    <Link href="/plans" className="sanc-btn-primary">
                      Browse Devotional Plans
                    </Link>
                  </div>
                ) : (
                  <div
                    className={`sanc-profile-note-grid${reflectionKeys.length === 1 ? " single" : ""}`}
                  >
                    {reflectionKeys.map((key) => {
                      const reflection = reflections[key];
                      const lastUnderscoreIdx = key.lastIndexOf("_");
                      const planId =
                        lastUnderscoreIdx === -1 ? key : key.substring(0, lastUnderscoreIdx);
                      const dayNum =
                        lastUnderscoreIdx === -1
                          ? 1
                          : parseInt(key.substring(lastUnderscoreIdx + 1), 10) || 1;

                      const plan = planMetaMap[planId];
                      const planTitle = plan ? plan.title : "Devotional Plan";
                      const dayTitle = plan?.dayTitles?.[dayNum] || `Day ${dayNum}`;

                      return (
                        <article key={key} className="sanc-note-card gold">
                          <div className="sanc-note-head">
                            <span className="sanc-badge gold">{planTitle}</span>
                            <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                              {reflection.timestamp}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "1.4rem",
                              fontWeight: 700,
                              color: "var(--sanc-text)",
                            }}
                          >
                            Day {dayNum}: {dayTitle}
                          </div>
                          <p
                            className="sanc-note-body"
                            style={{
                              fontStyle: "italic",
                              fontFamily: "var(--font-family-reader), Georgia, serif",
                            }}
                          >
                            &ldquo;{reflection.text}&rdquo;
                          </p>
                          <div className="sanc-note-foot">
                            <span style={{ fontSize: "1.18rem", color: "var(--sanc-muted)" }}>
                              Personal Reflection
                            </span>
                            <Link href={`/plans/${planId}`} className="sanc-note-link">
                              Open Plan
                              <i className="ri-arrow-right-line" aria-hidden="true"></i>
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {notebookSubTab === "journal" && (
              <div>
                {journalEntries.length === 0 ? (
                  <div className="sanc-card sanc-card-pad sanc-empty">
                    <i className="ri-booklet-line" aria-hidden="true"></i>
                    <p>You haven&apos;t written any gratitude entries yet.</p>
                    <Link href="/#daily-journal" className="sanc-btn-primary">
                      Reflect on Today&apos;s Prompt
                    </Link>
                  </div>
                ) : (
                  <div
                    className={`sanc-profile-note-grid${journalEntries.length === 1 ? " single" : ""}`}
                  >
                    {journalEntries.map((entry) => (
                      <article key={entry.id} className="sanc-note-card sky">
                        <div className="sanc-note-head">
                          <span className="sanc-badge sky">Prompt: {entry.prompt}</span>
                          <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                            {entry.date}
                          </span>
                        </div>
                        <p className="sanc-note-body">{entry.text}</p>
                      </article>
                    ))}
                  </div>
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
                {highlightKeys.map((key) => {
                  const colorClass = highlights[key];
                  const citation = formatVerseRef(key);
                  const colorName = HIGHLIGHT_COLOR_NAMES[colorClass] || "Highlighted";
                  const verseHref = buildBibleVerseHref(key);

                  return (
                    <div key={key} className={`sanc-highlight-card ${colorClass}`}>
                      <div style={{ minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: "1.6rem",
                            fontWeight: 700,
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

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          className={`sanc-highlight-dot ${colorClass}`}
                          aria-label={colorName}
                        />
                        {verseHref && (
                          <Link href={verseHref} className="sanc-note-link">
                            Read
                            <i className="ri-arrow-right-line" aria-hidden="true"></i>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. My Plans Tab */}
        {activeTab === "plans" && (
          <div className="sanc-stack">
            {activePlanList.length > 0 && (
              <div className="sanc-stat-strip">
                <div className="sanc-stat-item">
                  <div className="sanc-stat-icon gold" aria-hidden="true">
                    <i className="ri-book-open-line"></i>
                  </div>
                  <div>
                    <span className="sanc-stat-value">
                      {activePlanList.filter((p) => !p.isCompleted).length}
                    </span>
                    <span className="sanc-stat-label">Active Plans</span>
                  </div>
                </div>

                <div className="sanc-stat-item">
                  <div className="sanc-stat-icon emerald" aria-hidden="true">
                    <i className="ri-checkbox-circle-line"></i>
                  </div>
                  <div>
                    <span className="sanc-stat-value">
                      {activePlanList.filter((p) => p.isCompleted).length}
                    </span>
                    <span className="sanc-stat-label">Completed Plans</span>
                  </div>
                </div>

                <div className="sanc-stat-item">
                  <div className="sanc-stat-icon sky" aria-hidden="true">
                    <i className="ri-calendar-check-line"></i>
                  </div>
                  <div>
                    <span className="sanc-stat-value">
                      {activePlanList.reduce((acc, curr) => acc + curr.completed, 0)}
                    </span>
                    <span className="sanc-stat-label">Total Days Read</span>
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
              <div className="sanc-grid-2">
                {activePlanList.map((plan) => {
                  const coverSrc = isSafeImageUrl(plan.image)
                    ? plan.image.trim()
                    : getDefaultPlanCover(plan.category);
                  const isExternal = !coverSrc.startsWith("/");

                  return (
                    <article key={plan.id} className="sanc-profile-plan-card">
                      <div className="sanc-profile-plan-top">
                        <div className="sanc-profile-plan-thumb">
                          <Image
                            src={coverSrc}
                            alt={plan.title}
                            fill
                            sizes="120px"
                            unoptimized={isExternal}
                            style={{ objectFit: "cover" }}
                          />
                        </div>

                        <div className="sanc-profile-plan-info">
                          <span className="sanc-badge gold" style={{ alignSelf: "flex-start" }}>
                            {plan.category}
                          </span>
                          <h3
                            style={{
                              fontFamily: "var(--font-family-serif), Georgia, serif",
                              fontSize: "1.8rem",
                              fontWeight: 700,
                              color: "var(--sanc-text)",
                              margin: 0,
                              lineHeight: 1.25,
                            }}
                          >
                            {plan.title}
                          </h3>
                        </div>
                      </div>

                      <div className="sanc-profile-plan-progress">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.8rem",
                          }}
                        >
                          <span className={`sanc-badge ${plan.isCompleted ? "emerald" : "gold"}`}>
                            {plan.isCompleted
                              ? "COMPLETED"
                              : `DAY ${plan.completed} OF ${plan.days}`}
                          </span>
                          <span
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 700,
                              color: "var(--sanc-muted)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {plan.percent}%
                          </span>
                        </div>
                        <div className="sanc-progress-track">
                          <div
                            className="sanc-progress-fill"
                            style={{ width: `${plan.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="sanc-profile-plan-foot">
                        <span style={{ fontSize: "1.22rem", color: "var(--sanc-muted)" }}>
                          {plan.completed} of {plan.days} days read
                        </span>
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
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. Milestones Tab */}
        {activeTab === "badges" && (
          <div className="sanc-stack">
            <div className="sanc-milestone-banner">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <span className="sanc-eyebrow">Faith Milestones</span>
                  <h2 className="sanc-section-title">Milestone Badges</h2>
                  <p className="sanc-subtitle" style={{ marginTop: "0.4rem" }}>
                    Earn milestone badges and unlock rewards like Streak Freezes by reading daily,
                    writing study notes, journaling, and standing in prayer with others.
                  </p>
                </div>
                <span className="sanc-badge gold">
                  {unlockedBadges.length} / {BADGES.length} Unlocked
                </span>
              </div>

              <div className="sanc-progress-track">
                <div className="sanc-progress-fill" style={{ width: `${milestonePct}%` }} />
              </div>
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
                    <div className="sanc-badge-medallion" aria-hidden="true">
                      <i className={badge.icon}></i>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.45rem",
                        minWidth: 0,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.6rem",
                          fontWeight: 700,
                          color: "var(--sanc-text)",
                          margin: 0,
                        }}
                      >
                        {badge.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "1.28rem",
                          color: "var(--sanc-muted)",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {badge.desc}
                      </p>

                      {isUnlocked ? (
                        <span
                          className="sanc-badge emerald"
                          style={{ alignSelf: "flex-start", marginTop: "0.35rem" }}
                        >
                          <i className="ri-checkbox-circle-fill" aria-hidden="true"></i>
                          Unlocked {unlockInfo.unlockedAt}
                        </span>
                      ) : (
                        <span
                          className="sanc-badge"
                          style={{ alignSelf: "flex-start", marginTop: "0.35rem" }}
                        >
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
