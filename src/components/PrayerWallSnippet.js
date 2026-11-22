"use client";

import Link from "next/link";

export default function PrayerWallSnippet({ answeredPrayers }) {
  if (!answeredPrayers || answeredPrayers.length === 0) {
    return null;
  }

  return (
    <section className="home-section">
      <div className="container">
        <div className="home-section-header">
          <div>
            <span className="home-eyebrow">Praise Wall</span>
            <h2 className="home-section-title">Answered Prayers</h2>
          </div>
          <Link href="/prayers?tab=answered" className="home-section-link">
            <span>View Praise Wall</span>
            <i className="ri-arrow-right-line" aria-hidden="true"></i>
          </Link>
        </div>

        <div className="home-praise-grid">
          {answeredPrayers.slice(0, 3).map((prayer) => (
            <article key={prayer.id} className="home-praise-card">
              <span className="home-praise-badge">Answered Prayer</span>

              <div>
                <h3>{prayer.title}</h3>
                <span className="home-praise-meta">
                  By {prayer.author} &bull; {prayer.date}
                </span>
              </div>

              <p className="home-praise-excerpt">{prayer.content}</p>

              <div className="home-praise-stats">
                <span>
                  <i className="ri-hand-heart-fill" aria-hidden="true"></i>
                  {prayer.supportCount} Standing
                </span>
                <span>
                  <i className="ri-chat-smile-3-fill" aria-hidden="true"></i>
                  {prayer.encouragementCount} Words
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
