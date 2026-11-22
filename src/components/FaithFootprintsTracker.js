"use client";

import Link from "next/link";

export default function FaithFootprintsTracker({ stats }) {
  const counts = {
    prayers: stats?.activePrayers ?? 0,
    supports: stats?.prayerSupport ?? 0,
    journals: stats?.journalEntries ?? 0,
  };

  return (
    <div className="home-pulse-strip" aria-label="Community pulse">
      <Link href="/prayers" className="home-pulse-item">
        <span className="home-pulse-icon" aria-hidden="true">
          <i className="ri-heart-pulse-line"></i>
        </span>
        <div>
          <span className="home-pulse-value">{counts.prayers}</span>
          <span className="home-pulse-label">Active Requests</span>
        </div>
      </Link>

      <Link href="/prayers" className="home-pulse-item">
        <span className="home-pulse-icon" aria-hidden="true">
          <i className="ri-hand-heart-line"></i>
        </span>
        <div>
          <span className="home-pulse-value">{counts.supports}</span>
          <span className="home-pulse-label">Standing in Prayer</span>
        </div>
      </Link>

      <Link href="/#daily-journal" className="home-pulse-item">
        <span className="home-pulse-icon" aria-hidden="true">
          <i className="ri-book-open-line"></i>
        </span>
        <div>
          <span className="home-pulse-value">{counts.journals}</span>
          <span className="home-pulse-label">Gratitude Entries</span>
        </div>
      </Link>
    </div>
  );
}
