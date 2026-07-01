"use client";

import { useState, useEffect } from "react";
import VerseActionsModal from "@/components/VerseActionsModal";
import { getHighlights } from "@/data/userState";

export default function VerseOfTheDaySection({ verseOfTheDay, dayOfWeek, initialHighlights, currentUser }) {
  const [activeVerse, setActiveVerse] = useState(null);
  const [highlights, setHighlights] = useState(initialHighlights || {});
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Sync with local storage if not logged in, or allow local changes to reflect
  useEffect(() => {
    if (!currentUser) {
      const localHighlights = getHighlights();
      setHighlights(localHighlights);
    } else {
      setHighlights(initialHighlights || {});
    }
  }, [currentUser, initialHighlights, updateTrigger]);

  const handleStateChange = () => {
    setUpdateTrigger(prev => prev + 1);
  };

  const highlightClass = highlights[verseOfTheDay.id] || "";

  return (
    <>
      <div 
        className={`verse-of-the-day-card ${highlightClass}`} 
        onClick={() => setActiveVerse({
          id: verseOfTheDay.id,
          text: verseOfTheDay.verse,
          tag: verseOfTheDay.tag
        })}
        style={{ cursor: "pointer" }}
      >
        <div className="verse-of-the-day-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span>Verse of the Day • {dayOfWeek}</span>
          <i className="ri-double-quotes-r" style={{ fontSize: "1.8rem", color: "var(--accent-color)", opacity: 0.8 }}></i>
        </div>
        <div className="verse-of-the-day-content">
          "{verseOfTheDay.verse}"
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid var(--transparent-light-color)", paddingTop: "1rem" }}>
          <span className="verse-of-the-day-tag" style={{ margin: 0 }}>
            — {verseOfTheDay.tag}
          </span>
          <span className="verse-tap-instruction">
            <i className="ri-tap-line" style={{ fontSize: "1.3rem" }}></i>
            Reflect & Share
          </span>
        </div>
      </div>

      {activeVerse && (
        <VerseActionsModal
          verseText={activeVerse.text}
          verseTag={activeVerse.tag}
          verseId={activeVerse.id}
          onClose={() => setActiveVerse(null)}
          onStateChange={handleStateChange}
        />
      )}
    </>
  );
}
