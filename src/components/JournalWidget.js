"use client";

import { useState } from "react";
import { saveLocalJournalEntry } from "@/data/userState";
import { saveJournalEntry } from "@/app/actions/dbActions";

export default function JournalWidget({ currentUser, journalPrompt }) {
  const [journalText, setJournalText] = useState("");
  const [isJournalSaving, setIsJournalSaving] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);

  const handleSaveJournal = async () => {
    if (!journalText.trim()) return;
    setIsJournalSaving(true);
    try {
      if (currentUser) {
        const res = await saveJournalEntry(journalPrompt, journalText);
        if (res.error) {
          alert(res.error);
        } else {
          setJournalSaved(true);
          setJournalText("");
        }
      } else {
        saveLocalJournalEntry(journalPrompt, journalText);
        setJournalSaved(true);
        setJournalText("");
      }
    } catch (err) {
      console.error("Failed to save journal:", err);
      alert("Something went wrong while saving your reflection.");
    } finally {
      setIsJournalSaving(false);
      setTimeout(() => setJournalSaved(false), 4000);
    }
  };

  return (
    <div className="journal-widget-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <i className="ri-booklet-line" style={{ fontSize: "2.4rem", color: "var(--accent-color)" }}></i>
          <h3 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--light-color)" }}>
            Daily Gratitude Journal
          </h3>
        </div>
        <span style={{
          background: "rgba(18, 188, 254, 0.08)",
          color: "#12bcfe",
          padding: "0.3rem 1rem",
          borderRadius: "20px",
          fontSize: "1.1rem",
          fontWeight: "700"
        }}>
          {currentUser ? "SECURED IN CLOUD" : "GUEST MODE (LOCAL)"}
        </span>
      </div>

      <div className="journal-prompt-box">
        <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600", display: "block", marginBottom: "0.5rem", letterSpacing: "1px" }}>
          TODAY'S PROMPT
        </span>
        <p style={{ fontSize: "1.5rem", color: "var(--light-color)", lineHeight: "1.5", fontWeight: "500" }}>
          {journalPrompt || "What is a small blessing you experienced today?"}
        </p>
      </div>

      {journalSaved ? (
        <div className="journal-saved-alert">
          <i className="ri-checkbox-circle-fill" style={{ fontSize: "2.2rem", display: "block", marginBottom: "0.5rem" }}></i>
          Praise report saved successfully! Your entry is logged in your notebook.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <textarea
            rows="3"
            placeholder="Type your thankfulness reflection here..."
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            className="journal-textarea"
          />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontSize: "1.15rem", color: "var(--light-color-alt)", maxWidth: "550px" }}>
              {!currentUser && "💡 Your entry will save locally in this browser. Register or sign in to back up your journal."}
            </span>
            <button
              onClick={handleSaveJournal}
              disabled={isJournalSaving || !journalText.trim()}
              className={`journal-submit-btn ${journalText.trim() ? "active" : ""}`}
            >
              {isJournalSaving ? "Saving..." : "Log Reflection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
