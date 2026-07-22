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

    // Rotation-based: use day-of-year so every day always has a verse
    // and all 390 verses cycle through regardless of year
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay); // 1–365

    const totalVerses = verses.length;
    const todayIndex = (dayOfYear - 1) % totalVerses;

    setVerseOfTheDay(verses[todayIndex]);

    // Day of the week name
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    setDayOfWeek(dayName);

    // Previous 6 verses (wrapping around if needed)
    const past = [];
    for (let i = 1; i <= 6; i++) {
      const idx = (todayIndex - i + totalVerses) % totalVerses;
      past.push(verses[idx]);
    }
    setOlderVerses(past);
  }, []);

  const getLabel = (verse, offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
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
              {olderVerses.map((v, index) => (
                <div 
                  key={index} 
                  className="card" 
                  onClick={() => setSelectedVerse(v)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="card-title">{getLabel(v, index + 1)}</div>
                  <div className="card-content">"{v.verse.substring(0, 100)}..."</div>
                  <div className="card-tag">{v.tag}</div>
                </div>
              ))}
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
              Reflections
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
