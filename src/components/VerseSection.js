"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { getVerseOfTheDay, getRecentVerses } from "@/data/verses";

const emptySubscribe = () => () => {};
const getServerSnapshot = () => null;

let cachedDateKey = null;
let cachedVerseData = null;

function getVerseSectionSnapshot() {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (cachedVerseData && cachedDateKey === dateKey) {
    return cachedVerseData;
  }

  const votd = getVerseOfTheDay(today);
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const olderVerses = getRecentVerses(6, today);

  cachedDateKey = dateKey;
  cachedVerseData = {
    verseOfTheDay: { verse: votd.verse, tag: votd.tag, id: votd.id },
    dayOfWeek,
    olderVerses,
  };
  return cachedVerseData;
}

export default function VerseSection() {
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [showOlder, setShowOlder] = useState(false);

  const data = useSyncExternalStore(
    emptySubscribe,
    getVerseSectionSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (!selectedVerse) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedVerse(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedVerse]);

  if (!data) return null;

  const { verseOfTheDay, dayOfWeek, olderVerses } = data;

  return (
    <>
      {/* Verse of the Day Section */}
      <section id="word-of-the-day" className="sanc-page" style={{ paddingBlock: "4rem" }}>
        <div className="sanc-container-md">
          <div
            className="sanc-card sanc-card-pad sanc-card-hover"
            style={{ cursor: "pointer", textAlign: "center" }}
            onClick={() => setSelectedVerse(verseOfTheDay)}
          >
            <span className="sanc-eyebrow">Verse of the Day &bull; {dayOfWeek}</span>
            <p
              style={{
                fontFamily: "var(--font-family-reader), Georgia, serif",
                fontStyle: "italic",
                fontSize: "2.1rem",
                lineHeight: "1.65",
                color: "var(--sanc-text)",
                margin: "1.2rem auto 1.6rem",
                maxWidth: "68rem",
              }}
            >
              &quot;{verseOfTheDay.verse}&quot;
            </p>
            <span className="sanc-badge gold">{verseOfTheDay.tag}</span>
          </div>

          <div style={{ textAlign: "center", marginTop: "2.4rem" }}>
            <button
              type="button"
              className="sanc-btn-secondary"
              onClick={() => setShowOlder(!showOlder)}
            >
              {showOlder ? "Hide Previous Verses" : "Reflect on Previous Verses"}
              <i
                className={showOlder ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"}
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </div>
      </section>

      {/* Older Verses Library */}
      {showOlder && (
        <section className="sanc-page" style={{ paddingBlock: "3rem 5rem" }}>
          <div className="sanc-container-md">
            <div className="sanc-section-head" style={{ marginBottom: "2.4rem" }}>
              <div>
                <span className="sanc-eyebrow">Library</span>
                <h2 className="sanc-section-title">Previous Readings</h2>
              </div>
            </div>

            <div className="sanc-grid-3">
              {olderVerses.map(({ verse: v, id, label }, index) => (
                <div
                  key={id || index}
                  className="sanc-card sanc-card-pad sanc-card-hover"
                  onClick={() => setSelectedVerse(v)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1.2rem",
                  }}
                >
                  <div>
                    <span className="sanc-eyebrow" style={{ marginBottom: "0.8rem" }}>
                      {label}
                    </span>
                    <p
                      style={{
                        fontFamily: "var(--font-family-reader), Georgia, serif",
                        fontSize: "1.5rem",
                        lineHeight: "1.6",
                        color: "var(--sanc-text)",
                      }}
                    >
                      &quot;{v.verse.length > 100 ? `${v.verse.substring(0, 100)}...` : v.verse}&quot;
                    </p>
                  </div>
                  <span className="sanc-badge gold" style={{ alignSelf: "flex-start" }}>
                    {v.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal Popup */}
      {selectedVerse &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="sanc-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Scripture Reflection"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedVerse(null);
              }
            }}
          >
            <div className="sanc-modal-dialog narrow">
              <div className="sanc-modal-header">
                <h2 className="sanc-modal-title">Reflections</h2>
                <button
                  type="button"
                  className="sanc-modal-close"
                  onClick={() => setSelectedVerse(null)}
                  aria-label="Close reflection modal"
                >
                  <i className="ri-close-line" aria-hidden="true"></i>
                </button>
              </div>
              <div className="sanc-modal-body" style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: "var(--font-family-reader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: "1.8rem",
                    lineHeight: "1.7",
                    color: "var(--sanc-text)",
                    marginBottom: "1.6rem",
                  }}
                >
                  &quot;{selectedVerse.verse}&quot;
                </p>
                <div>
                  <span className="sanc-badge gold">{selectedVerse.tag}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
