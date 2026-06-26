"use client";

import { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { devotionals } from "@/data/devotionals";
import { getPlansProgress, startPlan, completePlanDay, getHighlights } from "@/data/userState";
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
        <Link href="/plans" style={{ color: "#4fcf70", textDecoration: "underline", fontSize: "1.6rem" }}>
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

  useEffect(() => {
    // Start the plan if not already started
    const planProg = startPlan(planId);
    setProgress(planProg);
    
    // Default to the first uncompleted day
    if (planProg.isCompleted) {
      setActiveDayNum(1);
    } else {
      setActiveDayNum(planProg.currentDay);
    }
  }, [planId]);

  useEffect(() => {
    setHighlights(getHighlights());
  }, [updateTrigger]);

  const refreshProgress = () => {
    const progressMap = getPlansProgress();
    setProgress(progressMap[planId] || null);
  };

  const handleMarkDayComplete = () => {
    const totalDays = planData.days.length;
    completePlanDay(planId, activeDayNum, totalDays);
    refreshProgress();
    setUpdateTrigger(prev => prev + 1);

    if (activeDayNum < totalDays) {
      setActiveDayNum(activeDayNum + 1);
    } else {
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
            
            // Allow clicking days that are completed, or the current uncompleted day
            const isSelectable = isCompleted || dayObj.day <= (progress.completedDays.length + 1);

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

          {/* Action Footer */}
          <div 
            style={{ 
              marginTop: "4rem", 
              borderTop: "1px solid var(--transparent-light-color)", 
              paddingTop: "3rem",
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <button
              onClick={handleMarkDayComplete}
              disabled={progress.completedDays.includes(activeDayNum)}
              style={{
                background: progress.completedDays.includes(activeDayNum) ? "var(--transparent-light-color)" : "var(--gradient-color)",
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
