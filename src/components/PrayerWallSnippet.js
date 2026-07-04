"use client";

import Link from "next/link";

export default function PrayerWallSnippet({ answeredPrayers }) {
  if (!answeredPrayers || answeredPrayers.length === 0) {
    return null;
  }

  return (
    <section className="section" style={{ paddingBlock: "4rem" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .snippet-corkboard {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2.5rem;
          align-items: start;
          margin-top: 2rem;
        }
        .snippet-note {
          position: relative;
          background: linear-gradient(135deg, var(--secondary-background-color) 0%, rgba(167, 103, 229, 0.04) 100%);
          border: 1px solid rgba(167, 103, 229, 0.22);
          border-radius: 12px;
          padding: 2.5rem;
          box-shadow: 0 8px 24px rgba(167, 103, 229, 0.08);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .snippet-note:hover {
          transform: translateY(-5px) rotate(var(--tilt)) scale(1.02) !important;
          box-shadow: 0 15px 35px rgba(167, 103, 229, 0.18);
          border-color: #c893f9;
        }
        .snippet-pushpin {
          position: absolute;
          top: -9px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
          z-index: 5;
          background: radial-gradient(circle, #fad648 30%, #f1c40f 70%, #b7950b 100%);
        }
      `}} />

      <div className="container" style={{ maxWidth: "1000px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <h2 className="title section-title" data-name="Praise">
            Answered Prayers
          </h2>
          <Link href="/prayers?tab=answered" style={{ fontSize: "1.2rem", fontWeight: "600", color: "#c893f9", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <span>View Praise Wall</span>
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>

        <div className="snippet-corkboard">
          {answeredPrayers.slice(0, 3).map((prayer, idx) => {
            const tiltAngle = (idx % 2 === 0 ? 0.6 : -0.6) * (idx % 3 === 0 ? 1 : 0.5);
            return (
              <div 
                key={prayer.id}
                className="snippet-note"
                style={{
                  "--tilt": `${tiltAngle}deg`,
                  transform: `rotate(${tiltAngle}deg)`
                }}
              >
                <div className="snippet-pushpin" />
                
                <div>
                  <h3 style={{ fontSize: "1.6rem", fontWeight: "700", color: "var(--light-color)", marginBottom: "0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prayer.title}
                  </h3>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                    By {prayer.author} &bull; {prayer.date}
                  </span>
                </div>

                <p style={{
                  fontSize: "1.3rem",
                  lineHeight: "1.5",
                  color: "var(--light-color-alt)",
                  whiteSpace: "pre-line",
                  marginBlock: "0.2rem",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {prayer.content}
                </p>

                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "1.5rem", 
                  marginTop: "auto", 
                  paddingTop: "1rem", 
                  borderTop: "1px solid var(--transparent-light-color)",
                  fontSize: "1.2rem",
                  color: "var(--light-color-alt)"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <i className="ri-hand-heart-fill" style={{ color: "var(--accent-color)" }}></i>
                    {prayer.supportCount} Standing
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <i className="ri-chat-smile-3-fill" style={{ color: "#12bcfe" }}></i>
                    {prayer.encouragementCount} Words
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
