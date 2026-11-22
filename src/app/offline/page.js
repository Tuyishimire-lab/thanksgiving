"use client";

import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <section
      className="sanc-page"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="sanc-container-sm">
        <div
          className="sanc-card sanc-card-pad"
          style={{
            maxWidth: "52rem",
            margin: "0 auto",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.6rem",
          }}
        >
          <div
            className="sanc-stat-icon gold"
            style={{ width: "6.4rem", height: "6.4rem", borderRadius: "50%" }}
          >
            <i className="ri-wifi-off-line" style={{ fontSize: "3rem" }} aria-hidden="true"></i>
          </div>

          <div>
            <span className="sanc-eyebrow">No Connection</span>
            <h1 className="sanc-title">You&apos;re Offline</h1>
          </div>

          <blockquote
            className="sanc-blockquote"
            style={{ width: "100%", marginBlock: "0.4rem", textAlign: "center" }}
          >
            &ldquo;Be still, and know that I am God.&rdquo;
            <span
              style={{
                display: "block",
                marginTop: "0.6rem",
                fontStyle: "normal",
                fontSize: "1.3rem",
                fontWeight: 600,
                color: "var(--sanc-gold)",
              }}
            >
              &mdash; Psalm 46:10
            </span>
          </blockquote>

          <p
            style={{
              fontSize: "1.42rem",
              lineHeight: 1.65,
              color: "var(--sanc-muted)",
              margin: 0,
            }}
          >
            PraisePage cannot reach the internet right now. Check your connection or try
            refreshing below.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "1.1rem",
              marginTop: "0.4rem",
            }}
          >
            <button type="button" onClick={handleRetry} className="sanc-btn-primary">
              Try Again
            </button>
            <Link href="/" className="sanc-btn-secondary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
