"use client";

import { useState, useEffect } from "react";
import { updateStreak, getStreak } from "@/data/userState";

export default function StreakTracker({ currentUser, dbStreak, dayOfWeek }) {
  const [streak, setStreak] = useState({ count: 0, lastActive: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setStreak(dbStreak || { count: 0, lastActive: null });
    } else {
      // Offline/guest: calculate and update local storage streak
      const localStreak = updateStreak();
      setStreak(localStreak);
    }
    setLoading(false);
  }, [currentUser, dbStreak]);

  const freezes = currentUser 
    ? (currentUser.streak_freezes_count ?? 1) 
    : (streak.freezes ?? 1);

  return (
    <div className="streak-card" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
        <div className="streak-number-wrapper" style={{ gap: "1.2rem", display: "flex", alignItems: "center" }}>
          <div className="streak-fire-icon" style={{ fontSize: "3.2rem", color: "var(--accent-color)" }}>
            <i className="ri-fire-fill"></i>
          </div>
          <div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="shimmer" style={{ width: "100px", height: "1.6rem", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "80px", height: "1.1rem", borderRadius: "4px" }}></div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "1.8rem", fontWeight: "600", color: "var(--light-color)" }}>
                  {streak.count} Day Streak
                </h3>
                <p style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                  Nourish your soul daily
                </p>
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "flex-end" }}>
          {loading ? (
            <span className="shimmer" style={{ width: "60px", height: "2rem", borderRadius: "30px", display: "inline-block" }}></span>
          ) : (
            <>
              <span style={{
                background: "rgba(79, 207, 112, 0.12)",
                color: "var(--accent-color)",
                padding: "0.4rem 1.2rem",
                borderRadius: "30px",
                fontSize: "1.2rem",
                fontWeight: "600",
                letterSpacing: "0.5px"
              }}>
                ACTIVE
              </span>
              <span style={{
                background: "rgba(18, 188, 254, 0.12)",
                color: "#12bcfe",
                padding: "0.2rem 1rem",
                borderRadius: "20px",
                fontSize: "1.1rem",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                <i className="ri-snowflake-line"></i>
                {freezes} Freezes
              </span>
            </>
          )}
        </div>
      </div>

      {/* 7-Day Habit Progress Row */}
      {!loading && (
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
  );
}
