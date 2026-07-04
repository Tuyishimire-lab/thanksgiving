"use client";

import { useEffect, useState } from "react";

export default function FaithFootprintsTracker({ stats }) {
  const [counts, setCounts] = useState({
    prayers: 0,
    supports: 0,
    journals: 0
  });

  useEffect(() => {
    if (!stats) return;

    // Soft count-up animation for stats
    const duration = 1000; // 1s
    const steps = 30;
    const stepTime = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setCounts({
        prayers: Math.floor((stats.activePrayers / steps) * currentStep),
        supports: Math.floor((stats.prayerSupport / steps) * currentStep),
        journals: Math.floor((stats.journalEntries / steps) * currentStep)
      });

      if (currentStep >= steps) {
        setCounts({
          prayers: stats.activePrayers,
          supports: stats.prayerSupport,
          journals: stats.journalEntries
        });
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [stats]);

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)",
      border: "1px solid var(--transparent-light-color)",
      borderRadius: "16px",
      padding: "2rem 3rem",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "2.5rem",
      alignItems: "center",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
      marginBlockEnd: "3.5rem"
    }}>
      {/* Stat item 1 */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{
          width: "50px",
          height: "50px",
          borderRadius: "12px",
          background: "rgba(79, 207, 112, 0.1)",
          color: "var(--accent-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.2rem"
        }}>
          <i className="ri-heart-pulse-line"></i>
        </div>
        <div>
          <span style={{ fontSize: "2.4rem", fontWeight: "800", color: "var(--light-color)", display: "block", lineHeight: "1.1" }}>
            {counts.prayers}
          </span>
          <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "500" }}>
            Active Requests
          </span>
        </div>
      </div>

      {/* Stat item 2 */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", borderLeft: "1px solid var(--transparent-light-color)", paddingLeft: "2.5rem" }} className="tracker-stat-col">
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 768px) {
            .tracker-stat-col {
              border-left: none !important;
              padding-left: 0 !important;
            }
          }
        `}} />
        <div style={{
          width: "50px",
          height: "50px",
          borderRadius: "12px",
          background: "rgba(18, 188, 254, 0.1)",
          color: "#12bcfe",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.2rem"
        }}>
          <i className="ri-hand-heart-line"></i>
        </div>
        <div>
          <span style={{ fontSize: "2.4rem", fontWeight: "800", color: "var(--light-color)", display: "block", lineHeight: "1.1" }}>
            {counts.supports}
          </span>
          <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "500" }}>
            Standing In Prayer
          </span>
        </div>
      </div>

      {/* Stat item 3 */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", borderLeft: "1px solid var(--transparent-light-color)", paddingLeft: "2.5rem" }} className="tracker-stat-col">
        <div style={{
          width: "50px",
          height: "50px",
          borderRadius: "12px",
          background: "rgba(200, 147, 249, 0.1)",
          color: "#c893f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.2rem"
        }}>
          <i className="ri-book-open-line"></i>
        </div>
        <div>
          <span style={{ fontSize: "2.4rem", fontWeight: "800", color: "var(--light-color)", display: "block", lineHeight: "1.1" }}>
            {counts.journals}
          </span>
          <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "500" }}>
            Gratitude Journal Entries
          </span>
        </div>
      </div>
    </div>
  );
}
