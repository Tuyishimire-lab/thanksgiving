"use client";

import { useState, useEffect } from "react";
import { verses } from "@/data/verses";

export default function VerseSection() {
  const [verseOfTheDay, setVerseOfTheDay] = useState(null);
  const [olderVerses, setOlderVerses] = useState([]);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [showOlder, setShowOlder] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("");

  useEffect(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    
    // Map current date to 2024 year which is used in the verses.js dataset
    const targetDateStr = `2024-${month}-${day}`;
    
    const currentVerse = verses.find((v) => v.date === targetDateStr) || verses[0];
    setVerseOfTheDay(currentVerse);
    
    // Day of the week name
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    setDayOfWeek(dayName);

    // Get previous verses (verses prior to the current date in 2024)
    const currentVerseIndex = verses.findIndex((v) => v.date === targetDateStr);
    if (currentVerseIndex > 0) {
      // Get up to 6 recent older verses to show as suggestions
      const past = verses.slice(0, currentVerseIndex).reverse().slice(0, 6);
      setOlderVerses(past);
    } else {
      // If first day of the year, fall back to some verses
      setOlderVerses(verses.slice(1, 7));
    }
  }, []);

  const getDayNameFromDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  if (!verseOfTheDay) return null;

  return (
    <>
      {/* Verse of the Day Section */}
      <section id="word-of-the-day" style={{ paddingBlock: "4rem" }}>
        <div className="container">
          <div className="verse-of-the-day-card" style={{ cursor: "pointer" }} onClick={() => setSelectedVerse(verseOfTheDay)}>
            <div className="verse-of-the-day-title">Verse of the Day: {dayOfWeek}</div>
            <div className="verse-of-the-day-content">"{verseOfTheDay.verse}"</div>
            <div className="verse-of-the-day-tag">{verseOfTheDay.tag}</div>
          </div>

          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <button 
              className="btn place-items-center" 
              style={{
                border: "2px solid var(--secondary-background-color)",
                padding: "1rem 2rem",
                borderRadius: "30px",
                fontSize: "1.4rem",
                fontWeight: "600",
                transition: "all 0.3s ease"
              }}
              onClick={() => setShowOlder(!showOlder)}
            >
              {showOlder ? "Hide Previous Verses" : "Reflect on Previous Verses"}
              <i className={showOlder ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} style={{ marginLeft: "0.5rem" }}></i>
            </button>
          </div>
        </div>
      </section>

      {/* Older Verses Library */}
      {showOlder && (
        <section className="section" style={{ background: "var(--secondary-background-color)", transition: "all 0.3s ease" }}>
          <div className="container">
            <h2 className="title section-title" data-name="Library" style={{ marginBottom: "4rem" }}>
              Previous Readings
            </h2>
            <div className="verse-list">
              {olderVerses.map((v, index) => {
                const dayName = getDayNameFromDate(v.date);
                return (
                  <div 
                    key={index} 
                    className="card" 
                    onClick={() => setSelectedVerse(v)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-title">{dayName}</div>
                    <div className="card-content">"{v.verse.substring(0, 100)}..."</div>
                    <div className="card-tag">{v.tag}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Modal Popup */}
      {selectedVerse && (
        <div 
          className="modal" 
          style={{ display: "flex" }} 
          onClick={(e) => {
            if (e.target.classList.contains("modal")) {
              setSelectedVerse(null);
            }
          }}
        >
          <div className="modal-content">
            <span className="close-button" onClick={() => setSelectedVerse(null)}>
              &times;
            </span>
            <h2 id="modal-title" style={{ color: "var(--light-color)" }}>
              Reflections: {getDayNameFromDate(selectedVerse.date)}
            </h2>
            <p id="modal-verse" style={{ fontStyle: "italic", marginBlock: "2rem", lineHeight: "1.6" }}>
              "{selectedVerse.verse}"
            </p>
            <span id="modal-tag" className="card-tag">
              {selectedVerse.tag}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
