"use client";

import { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { devotionals } from "@/data/devotionals";
import { 
  getPlansProgress as getPlansProgressLocal, 
  startPlan as startPlanLocal, 
  completePlanDay as completePlanDayLocal, 
  getHighlights as getHighlightsLocal, 
  getPlanReflections as getPlanReflectionsLocal, 
  savePlanReflection as savePlanReflectionLocal 
} from "@/data/userState";
import { getMe } from "@/app/actions/authActions";
import { 
  getDevotionalProgress as getDevotionalProgressDb, 
  updateDevotionalProgress as updateDevotionalProgressDb,
  savePlanReflection as savePlanReflectionDb,
  getPlanReflections as getPlanReflectionsDb,
  getNotebookData
} from "@/app/actions/dbActions";
import VerseActionsModal from "@/components/VerseActionsModal";

function PlanPlayerContent({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const planId = unwrappedParams.id;
  const planData = devotionals[planId];

  if (!planData) {
    return (
      <div className="container" style={{ paddingBlock: "8rem", textAlign: "center" }}>
        <h2>Plan Not Found</h2>
        <p style={{ marginBlock: "2rem" }}>We couldn't find the reading plan you were looking for.</p>
        <Link href="/plans" style={{ color: "var(--accent-color)", textDecoration: "underline", fontSize: "1.6rem" }}>
          Back to Reading Plans
        </Link>
      </div>
    );
  }

  const [progress, setProgress] = useState(null);
  const [activeDayNum, setActiveDayNum] = useState(1);
  const [activeVerse, setActiveVerse] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [reflectionText, setReflectionText] = useState("");
  const [showReflectionInput, setShowReflectionInput] = useState(false);
  const [user, setUser] = useState(null);

      useEffect(() => {
        async function initPlanPlayer() {
          const currentUser = await getMe();
          setUser(currentUser);

          let planProg = null;
          if (currentUser) {
            // Logged in: fetch plans progress from DB
            const dbProgress = await getDevotionalProgressDb();
            planProg = dbProgress[planId];
            
            if (!planProg) {
              // Initialize in DB if not started
              await updateDevotionalProgressDb(planId, [], false, 1);
              planProg = {
                planId,
                currentDay: 1,
                completedDays: [],
                isCompleted: false,
                startDate: new Date().toLocaleDateString(),
                lastCompletedDate: null
              };
            }
          } else {
            // Guest: start using local storage
            planProg = startPlanLocal(planId);
          }

          setProgress(planProg);

          // Default to the first uncompleted day, unless they completed a day today
          if (planProg.isCompleted) {
            setActiveDayNum(1);
          } else {
            const todayStr = new Date().toLocaleDateString();
            const hasCompletedToday = planProg.lastCompletedDate === todayStr;
            if (hasCompletedToday && planProg.completedDays && planProg.completedDays.length > 0) {
              setActiveDayNum(Math.max(...planProg.completedDays));
            } else {
              setActiveDayNum(planProg.currentDay);
            }
          }
        }
        initPlanPlayer();
      }, [planId]);

  useEffect(() => {
    async function loadHighlightsAndReflections() {
      let activeHighlights = {};
      let activeReflections = {};

      if (user) {
        const [notebook, reflections] = await Promise.all([
          getNotebookData(),
          getPlanReflectionsDb()
        ]);
        activeHighlights = notebook.highlights || {};
        activeReflections = reflections;
      } else {
        activeHighlights = getHighlightsLocal();
        activeReflections = getPlanReflectionsLocal();
      }

      setHighlights(activeHighlights);
      
      const currentKey = `${planId}_${activeDayNum}`;
      const savedRef = activeReflections[currentKey];
      setReflectionText(savedRef ? savedRef.text : "");
      setShowReflectionInput(false);
    }
    loadHighlightsAndReflections();
  }, [planId, activeDayNum, user, updateTrigger]);

  const handleSaveReflection = async () => {
    if (user) {
      await savePlanReflectionDb(planId, activeDayNum, reflectionText);
    } else {
      savePlanReflectionLocal(planId, activeDayNum, reflectionText);
    }
    setShowReflectionInput(false);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleMarkDayComplete = async () => {
    const totalDays = planData.days.length;
    const todayStr = new Date().toLocaleDateString();

    const hasCompletedToday = progress && progress.lastCompletedDate === todayStr;
    if (hasCompletedToday) {
      alert("You have already completed a day of this plan today. Take time to reflect and return tomorrow to continue.");
      return;
    }
    
    if (user) {
      const completedDays = [...progress.completedDays];
      if (!completedDays.includes(activeDayNum)) {
        completedDays.push(activeDayNum);
      }
      const isCompleted = completedDays.length >= totalDays;
      const nextDay = Math.min(totalDays, progress.currentDay + 1);
      
      await updateDevotionalProgressDb(planId, completedDays, isCompleted, nextDay, todayStr);
      
      setProgress({
        ...progress,
        completedDays,
        isCompleted,
        currentDay: nextDay,
        lastCompletedDate: todayStr
      });
    } else {
      completePlanDayLocal(planId, activeDayNum, totalDays, todayStr);
      const progressMap = getPlansProgressLocal();
      setProgress(progressMap[planId] || null);
    }

    setUpdateTrigger(prev => prev + 1);

    if (activeDayNum >= totalDays) {
      alert("Congratulations! You have completed the plan: " + planData.title);
      router.push("/plans");
    }
  };

  const dayContent = planData.days.find(d => d.day === activeDayNum) || planData.days[0];

  if (!progress) {
    return (
      <div className="place-items-center" style={{ width: "100%", height: "400px", color: "var(--light-color-alt)" }}>
        Starting reading plan...
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString();
  const hasCompletedToday = progress && progress.lastCompletedDate === todayStr;

  return (
    <section className="section" style={{ paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: "3rem" }}>
          <Link href="/plans" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--light-color-alt)", fontSize: "1.4rem", fontWeight: "600" }}>
            <i className="ri-arrow-left-line"></i> Back to Plans
          </Link>
        </div>

        {/* Plan Header */}
        <div 
          style={{ 
            background: "var(--secondary-background-color)", 
            padding: "3rem", 
            borderRadius: "12px", 
            boxShadow: "0 5px 15px rgba(0,0,0,0.12)",
            marginBottom: "3rem",
            border: "1px solid var(--transparent-light-color)"
          }}
        >
          <span style={{ fontSize: "1.2rem", color: "#fad648", fontWeight: "700", letterSpacing: "1px" }}>DEVOTIONAL PLAN</span>
          <h2 style={{ fontSize: "2.4rem", color: "var(--light-color)", marginBlock: "0.5rem 1.5rem" }}>
            {planData.title}
          </h2>

          {/* Progress Indicator */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            <span>COMPLETION</span>
            <span>{progress.completedDays.length} / {planData.days.length} DAYS</span>
          </div>
          <div className="progress-bar-container" style={{ margin: "0" }}>
            <div className="progress-bar-fill" style={{ width: `${(progress.completedDays.length / planData.days.length) * 100}%` }}></div>
          </div>
        </div>

        {/* Day Select Bubbles */}
        <div className="day-bubble-row">
          {planData.days.map((dayObj) => {
            const isCompleted = progress.completedDays.includes(dayObj.day);
            const isActive = activeDayNum === dayObj.day;
            
            // Allow clicking days that are completed.
            // If they haven't completed a day today, they can also click the current/next uncompleted day.
            const isSelectable = isCompleted || (!hasCompletedToday && dayObj.day <= (progress.completedDays.length + 1));

            let statusClass = "locked";
            if (isCompleted) statusClass = "completed";
            else if (isActive) statusClass = "active";
            else if (isSelectable) statusClass = "";

            return (
              <button
                key={dayObj.day}
                className={`day-bubble ${statusClass}`}
                disabled={!isSelectable}
                onClick={() => setActiveDayNum(dayObj.day)}
                title={`Day ${dayObj.day}`}
              >
                {isCompleted ? <i className="ri-check-line" style={{ fontSize: "1.6rem" }}></i> : dayObj.day}
              </button>
            );
          })}
        </div>

        {/* Devotional Text and Scripture Card */}
        <div 
          style={{ 
            background: "var(--secondary-background-color)", 
            padding: "4rem 3rem", 
            borderRadius: "12px", 
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
            border: "1px solid var(--transparent-light-color)"
          }}
        >
          <div style={{ marginBottom: "3rem" }}>
            <span style={{ fontSize: "1.3rem", color: "var(--light-color-alt)", fontWeight: "600" }}>
              DAY {activeDayNum} OF {planData.days.length}
            </span>
            <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)", marginTop: "0.5rem" }}>
              {dayContent.title}
            </h3>
          </div>

          {/* Devotional Reflection */}
          <div 
            style={{ 
              fontSize: "1.6rem", 
              lineHeight: "1.8", 
              color: "var(--light-color-alt)", 
              marginBottom: "4rem",
              textAlign: "justify"
            }}
          >
            <p>{dayContent.reflection}</p>
          </div>

          {/* Scripture Heading */}
          <div style={{ borderTop: "1px solid var(--transparent-light-color)", paddingTop: "3rem" }}>
            <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1.5rem" }}>
              TODAY'S SCRIPTURE
            </span>
            
            {/* Clickable Verse Block */}
            <div 
              style={{ 
                background: "var(--primary-background-color)", 
                padding: "2.5rem", 
                borderRadius: "8px", 
                borderLeft: "4px solid #fad648"
              }}
            >
              <p 
                className={`highlight-text-interactive ${highlights[dayContent.verseId] || ""}`}
                style={{ fontSize: "1.8rem", fontStyle: "italic", lineHeight: "1.6", color: "var(--light-color)", marginBottom: "1.5rem" }}
                onClick={() => setActiveVerse({
                  id: dayContent.verseId,
                  text: dayContent.verseText,
                  tag: dayContent.verseTag
                })}
              >
                "{dayContent.verseText}"
              </p>
              <span style={{ fontSize: "1.3rem", fontWeight: "700", color: "#fad648", textTransform: "uppercase" }}>
                {dayContent.verseTag}
              </span>
            </div>
            
            <span style={{ display: "block", textAlign: "center", fontSize: "1.2rem", color: "var(--light-color-alt)", marginTop: "1.5rem" }}>
              <i className="ri-lightbulb-line" style={{ marginRight: "0.5rem" }}></i>
              Tip: Click the scripture above to highlight it, write a note, or make an image card.
            </span>
          </div>

          {/* Reflection Section */}
          <div style={{ borderTop: "1px solid var(--transparent-light-color)", paddingTop: "3rem", marginTop: "3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--light-color-alt)", letterSpacing: "1px" }}>
                MY DAILY REFLECTION
              </span>
              {!showReflectionInput && (
                <button
                  onClick={() => setShowReflectionInput(true)}
                  style={{
                    color: "#fad648",
                    fontSize: "1.3rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  <i className="ri-quill-pen-line"></i>
                  {reflectionText ? "Edit Reflection" : "Write Reflection"}
                </button>
              )}
            </div>

            {reflectionText && !showReflectionInput && (
              <div 
                style={{ 
                  background: "rgba(250, 214, 72, 0.05)", 
                  padding: "2.5rem", 
                  borderRadius: "8px", 
                  borderLeft: "4px solid #fad648",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
              >
                <p style={{ fontSize: "1.5rem", fontStyle: "italic", lineHeight: "1.6", color: "var(--light-color)" }}>
                  "{reflectionText}"
                </p>
              </div>
            )}

            {!reflectionText && !showReflectionInput && (
              <div 
                onClick={() => setShowReflectionInput(true)}
                style={{
                  background: "var(--primary-background-color)",
                  border: "1px dashed var(--transparent-light-color)",
                  padding: "2rem",
                  borderRadius: "8px",
                  textAlign: "center",
                  cursor: "pointer",
                  color: "var(--light-color-alt)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#fad648";
                  e.currentTarget.style.color = "var(--light-color)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--transparent-light-color)";
                  e.currentTarget.style.color = "var(--light-color-alt)";
                }}
              >
                <i className="ri-quill-pen-line" style={{ display: "block", fontSize: "2rem", marginBottom: "0.5rem", color: "#fad648" }}></i>
                <span style={{ fontSize: "1.3rem", fontWeight: "600" }}>Reflect on what you learnt from today's plan content...</span>
              </div>
            )}

            {showReflectionInput && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="What did you learn today? Write your personal thoughts, prayers, or applications..."
                  style={{
                    width: "100%",
                    minHeight: "120px",
                    background: "var(--primary-background-color)",
                    color: "var(--light-color)",
                    border: "1px solid var(--transparent-light-color)",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    fontSize: "1.5rem",
                    lineHeight: "1.6",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit"
                  }}
                />
                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setShowReflectionInput(false);
                      const reflections = getPlanReflections();
                      const currentKey = `${planId}_${activeDayNum}`;
                      const savedRef = reflections[currentKey];
                      setReflectionText(savedRef ? savedRef.text : "");
                    }}
                    style={{
                      background: "transparent",
                      color: "var(--light-color-alt)",
                      padding: "0.8rem 2rem",
                      borderRadius: "20px",
                      fontSize: "1.3rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveReflection}
                    style={{
                      background: "var(--accent-color)",
                      color: "#fff",
                      padding: "0.8rem 2.5rem",
                      borderRadius: "20px",
                      fontSize: "1.3rem",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
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
              marginTop: "4rem", 
              borderTop: "1px solid var(--transparent-light-color)", 
              paddingTop: "3rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "1.5rem"
            }}
          >
            {hasCompletedToday && (
              <div 
                style={{ 
                  color: "#fad648", 
                  fontSize: "1.4rem", 
                  fontWeight: "600",
                  textAlign: "left",
                  background: "rgba(250, 214, 72, 0.08)",
                  padding: "1.5rem 2rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(250, 214, 72, 0.2)",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem"
                }}
              >
                <i className="ri-information-line" style={{ fontSize: "1.8rem", color: "#fad648" }}></i>
                <span>
                  Great job completing today's reading! Take time to reflect on the scripture. Return tomorrow to unlock the next day's devotional.
                </span>
              </div>
            )}
            <button
              onClick={handleMarkDayComplete}
              disabled={progress.completedDays.includes(activeDayNum)}
              style={{
                background: progress.completedDays.includes(activeDayNum) ? "var(--transparent-light-color)" : "var(--accent-color)",
                color: "#fff",
                border: "none",
                borderRadius: "30px",
                padding: "1.2rem 3rem",
                fontSize: "1.5rem",
                fontWeight: "700",
                cursor: progress.completedDays.includes(activeDayNum) ? "not-allowed" : "pointer",
                opacity: progress.completedDays.includes(activeDayNum) ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                transition: "opacity 0.2s"
              }}
            >
              {progress.completedDays.includes(activeDayNum) ? (
                <>
                  <i className="ri-checkbox-circle-line" style={{ fontSize: "1.8rem" }}></i>
                  Completed
                </>
              ) : (
                <>
                  <i className="ri-check-line" style={{ fontSize: "1.8rem" }}></i>
                  Mark Day as Read
                </>
              )}
            </button>
          </div>

        </div>

      </div>

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
    </section>
  );
}

export default function PlanPlayer({ params }) {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "5rem", textAlign: "center" }}>Loading reading day...</div>}>
      <PlanPlayerContent params={params} />
    </Suspense>
  );
}
