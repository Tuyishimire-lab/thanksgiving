"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getPlansProgress,
  getSavedPlans,
  toggleSavePlan,
} from "@/data/userState";
import { toggleSavedPlan as toggleSavedPlanDb } from "@/app/actions/dbActions";

const CATEGORIES = [
  "All",
  "Gratitude",
  "Love",
  "Anxiety",
  "Healing",
  "Anger",
  "Hope",
  "Depression",
  "Fear",
  "Peace",
  "Stress",
  "Patience",
  "Loss",
  "Jealousy",
  "Joy",
  "Temptation",
  "Pride",
  "Doubt",
];

const PLANS_EVENT = "praisepage-plans-state-change";
const EMPTY_PROGRESS = Object.freeze({});
const EMPTY_SAVED = Object.freeze([]);
let cachedProgRaw = null;
let cachedProgVal = EMPTY_PROGRESS;
let cachedSavedRaw = null;
let cachedSavedVal = EMPTY_SAVED;

function subscribePlansStorage(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(PLANS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PLANS_EVENT, callback);
  };
}

function getProgressServerSnapshot() {
  return EMPTY_PROGRESS;
}

function getProgressSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem("praisepage_plans_progress");
  } catch {
    return EMPTY_PROGRESS;
  }
  if (raw === null) return EMPTY_PROGRESS;
  if (raw === cachedProgRaw) return cachedProgVal;
  cachedProgRaw = raw;
  cachedProgVal = getPlansProgress();
  return cachedProgVal;
}

function getSavedServerSnapshot() {
  return EMPTY_SAVED;
}

function getSavedSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem("praisepage_saved_plans");
  } catch {
    return EMPTY_SAVED;
  }
  if (raw === null) return EMPTY_SAVED;
  if (raw === cachedSavedRaw) return cachedSavedVal;
  cachedSavedRaw = raw;
  cachedSavedVal = getSavedPlans();
  return cachedSavedVal;
}

// Helper to resolve primary cover artwork for all 17 categories
const getCategoryImage = (category) => {
  switch (category) {
    case "Gratitude":
      return "/assets/images/plans/gratitude-harvest.png";
    case "Love":
      return "/assets/images/plans/love-lanterns.png";
    case "Anxiety":
      return "/assets/images/plans/anxiety-still-lake.png";
    case "Healing":
      return "/assets/images/plans/healing-sunrise-forest.png";
    case "Strength":
      return "/assets/images/plans/healing-golden-kintsugi.png";
    case "Anger":
      return "/assets/images/plans/anger-calm-waters.png";
    case "Hope":
      return "/assets/images/plans/hope-dawn-horizon.png";
    case "Depression":
      return "/assets/images/plans/depression-candle-sanctuary.png";
    case "Fear":
      return "/assets/images/plans/fear-lighthouse-storm.png";
    case "Peace":
      return "/assets/images/plans/peace-olive-branch.png";
    case "Stress":
      return "/assets/images/plans/stress-quiet-sanctuary.png";
    case "Patience":
      return "/assets/images/plans/patience-seedling-dawn.png";
    case "Loss":
      return "/assets/images/plans/loss-twilight-stars.png";
    case "Jealousy":
      return "/assets/images/plans/jealousy-wildflower-field.png";
    case "Joy":
      return "/assets/images/plans/joy-sunlit-meadow.png";
    case "Temptation":
      return "/assets/images/plans/temptation-narrow-trail.png";
    case "Pride":
      return "/assets/images/plans/pride-humble-valley.png";
    case "Doubt":
      return "/assets/images/plans/doubt-ancient-compass.png";
    default:
      return "/assets/images/plans/hope-dawn-horizon.png";
  }
};

export default function PlansClient({
  initialUser = null,
  initialProgress = {},
  initialSavedPlans = [],
  plansList = [],
}) {
  const [activeTab, setActiveTab] = useState("my-plans");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dbSavedPlans, setDbSavedPlans] = useState(initialSavedPlans);

  const guestProgress = useSyncExternalStore(
    subscribePlansStorage,
    getProgressSnapshot,
    getProgressServerSnapshot
  );
  const guestSavedPlans = useSyncExternalStore(
    subscribePlansStorage,
    getSavedSnapshot,
    getSavedServerSnapshot
  );

  const user = initialUser;
  const progress = user ? initialProgress : guestProgress;
  const savedPlans = user ? dbSavedPlans : guestSavedPlans;

  const handleToggleSave = async (e, planId) => {
    e.preventDefault();
    if (user) {
      const wasSaved = dbSavedPlans.includes(planId);
      setDbSavedPlans((prev) =>
        wasSaved ? prev.filter((id) => id !== planId) : [...prev, planId]
      );
      const res = await toggleSavedPlanDb(planId);
      if (res?.error) {
        setDbSavedPlans((prev) =>
          wasSaved ? [...prev, planId] : prev.filter((id) => id !== planId)
        );
      }
    } else {
      toggleSavePlan(planId);
      window.dispatchEvent(new Event(PLANS_EVENT));
    }
  };

  // ---------------- MY PLANS SPLITS ----------------
  const inProgressPlans = plansList.filter((plan) => {
    const prog = progress[plan.id];
    return prog && !prog.isCompleted;
  });

  const bookmarkedPlans = plansList.filter((plan) =>
    savedPlans.includes(plan.id)
  );

  const completedPlans = plansList.filter((plan) => {
    const prog = progress[plan.id];
    return prog && prog.isCompleted;
  });

  const totalDaysCompleted = Object.values(progress).reduce((acc, curr) => {
    return acc + (curr?.completedDays ? curr.completedDays.length : 0);
  }, 0);

  // ---------------- FIND PLANS FILTERS ----------------
  const filteredFindPlans =
    selectedCategory === "All"
      ? plansList
      : plansList.filter((plan) => plan.category === selectedCategory);

  return (
    <section className="sanc-page">
      <div className="sanc-container-md">
        {/* Hero */}
        <header className="sanc-hero sanc-hero-center">
          <span className="sanc-eyebrow">Daily Scripture Journeys</span>
          <h1 className="sanc-title">
            Devotional <span className="sanc-title-accent">Plans</span>
          </h1>
          <p className="sanc-subtitle">
            Strengthen your daily scripture habits with structured topical plans.
          </p>
        </header>

        {/* Sub-Header Menu Tabs */}
        <div
          className="sanc-segmented"
          role="tablist"
          aria-label="Devotional plans views"
          style={{ maxWidth: "400px", margin: "0 auto 3.6rem" }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "my-plans"}
            className={`sanc-seg-btn ${activeTab === "my-plans" ? "active" : ""}`}
            onClick={() => setActiveTab("my-plans")}
          >
            My Plans
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "find-plans"}
            className={`sanc-seg-btn ${activeTab === "find-plans" ? "active" : ""}`}
            onClick={() => setActiveTab("find-plans")}
          >
            Find Plans
          </button>
        </div>

        {/* ==================== TAB CONTENT: MY PLANS ==================== */}
        {activeTab === "my-plans" && (
          <div className="sanc-stack" style={{ gap: "3.2rem" }}>
            {/* Devotional Progress Tracking Stats Dashboard */}
            <div className="sanc-stat-strip">
              <div className="sanc-stat-item">
                <div className="sanc-stat-icon gold" aria-hidden="true">
                  <i className="ri-book-open-line"></i>
                </div>
                <div>
                  <span className="sanc-stat-label">Active Plans</span>
                  <span className="sanc-stat-value">{inProgressPlans.length}</span>
                </div>
              </div>

              <div className="sanc-stat-item">
                <div className="sanc-stat-icon emerald" aria-hidden="true">
                  <i className="ri-checkbox-circle-line"></i>
                </div>
                <div>
                  <span className="sanc-stat-label">Completed</span>
                  <span className="sanc-stat-value">{completedPlans.length}</span>
                </div>
              </div>

              <div className="sanc-stat-item">
                <div className="sanc-stat-icon sky" aria-hidden="true">
                  <i className="ri-calendar-check-line"></i>
                </div>
                <div>
                  <span className="sanc-stat-label">Days Read</span>
                  <span className="sanc-stat-value">{totalDaysCompleted}</span>
                </div>
              </div>
            </div>

            {/* 1. In Progress Section */}
            <div>
              <div className="sanc-section-head">
                <h2 className="sanc-section-title">
                  <i
                    className="ri-play-circle-line"
                    style={{ color: "var(--sanc-gold)" }}
                    aria-hidden="true"
                  ></i>
                  In Progress
                </h2>
                <span className="sanc-badge gold">{inProgressPlans.length}</span>
              </div>

              {inProgressPlans.length === 0 ? (
                <div className="sanc-empty">
                  <p style={{ marginBottom: "1.6rem" }}>
                    No plans in progress. Explore &ldquo;Find Plans&rdquo; to enroll in a devotional.
                  </p>
                  <button
                    type="button"
                    className="sanc-btn-secondary sanc-btn-sm"
                    onClick={() => setActiveTab("find-plans")}
                  >
                    Browse Plans
                  </button>
                </div>
              ) : (
                <div className="sanc-grid-3">
                  {inProgressPlans.map((plan) => {
                    const prog = progress[plan.id];
                    const totalDays = plan.daysCount || 0;
                    const completedCount = prog?.completedDays?.length || 0;
                    const percent =
                      totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        percent={percent}
                        completed={completedCount}
                        isSaved={savedPlans.includes(plan.id)}
                        onToggleSave={handleToggleSave}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Saved Plans Section */}
            <div>
              <div className="sanc-section-head">
                <h2 className="sanc-section-title">
                  <i
                    className="ri-bookmark-fill"
                    style={{ color: "var(--sanc-sky)" }}
                    aria-hidden="true"
                  ></i>
                  Saved Plans
                </h2>
                <span className="sanc-badge sky">{bookmarkedPlans.length}</span>
              </div>

              {bookmarkedPlans.length === 0 ? (
                <div className="sanc-empty">
                  <p>
                    Your saved plans will show up here. Click the bookmark icon on any plan card to save it.
                  </p>
                </div>
              ) : (
                <div className="sanc-grid-3">
                  {bookmarkedPlans.map((plan) => {
                    const prog = progress[plan.id];
                    const totalDays = plan.daysCount || 0;
                    const completedCount = prog?.completedDays?.length || 0;
                    const percent =
                      prog && totalDays > 0
                        ? Math.round((completedCount / totalDays) * 100)
                        : null;
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        percent={percent}
                        completed={completedCount}
                        isSaved={true}
                        onToggleSave={handleToggleSave}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Completed Plans Section */}
            <div>
              <div className="sanc-section-head">
                <h2 className="sanc-section-title">
                  <i
                    className="ri-checkbox-circle-fill"
                    style={{ color: "var(--sanc-emerald)" }}
                    aria-hidden="true"
                  ></i>
                  Completed Plans
                </h2>
                <span className="sanc-badge emerald">{completedPlans.length}</span>
              </div>

              {completedPlans.length === 0 ? (
                <div className="sanc-empty">
                  <p>
                    You haven&apos;t completed any plans yet. Complete all days of a plan to finish it.
                  </p>
                </div>
              ) : (
                <div className="sanc-grid-3">
                  {completedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      percent={100}
                      completed={plan.daysCount || 0}
                      isSaved={savedPlans.includes(plan.id)}
                      onToggleSave={handleToggleSave}
                      isCompleted={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB CONTENT: FIND PLANS ==================== */}
        {activeTab === "find-plans" && (
          <div>
            {/* Category Pills Row */}
            <div
              className="sanc-filter-row"
              role="group"
              aria-label="Filter plans by topic"
              style={{ marginBottom: "2.8rem" }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={selectedCategory === cat}
                  className={`sanc-pill ${selectedCategory === cat ? "active-gold" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            {filteredFindPlans.length === 0 ? (
              <div className="sanc-empty">
                <p>
                  We don&apos;t have any plans in the &ldquo;{selectedCategory}&rdquo; category yet.
                </p>
              </div>
            ) : (
              <div className="sanc-grid-3">
                {filteredFindPlans.map((plan) => {
                  const prog = progress[plan.id];
                  const totalDays = plan.daysCount || 0;
                  const completedCount = prog?.completedDays?.length || 0;
                  const percent =
                    prog && totalDays > 0
                      ? Math.round((completedCount / totalDays) * 100)
                      : null;
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      percent={percent}
                      completed={completedCount}
                      isSaved={savedPlans.includes(plan.id)}
                      onToggleSave={handleToggleSave}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// Reusable Plan Card component
function PlanCard({
  plan,
  percent,
  completed,
  isSaved,
  onToggleSave,
  isCompleted = false,
}) {
  const cardImg = plan.image || getCategoryImage(plan.category);
  const isExternalImg = !cardImg.startsWith("/") || cardImg.startsWith("//");
  const totalDays = plan.daysCount || 0;
  const firstReflection = plan.firstDayReflection || "";

  let actionClass = "sanc-btn-primary";
  let actionLabel = "Start Plan";
  if (isCompleted) {
    actionClass = "sanc-btn-secondary";
    actionLabel = "Completed";
  } else if (percent !== null) {
    actionClass = "sanc-btn-gold";
    actionLabel = "Continue Reading";
  }

  return (
    <article className="sanc-card sanc-card-hover sanc-plan-card">
      {/* Plan Image Header */}
      <div className="sanc-plan-cover">
        <Image
          src={cardImg}
          alt={plan.title}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          unoptimized={isExternalImg}
          style={{ objectFit: "cover" }}
        />
        <div className="sanc-plan-cover-overlay">
          {/* Bookmark Ribbon on Card */}
          <button
            type="button"
            className={`sanc-plan-bookmark ${isSaved ? "saved" : ""}`}
            onClick={(e) => onToggleSave(e, plan.id)}
            title={isSaved ? "Saved" : "Save Plan"}
            aria-label={isSaved ? `Remove ${plan.title} from saved plans` : `Save ${plan.title}`}
            aria-pressed={isSaved}
          >
            <i className={isSaved ? "ri-bookmark-fill" : "ri-bookmark-line"}></i>
          </button>

          <span className="sanc-badge gold" style={{ alignSelf: "flex-start" }}>
            {plan.category}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="sanc-plan-body">
        <h3 className="sanc-plan-title">{plan.title}</h3>
        <p className="sanc-plan-excerpt">{firstReflection}</p>

        {/* Progress / Button */}
        <div className="sanc-plan-footer">
          <div className="sanc-plan-meta-slot">
            {percent !== null ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    color: "var(--sanc-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span>PROGRESS</span>
                  <span>
                    {completed} / {totalDays} DAYS ({percent}%)
                  </span>
                </div>
                <div className="sanc-progress-track">
                  <div className="sanc-progress-fill" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: "1.15rem",
                  color: "var(--sanc-muted)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                {totalDays} DAYS DEVOTIONAL
              </div>
            )}
          </div>

          <Link
            href={`/plans/${plan.id}`}
            className={`${actionClass} sanc-btn-sm sanc-plan-cta`}
          >
            {isCompleted && <i className="ri-check-line" aria-hidden="true"></i>}
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
