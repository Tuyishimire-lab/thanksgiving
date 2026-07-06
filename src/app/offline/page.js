"use client";

import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "70vh",
      padding: "2rem",
      textAlign: "center",
      backgroundColor: "var(--primary-background-color)",
      color: "var(--light-color)"
    }}>
      <div style={{
        backgroundColor: "var(--secondary-background-color)",
        padding: "4rem 2rem",
        borderRadius: "16px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        maxWidth: "500px",
        border: "1px solid var(--transparent-light-color)"
      }}>
        <div style={{
          fontSize: "5rem",
          color: "var(--accent-color)",
          marginBottom: "2rem"
        }}>
          <i className="ri-wifi-off-line"></i>
        </div>
        <h1 style={{
          fontFamily: "var(--font-family-serif, serif)",
          fontSize: "2.8rem",
          marginBottom: "1.5rem",
          fontWeight: "700"
        }}>
          You're Offline
        </h1>
        <p style={{
          fontSize: "1.5rem",
          color: "var(--light-color-alt)",
          lineHeight: "1.6",
          marginBottom: "2.5rem"
        }}>
          "Be still, and know that I am God."<br/>
          <span style={{ fontSize: "1.2rem", opacity: 0.8 }}>— Psalm 46:10</span>
        </p>
        <p style={{
          fontSize: "1.4rem",
          color: "var(--light-color-alt)",
          marginBottom: "3rem",
          opacity: 0.9
        }}>
          PraisePage cannot reach the internet right now. Check your connection or try refreshing below.
        </p>
        <div style={{
          display: "flex",
          gap: "1.5rem",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button 
            onClick={handleRetry}
            style={{
              padding: "1.2rem 2.4rem",
              borderRadius: "30px",
              border: "none",
              backgroundColor: "var(--accent-color)",
              color: "#131417",
              fontWeight: "600",
              fontSize: "1.4rem",
              cursor: "pointer",
              transition: "transform 0.2s, opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
            onMouseOut={(e) => e.currentTarget.style.opacity = 1}
          >
            Try Again
          </button>
          <Link 
            href="/"
            style={{
              padding: "1.2rem 2.4rem",
              borderRadius: "30px",
              border: "1px solid var(--transparent-light-color)",
              backgroundColor: "var(--transparent-light-color)",
              color: "var(--light-color)",
              fontWeight: "600",
              fontSize: "1.4rem",
              textDecoration: "none",
              transition: "background-color 0.2s"
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
