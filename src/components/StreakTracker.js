"use client";

import { useEffect, useSyncExternalStore } from "react";
import { updateStreak, getStreak } from "@/data/userState";

const STREAK_EVENT = "praisepage-streak-change";
let hasSyncedClientStreak = false;
let cachedLocalStreak = null;

function subscribeStreak(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(STREAK_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STREAK_EVENT, callback);
  };
}

function getStreakServerSnapshot() {
  return null;
}

function getStreakSnapshot() {
  if (!hasSyncedClientStreak) return null;
  const current = getStreak();
  if (
    cachedLocalStreak &&
    cachedLocalStreak.count === current.count &&
    cachedLocalStreak.lastActive === current.lastActive &&
    cachedLocalStreak.freezes === current.freezes
  ) {
    return cachedLocalStreak;
  }
  cachedLocalStreak = current;
  return cachedLocalStreak;
}

export default function StreakTracker({ currentUser, dbStreak, dayOfWeek }) {
  const localStreak = useSyncExternalStore(
    subscribeStreak,
    getStreakSnapshot,
    getStreakServerSnapshot
  );

  useEffect(() => {
    if (currentUser) return;
    // Offline/guest: calculate and update local storage streak once mounted
    const updated = updateStreak();
    hasSyncedClientStreak = true;
    cachedLocalStreak = updated;
    window.dispatchEvent(new Event(STREAK_EVENT));
  }, [currentUser]);

  const loading = !currentUser && localStreak === null;
  const streak = currentUser
    ? (dbStreak || { count: 0, lastActive: null })
    : (localStreak || { count: 0, lastActive: null, freezes: 1 });

  const freezes = currentUser
    ? (currentUser.streak_freezes_count ?? 1)
    : (streak.freezes ?? 1);

  return (
    <div className="home-streak-card">
      <div className="home-streak-top">
        <div className="home-streak-identity">
          <div className="home-streak-flame" aria-hidden="true">
            <i className="ri-fire-fill"></i>
          </div>
          <div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="shimmer" style={{ width: "110px", height: "1.8rem", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "90px", height: "1.2rem", borderRadius: "4px" }}></div>
              </div>
            ) : (
              <>
                <h3>
                  {streak.count} {streak.count === 1 ? "Day" : "Days"} Streak
                </h3>
                <p>Nourish your soul daily</p>
              </>
            )}
          </div>
        </div>

        <div className="home-streak-badges">
          {loading ? (
            <span className="shimmer" style={{ width: "68px", height: "2.2rem", borderRadius: "30px", display: "inline-block" }}></span>
          ) : (
            <>
              <span className="home-badge-active">ACTIVE</span>
              <span className="home-badge-freeze">
                <i className="ri-snowflake-line" aria-hidden="true"></i>
                {freezes} {freezes === 1 ? "Freeze" : "Freezes"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 7-Day Habit Progress Row */}
      {!loading && (
        <div className="home-week-bar">
          <span className="home-week-label">THIS WEEK&apos;S WALK</span>
          <div className="home-week-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayAbbr, idx) => {
              const dayIndexMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
              const todayAbbr = (dayOfWeek || "").substring(0, 3);
              const currentDayIdx = dayIndexMap[todayAbbr] ?? 0;

              // Highlight if it's today or within the active streak range
              const isActive =
                idx === currentDayIdx ||
                (idx < currentDayIdx && idx >= currentDayIdx - (streak.count - 1));

              const isToday = idx === currentDayIdx;

              return (
                <div key={dayAbbr} className="home-day-cell">
                  <div
                    className={`home-day-circle${isActive ? " active" : ""}${isToday ? " today" : ""}`}
                  >
                    {isActive ? (
                      <i className="ri-check-line" aria-hidden="true"></i>
                    ) : (
                      dayAbbr[0]
                    )}
                  </div>
                  <span className="home-day-name">{dayAbbr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
