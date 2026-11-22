"use client";

import { useState, useRef, useEffect } from "react";
import { saveLocalJournalEntry } from "@/data/userState";
import { saveJournalEntry } from "@/app/actions/dbActions";

export default function JournalWidget({ currentUser, journalPrompt }) {
  const [journalText, setJournalText] = useState("");
  const [isJournalSaving, setIsJournalSaving] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [journalError, setJournalError] = useState("");
  const savedTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSaveJournal = async () => {
    if (!journalText.trim()) return;
    setIsJournalSaving(true);
    setJournalError("");
    let didSave = false;
    try {
      if (currentUser) {
        const res = await saveJournalEntry(journalPrompt, journalText);
        if (res.error) {
          setJournalError(res.error);
        } else {
          setJournalSaved(true);
          setJournalText("");
          didSave = true;
        }
      } else {
        saveLocalJournalEntry(journalPrompt, journalText);
        setJournalSaved(true);
        setJournalText("");
        didSave = true;
      }
    } catch (err) {
      console.error("Failed to save journal:", err);
      setJournalError("Something went wrong while saving your reflection.");
    } finally {
      setIsJournalSaving(false);
      if (didSave) {
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setJournalSaved(false), 4000);
      }
    }
  };

  return (
    <div id="daily-journal" className="home-journal-card">
      <div className="home-journal-header">
        <div>
          <i className="ri-booklet-line" aria-hidden="true"></i>
          <h3>Daily Gratitude Journal</h3>
        </div>
        <span className="home-journal-sync">
          {currentUser ? "Cloud Synced" : "Local Mode"}
        </span>
      </div>

      <div className="home-journal-prompt">
        <span>TODAY&apos;S PROMPT</span>
        <p>
          {journalPrompt || "What is a small blessing you experienced today?"}
        </p>
      </div>

      {journalSaved ? (
        <div className="home-journal-status" role="status">
          <i className="ri-checkbox-circle-fill" aria-hidden="true"></i>
          Praise report saved successfully! Your entry is logged in your notebook.
        </div>
      ) : (
        <>
          <textarea
            rows={3}
            placeholder="Type your thankfulness reflection here..."
            value={journalText}
            onChange={(e) => {
              setJournalText(e.target.value);
              if (journalError) setJournalError("");
            }}
            className="home-journal-textarea"
          />

          {journalError && (
            <div className="home-journal-error" role="alert">
              {journalError}
            </div>
          )}

          <div className="home-journal-footer">
            <span>
              {!currentUser &&
                "Your entry saves locally in this browser. Sign in to back up your journal."}
            </span>
            <button
              type="button"
              onClick={handleSaveJournal}
              disabled={isJournalSaving || !journalText.trim()}
              className={`home-journal-btn${journalText.trim() ? " active" : ""}`}
            >
              {isJournalSaving ? "Saving..." : "Log Reflection"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
