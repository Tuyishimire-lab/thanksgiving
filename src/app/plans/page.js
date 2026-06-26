"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPlansProgress } from "@/data/userState";

const PLANS = [
  {
    id: "gratitude",
    title: "Gratitude in All Things",
    days: 5,
    tag: "#Gratitude",
    image: "/assets/images/tags/food-tag.jpg",
    description: "Discover the transforming power of daily thanksgiving, even in difficult seasons. Learn to focus on what you have received."
  },
  {
    id: "love",
    title: "Walk in Love",
    days: 5,
    tag: "#Love",
    image: "/assets/images/tags/travel-tag.jpg",
    description: "Deep dive into the biblical definition of love, how to love difficult people, and reflecting Christ's compassion in the modern world."
  },
  {
    id: "hope",
    title: "Unshakable Hope",
    days: 5,
    tag: "#Hope",
    image: "/assets/images/tags/nature-tag.jpg",
    description: "Anchor your heart in God's promises. A 5-day journey out of fear and worry, looking forward to the future with anticipation."
  },
  {
    id: "strength",
    title: "Strength in Weakness",
    days: 5,
    tag: "#Strength",
    image: "/assets/images/tags/fitness-tag.jpg",
    description: "Where does our help come from? Find divine empowerment, encouragement, and patience for the trials that weigh you down."
  },
  {
    id: "patience",
    title: "The Art of Patience",
    days: 5,
    tag: "#Patience",
    image: "/assets/images/tags/health-tag.jpg",
    description: "In a fast-paced world, learning to wait on the Lord is a core beacon. Find calmness and trust during delay."
  },
  {
    id: "happiness",
    title: "Joy & Happiness",
    days: 5,
    tag: "#Happiness",
    image: "/assets/images/tags/technology-tag.jpg",
    description: "Reclaim the joy of the Lord as your strength. Uncover true happiness that does not depend on outward circumstances."
  }
];

export default function PlansIndex() {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    setProgress(getPlansProgress());
  }, []);

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container">
        
        {/* Banner */}
        <div className="headline-banner" style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "var(--font-size-lg)", color: "var(--light-color)", marginBottom: "1rem" }}>
            Devotional Reading Plans
          </h2>
          <p style={{ fontSize: "1.6rem", color: "var(--light-color-alt)", maxWidth: "600px", margin: "0 auto" }}>
            Grow in your faith with multi-day devotionals matching our Six Beacons. Track your progress daily.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="devotional-plan-grid">
          {PLANS.map((plan) => {
            const planProg = progress[plan.id];
            const isStarted = !!planProg;
            const completedCount = isStarted ? planProg.completedDays.length : 0;
            const percent = Math.round((completedCount / plan.days) * 100);

            return (
              <div 
                key={plan.id} 
                style={{
                  background: "var(--secondary-background-color)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  border: "1px solid var(--transparent-light-color)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.25s, box-shadow 0.25s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                }}
              >
                {/* Plan Image Header */}
                <div style={{ height: "140px", position: "relative", overflow: "hidden" }}>
                  <img 
                    src={plan.image} 
                    alt={plan.title} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                  <div style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7))",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: "1.5rem"
                  }}>
                    <span style={{ color: "#fad648", fontWeight: "700", fontSize: "1.2rem", letterSpacing: "1px" }}>
                      {plan.tag.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "2.5rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontSize: "2rem", color: "var(--light-color)", marginBottom: "1rem" }}>
                      {plan.title}
                    </h3>
                    <p style={{ fontSize: "1.4rem", lineHeight: "1.5", color: "var(--light-color-alt)", marginBottom: "2rem" }}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Progress / Button */}
                  <div>
                    {isStarted ? (
                      <div style={{ marginBottom: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                          <span>PROGRESS</span>
                          <span>{completedCount} / {plan.days} DAYS ({percent}%)</span>
                        </div>
                        <div className="progress-bar-container" style={{ margin: "0" }}>
                          <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600", marginBottom: "1.5rem" }}>
                        {plan.days} DAYS DEVOTIONAL
                      </div>
                    )}

                    <Link 
                      href={`/plans/${plan.id}`}
                      style={{
                        display: "block",
                        background: isStarted ? "transparent" : "var(--gradient-color)",
                        border: isStarted ? "2px solid var(--light-color)" : "none",
                        color: "#fff",
                        borderRadius: "30px",
                        padding: "1rem",
                        textAlign: "center",
                        fontSize: "1.4rem",
                        fontWeight: "700",
                        transition: "opacity 0.2s"
                      }}
                    >
                      {isStarted ? (planProg.isCompleted ? "Review Plan" : "Continue Reading") : "Start Plan"}
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
