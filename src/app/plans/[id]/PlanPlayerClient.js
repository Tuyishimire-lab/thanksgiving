"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getPlansProgress as getPlansProgressLocal,
  startPlan as startPlanLocal,
  completePlanDay as completePlanDayLocal,
  getHighlights as getHighlightsLocal,
  getPlanReflections as getPlanReflectionsLocal,
  savePlanReflection as savePlanReflectionLocal,
} from "@/data/userState";
import {
  updateDevotionalProgress as updateDevotionalProgressDb,
  savePlanReflection as savePlanReflectionDb,
} from "@/app/actions/dbActions";
import VerseActionsModal from "@/components/VerseActionsModal";
import DevotionalCardCreatorModal from "@/components/DevotionalCardCreatorModal";

const PLAYER_EVENT = "praisepage-plan-player-change";
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_STRING = "";

let cachedProgRaw = null;
let cachedProgVal = EMPTY_OBJECT;
let cachedHlRaw = null;
let cachedHlVal = EMPTY_OBJECT;
let cachedRefRaw = null;
let cachedRefVal = EMPTY_OBJECT;

function subscribePlayerStorage(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(PLAYER_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PLAYER_EVENT, callback);
  };
}

function subscribeNoop() {
  return () => {};
}

function getEmptyObjectSnapshot() {
  return EMPTY_OBJECT;
}

function getGuestProgressSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem("praisepage_plans_progress");
  } catch {
    return EMPTY_OBJECT;
  }
  if (raw === null) return EMPTY_OBJECT;
  if (raw === cachedProgRaw) return cachedProgVal;
  cachedProgRaw = raw;
  cachedProgVal = getPlansProgressLocal();
  return cachedProgVal;
}

function getGuestHighlightsSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem("praisepage_highlights");
  } catch {
    return EMPTY_OBJECT;
  }
  if (raw === null) return EMPTY_OBJECT;
  if (raw === cachedHlRaw) return cachedHlVal;
  cachedHlRaw = raw;
  cachedHlVal = getHighlightsLocal();
  return cachedHlVal;
}

function getGuestReflectionsSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem("praisepage_plan_reflections");
  } catch {
    return EMPTY_OBJECT;
  }
  if (raw === null) return EMPTY_OBJECT;
  if (raw === cachedRefRaw) return cachedRefVal;
  cachedRefRaw = raw;
  cachedRefVal = getPlanReflectionsLocal();
  return cachedRefVal;
}

function getClientTodayServerSnapshot() {
  return EMPTY_STRING;
}

function getClientTodaySnapshot() {
  return new Date().toLocaleDateString();
}

const getPlanImage = (plan) => {
  if (plan.image) return plan.image;
  switch (plan.category) {
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

export default function PlanPlayerClient({
  planId,
  planData,
  initialUser = null,
  initialProgress = null,
  initialReflections = {},
  initialHighlights = {},
}) {
  const user = initialUser;

  const [dbProgress, setDbProgress] = useState(
    () =>
      initialProgress ||
      (initialUser && planData
        ? {
            planId,
            currentDay: 1,
            completedDays: [],
            isCompleted: false,
            startDate: "",
            lastCompletedDate: null,
          }
        : null)
  );
  const [dbHighlights, setDbHighlights] = useState(initialHighlights);
  const [dbReflections, setDbReflections] = useState(initialReflections);

  const [selectedDayOverride, setSelectedDayOverride] = useState(null);
  const [activeVerse, setActiveVerse] = useState(null);
  const [draftReflection, setDraftReflection] = useState(null);
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [showDevotionalCard, setShowDevotionalCard] = useState(false);
  const [playerNotice, setPlayerNotice] = useState(null);

  const guestProgressMap = useSyncExternalStore(
    subscribePlayerStorage,
    getGuestProgressSnapshot,
    getEmptyObjectSnapshot
  );
  const guestHighlights = useSyncExternalStore(
    subscribePlayerStorage,
    getGuestHighlightsSnapshot,
    getEmptyObjectSnapshot
  );
  const guestReflections = useSyncExternalStore(
    subscribePlayerStorage,
    getGuestReflectionsSnapshot,
    getEmptyObjectSnapshot
  );
  const clientTodayStr = useSyncExternalStore(
    subscribeNoop,
    getClientTodaySnapshot,
    getClientTodayServerSnapshot
  );

  // Persist initial enrollment without blocking SSR or calling setState synchronously
  useEffect(() => {
    if (!planData || !planData.days?.length) return;
    if (initialUser) {
      if (!initialProgress) {
        updateDevotionalProgressDb(planId, [], false, 1);
      }
    } else {
      const existing = getPlansProgressLocal();
      if (!existing[planId]) {
        startPlanLocal(planId);
        window.dispatchEvent(new Event(PLAYER_EVENT));
      }
    }
  }, [initialUser, initialProgress, planData, planId]);

  if (!planData || !planData.days?.length) {
    return (
      <section className="sanc-page">
        <div className="sanc-container-sm">
          <div className="sanc-empty">
            <h2 className="sanc-title" style={{ fontSize: "2.4rem", marginBottom: "1rem" }}>
              Plan Not Found
            </h2>
            <p className="sanc-subtitle" style={{ margin: "0 auto 2rem" }}>
              We couldn&apos;t find the reading plan you were looking for.
            </p>
            <Link href="/plans" className="sanc-btn-primary">
              Back to Reading Plans
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const progress = user
    ? dbProgress
    : guestProgressMap[planId] || {
        planId,
        currentDay: 1,
        completedDays: [],
        isCompleted: false,
        startDate: null,
        lastCompletedDate: null,
      };

  const highlights = user ? dbHighlights : guestHighlights;
  const reflections = user ? dbReflections : guestReflections;

  const hasCompletedToday = Boolean(
    clientTodayStr && progress && progress.lastCompletedDate === clientTodayStr
  );

  const defaultDayNum = (() => {
    if (!progress) return 1;
    if (progress.isCompleted) return 1;
    if (hasCompletedToday && progress.completedDays && progress.completedDays.length > 0) {
      return Math.max(...progress.completedDays);
    }
    return progress.currentDay || 1;
  })();

  const activeDayNum = selectedDayOverride ?? defaultDayNum;
  const dayContent = planData.days.find((d) => d.day === activeDayNum) || planData.days[0];
  const planImage = getPlanImage(planData);
  const isExternalPlanImage = !planImage.startsWith("/") || planImage.startsWith("//");
  const completionPct = Math.round(
    (progress.completedDays.length / planData.days.length) * 100
  );
  const isCurrentDayCompleted = progress.completedDays.includes(activeDayNum);

  const currentReflectionKey = `${planId}_${activeDayNum}`;
  const savedReflectionText = reflections[currentReflectionKey]?.text || "";
  const reflectionText = draftReflection !== null ? draftReflection : savedReflectionText;

  const handleSelectDay = (dayNumber) => {
    setSelectedDayOverride(dayNumber);
    setShowReflectionInput(false);
    setDraftReflection(null);
    setPlayerNotice(null);
  };

  const handleSaveReflection = async () => {
    const textToSave = reflectionText;
    if (user) {
      await savePlanReflectionDb(planId, activeDayNum, textToSave);
      setDbReflections((prev) => {
        const next = { ...prev };
        if (!textToSave || textToSave.trim() === "") {
          delete next[currentReflectionKey];
        } else {
          next[currentReflectionKey] = {
            text: textToSave.trim(),
            timestamp: new Date().toLocaleDateString(),
          };
        }
        return next;
      });
    } else {
      savePlanReflectionLocal(planId, activeDayNum, textToSave);
      window.dispatchEvent(new Event(PLAYER_EVENT));
    }
    setShowReflectionInput(false);
    setDraftReflection(null);
  };

  const handleMarkDayComplete = async () => {
    const totalDays = planData.days.length;
    const todayStr = new Date().toLocaleDateString();

    if (progress && progress.lastCompletedDate === todayStr) {
      setPlayerNotice({
        type: "gold",
        text: "You have already completed a day of this plan today. Take time to reflect and return tomorrow to continue.",
        isCompletion: false,
      });
      return;
    }

    if (user) {
      const completedDays = progress.completedDays.includes(activeDayNum)
        ? [...progress.completedDays]
        : [...progress.completedDays, activeDayNum];
      const isCompleted = completedDays.length >= totalDays;
      const nextDay = Math.min(totalDays, (progress.currentDay || 1) + 1);

      await updateDevotionalProgressDb(planId, completedDays, isCompleted, nextDay, todayStr);

      setDbProgress({
        ...progress,
        completedDays,
        isCompleted,
        currentDay: nextDay,
        lastCompletedDate: todayStr,
      });
    } else {
      completePlanDayLocal(planId, activeDayNum, totalDays, todayStr);
      window.dispatchEvent(new Event(PLAYER_EVENT));
    }

    if (activeDayNum >= totalDays) {
      setPlayerNotice({
        type: "ok",
        text: `Congratulations! You have completed "${planData.title}".`,
        isCompletion: true,
      });
    } else {
      setPlayerNotice({
        type: "ok",
        text: `Day ${activeDayNum} marked complete. May this scripture dwell richly in you today.`,
        isCompletion: false,
      });
    }
  };

  const handleVerseModalStateChange = (payload) => {
    if (user) {
      if (payload && "highlight" in payload) {
        setDbHighlights((prev) => {
          const next = { ...prev };
          if (payload.highlight) {
            next[payload.verseId] = payload.highlight;
          } else {
            delete next[payload.verseId];
          }
          return next;
        });
      }
    } else {
      window.dispatchEvent(new Event(PLAYER_EVENT));
    }
  };

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: `${planData.title} Devotional Plan`,
    description: `Start reading the "${planData.title}" plan in our devotional area. Track your daily reflections, highlights, and growth.`,
    provider: {
      "@type": "Organization",
      name: "PraisePage",
      url: "https://www.praisepage.com",
    },
    educationalUse: "Devotional Reading",
    hasPart: planData.days?.map((d) => ({
      "@type": "CreativeWork",
      name: `Day ${d.day}: ${d.title}`,
      description: d.reflection,
    })),
  };

  return (
    <section className="sanc-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaJson).replace(/</g, "\\u003c"),
        }}
      />
      <div className="sanc-container-sm">
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: "2.4rem" }}>
          <Link href="/plans" className="sanc-back-link">
            <i className="ri-arrow-left-line" aria-hidden="true"></i>
            Back to Plans
          </Link>
        </div>

        {/* Plan Header */}
        <div className="sanc-card" style={{ overflow: "hidden", marginBottom: "2.8rem" }}>
          {/* Cover Banner */}
          <div className="sanc-plan-cover" style={{ height: "196px", position: "relative" }}>
            <Image
              src={planImage}
              alt={planData.title}
              fill
              sizes="(max-width: 800px) 100vw, 800px"
              unoptimized={isExternalPlanImage}
              preload
              style={{ objectFit: "cover" }}
            />
            <div
              className="sanc-plan-cover-overlay"
              style={{ justifyContent: "flex-end", padding: "2.2rem 2.8rem" }}
            >
              <div>
                <span className="sanc-badge gold" style={{ marginBottom: "0.8rem" }}>
                  {planData.category} Devotional
                </span>
                <h1
                  style={{
                    fontSize: "clamp(2.2rem, 3.2vw, 2.8rem)",
                    color: "#ffffff",
                    margin: "0.4rem 0 0",
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {planData.title}
                </h1>
              </div>
            </div>
          </div>

          <div style={{ padding: "2.2rem 2.8rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.2rem",
                fontWeight: 600,
                color: "var(--sanc-muted)",
                marginBottom: "0.7rem",
              }}
            >
              <span>COMPLETION PROGRESS</span>
              <span>
                {progress.completedDays.length} / {planData.days.length} DAYS ({completionPct}%)
              </span>
            </div>
            <div className="sanc-progress-track">
              <div
                className="sanc-progress-fill"
                style={{ width: `${completionPct}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Day Select Bubbles */}
        <div className="sanc-day-row" role="navigation" aria-label="Devotional days">
          {planData.days.map((dayObj) => {
            const isCompleted = progress.completedDays.includes(dayObj.day);
            const isActive = activeDayNum === dayObj.day;
            const isSelectable =
              isCompleted || (!hasCompletedToday && dayObj.day <= progress.completedDays.length + 1);

            let statusClass = "locked";
            if (isCompleted) statusClass = "completed";
            else if (isActive) statusClass = "active";
            else if (isSelectable) statusClass = "";

            return (
              <button
                key={dayObj.day}
                type="button"
                className={`sanc-day-bubble ${statusClass}`}
                disabled={!isSelectable}
                onClick={() => handleSelectDay(dayObj.day)}
                title={`Day ${dayObj.day}`}
                aria-label={`Day ${dayObj.day}${isCompleted ? " (completed)" : isActive ? " (current)" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <i className="ri-check-line" style={{ fontSize: "1.6rem" }} aria-hidden="true"></i>
                ) : (
                  dayObj.day
                )}
              </button>
            );
          })}
        </div>

        {/* Devotional Text and Scripture Card */}
        <article className="sanc-card sanc-card-pad">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1.5rem",
              flexWrap: "wrap",
              marginBottom: "2.6rem",
            }}
          >
            <div>
              <span className="sanc-eyebrow" style={{ marginBottom: "0.4rem" }}>
                Day {activeDayNum} of {planData.days.length}
              </span>
              <h2
                style={{
                  fontSize: "2.3rem",
                  color: "var(--sanc-text)",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {dayContent.title}
              </h2>
            </div>
            <button
              type="button"
              className="sanc-btn-gold sanc-btn-sm"
              onClick={() => setShowDevotionalCard(true)}
            >
              <i className="ri-image-line" aria-hidden="true"></i>
              Share Day Card
            </button>
          </div>

          {/* Devotional Reflection */}
          <div className="sanc-prose" style={{ marginBottom: "3.2rem" }}>
            <p>{dayContent.reflection}</p>
          </div>

          {/* Scripture Heading */}
          <div style={{ borderTop: "1px solid var(--sanc-border)", paddingTop: "2.6rem" }}>
            <span className="sanc-label" style={{ display: "block", marginBottom: "1.2rem" }}>
              Today&apos;s Scripture
            </span>

            {/* Clickable Verse Block */}
            <div className="sanc-scripture-box">
              <p
                className={`highlight-text-interactive ${highlights[dayContent.verseId] || ""}`}
                style={{
                  fontSize: "1.85rem",
                  fontStyle: "italic",
                  lineHeight: 1.65,
                  color: "var(--sanc-text)",
                  marginBottom: "1.2rem",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setActiveVerse({
                    id: dayContent.verseId,
                    text: dayContent.verseText,
                    tag: dayContent.verseTag,
                  })
                }
              >
                &ldquo;{dayContent.verseText}&rdquo;
              </p>
              <span
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--sanc-gold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {dayContent.verseTag}
              </span>
            </div>

            <span
              style={{
                display: "block",
                textAlign: "center",
                fontSize: "1.25rem",
                color: "var(--sanc-muted)",
                marginTop: "1.4rem",
              }}
            >
              <i className="ri-lightbulb-line" style={{ marginRight: "0.5rem" }} aria-hidden="true"></i>
              Tip: Click the scripture above to highlight it, write a note, or make an image card.
            </span>
          </div>

          {/* Reflection Section */}
          <div
            style={{
              borderTop: "1px solid var(--sanc-border)",
              paddingTop: "2.6rem",
              marginTop: "2.6rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.4rem",
              }}
            >
              <span className="sanc-label" style={{ margin: 0 }}>
                My Daily Reflection
              </span>
              {!showReflectionInput && (
                <button
                  type="button"
                  className="sanc-btn-ghost sanc-btn-sm"
                  style={{ color: "var(--sanc-gold)" }}
                  onClick={() => {
                    setDraftReflection(savedReflectionText);
                    setShowReflectionInput(true);
                  }}
                >
                  <i className="ri-quill-pen-line" aria-hidden="true"></i>
                  {savedReflectionText ? "Edit Reflection" : "Write Reflection"}
                </button>
              )}
            </div>

            {savedReflectionText && !showReflectionInput && (
              <div className="sanc-reflection-box">
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontStyle: "italic",
                    lineHeight: 1.65,
                    color: "var(--sanc-text)",
                    margin: 0,
                  }}
                >
                  &ldquo;{savedReflectionText}&rdquo;
                </p>
              </div>
            )}

            {!savedReflectionText && !showReflectionInput && (
              <button
                type="button"
                className="sanc-card-muted sanc-reflection-prompt"
                style={{
                  width: "100%",
                  borderStyle: "dashed",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={() => {
                  setDraftReflection("");
                  setShowReflectionInput(true);
                }}
              >
                <i
                  className="ri-quill-pen-line"
                  style={{
                    display: "block",
                    fontSize: "2rem",
                    marginBottom: "0.5rem",
                    color: "var(--sanc-gold)",
                  }}
                  aria-hidden="true"
                ></i>
                <span style={{ fontSize: "1.35rem", fontWeight: 600 }}>
                  Reflect on what you learnt from today&apos;s plan content...
                </span>
              </button>
            )}

            {showReflectionInput && (
              <div className="sanc-stack" style={{ gap: "1.4rem" }}>
                <textarea
                  className="sanc-textarea"
                  rows={5}
                  value={reflectionText}
                  onChange={(e) => setDraftReflection(e.target.value)}
                  placeholder="What did you learn today? Write your personal thoughts, prayers, or applications..."
                />
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="sanc-btn-ghost sanc-btn-sm"
                    onClick={() => {
                      setShowReflectionInput(false);
                      setDraftReflection(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="sanc-btn-primary sanc-btn-sm"
                    onClick={handleSaveReflection}
                  >
                    Save Reflection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div
            style={{
              marginTop: "3.2rem",
              borderTop: "1px solid var(--sanc-border)",
              paddingTop: "2.6rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "1.4rem",
            }}
          >
            {playerNotice && (
              <div
                className={`sanc-alert ${playerNotice.type}`}
                role={playerNotice.type === "gold" ? "status" : "status"}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1.2rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <i
                    className={
                      playerNotice.isCompletion
                        ? "ri-award-line"
                        : playerNotice.type === "gold"
                        ? "ri-information-line"
                        : "ri-checkbox-circle-line"
                    }
                    style={{ fontSize: "1.9rem" }}
                    aria-hidden="true"
                  ></i>
                  <span>{playerNotice.text}</span>
                </div>
                {playerNotice.isCompletion && (
                  <Link href="/plans" className="sanc-btn-primary sanc-btn-sm">
                    Back to Plans
                  </Link>
                )}
              </div>
            )}

            {hasCompletedToday && !playerNotice?.isCompletion && (
              <div
                className="sanc-alert gold"
                role="status"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <i className="ri-information-line" style={{ fontSize: "1.9rem" }} aria-hidden="true"></i>
                <span>
                  Great job completing today&apos;s reading! Take time to reflect on the scripture. Return tomorrow to unlock the next day&apos;s devotional.
                </span>
              </div>
            )}

            <button
              type="button"
              className={isCurrentDayCompleted ? "sanc-btn-secondary" : "sanc-btn-primary"}
              onClick={handleMarkDayComplete}
              disabled={isCurrentDayCompleted}
            >
              {isCurrentDayCompleted ? (
                <>
                  <i className="ri-checkbox-circle-line" aria-hidden="true"></i>
                  Completed
                </>
              ) : (
                <>
                  <i className="ri-check-line" aria-hidden="true"></i>
                  Mark Day as Read
                </>
              )}
            </button>
          </div>
        </article>
      </div>

      {/* Modal Actions Overlay */}
      {activeVerse && (
        <VerseActionsModal
          verseText={activeVerse.text}
          verseTag={activeVerse.tag}
          verseId={activeVerse.id}
          onClose={() => setActiveVerse(null)}
          onStateChange={handleVerseModalStateChange}
        />
      )}

      {/* Devotional Card Creator Modal */}
      {showDevotionalCard && (
        <DevotionalCardCreatorModal
          planTitle={planData.title}
          category={planData.category}
          dayObj={dayContent}
          onClose={() => setShowDevotionalCard(false)}
        />
      )}
    </section>
  );
}
