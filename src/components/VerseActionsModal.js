"use client";

import { useState, useEffect } from "react";
import { 
  toggleHighlight as toggleHighlightLocal, 
  saveNote as saveNoteLocal, 
  getHighlights as getHighlightsLocal, 
  getNotes as getNotesLocal 
} from "@/data/userState";
import { getMe } from "@/app/actions/authActions";
import { 
  toggleHighlight as toggleHighlightDb, 
  saveNote as saveNoteDb,
  getNotebookData
} from "@/app/actions/dbActions";
import VerseImageCreator from "./VerseImageCreator";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", class: "highlight-yellow", hex: "#ffe066" },
  { name: "Green", class: "highlight-green", hex: "#a9e34b" },
  { name: "Blue", class: "highlight-blue", hex: "#74c0fc" },
  { name: "Pink", class: "highlight-pink", hex: "#faa2c1" }
];

export default function VerseActionsModal({ verseText, verseTag, verseId, onClose, onStateChange }) {
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showImageCreator, setShowImageCreator] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadState() {
      const currentUser = await getMe();
      setUser(currentUser);

      if (currentUser) {
        // Load existing highlight and note for this specific verse from DB
        const notebook = await getNotebookData();
        const dbHighlights = notebook.highlights || {};
        const dbNotes = notebook.notes || {};
        
        if (dbHighlights[verseId]) {
          setActiveHighlight(dbHighlights[verseId]);
        }
        
        if (dbNotes[verseId]) {
          setNoteText(dbNotes[verseId].text);
        }
      } else {
        // Load existing highlight and note for this specific verse from local storage
        const highlights = getHighlightsLocal();
        const notes = getNotesLocal();
        
        if (highlights[verseId]) {
          setActiveHighlight(highlights[verseId]);
        }
        
        if (notes[verseId]) {
          setNoteText(notes[verseId].text);
        }
      }
    }
    loadState();
  }, [verseId]);

  const handleColorClick = async (colorClass) => {
    if (user) {
      const res = await toggleHighlightDb(verseId, colorClass);
      setActiveHighlight(res.color);
    } else {
      const newHighlights = toggleHighlightLocal(verseId, colorClass);
      const newColor = newHighlights[verseId] || null;
      setActiveHighlight(newColor);
    }
    if (onStateChange) onStateChange();
  };

  const handleNoteChange = async (e) => {
    const text = e.target.value;
    setNoteText(text);
    if (user) {
      await saveNoteDb(verseId, text);
    } else {
      saveNoteLocal(verseId, text);
    }
    if (onStateChange) onStateChange();
  };

  const clearHighlight = async () => {
    if (user) {
      await toggleHighlightDb(verseId, null);
      setActiveHighlight(null);
    } else {
      toggleHighlightLocal(verseId, null);
      setActiveHighlight(null);
    }
    if (onStateChange) onStateChange();
  };

  return (
    <div className="drawer-backdrop" onClick={(e) => {
      if (e.target.classList.contains("drawer-backdrop")) {
        onClose();
      }
    }}>
      <div className="drawer-content" style={{ maxWidth: showImageCreator ? "750px" : "600px" }}>
        
        {!showImageCreator ? (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "2rem", color: "var(--light-color)" }}>Verse Options</h3>
              <button onClick={onClose} style={{ cursor: "pointer", color: "var(--light-color-alt)" }}>
                <i className="ri-close-line" style={{ fontSize: "2.4rem" }}></i>
              </button>
            </div>

            {/* Verse Preview Text */}
            <div 
              style={{ 
                background: "var(--primary-background-color)", 
                padding: "2rem", 
                borderRadius: "8px", 
                marginBottom: "2.5rem",
                borderLeft: "4px solid var(--accent-color)"
              }}
            >
              <p style={{ fontStyle: "italic", fontSize: "1.6rem", lineHeight: "1.6", marginBottom: "1rem" }}>
                "{verseText}"
              </p>
              <span style={{ fontSize: "1.3rem", fontWeight: "600", color: "var(--accent-color)" }}>
                {verseTag}
              </span>
            </div>

            {/* Highlight Section */}
            <div style={{ marginBottom: "2.5rem" }}>
              <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
                HIGHLIGHT VERSE
              </span>
              <div className="color-picker-container" style={{ justifyContent: "flex-start", alignItems: "center" }}>
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.class}
                    onClick={() => handleColorClick(color.class)}
                    className={`color-pill ${activeHighlight === color.class ? "active" : ""}`}
                    style={{ background: color.hex }}
                    title={`Highlight in ${color.name}`}
                  />
                ))}
                
                {activeHighlight && (
                  <button 
                    onClick={clearHighlight}
                    style={{ 
                      marginLeft: "1rem", 
                      cursor: "pointer", 
                      color: "#ff5e62",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "1.3rem",
                      fontWeight: "600"
                    }}
                  >
                    <i className="ri-delete-bin-line" style={{ fontSize: "1.8rem" }}></i>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ marginBottom: "2.5rem" }}>
              <label 
                htmlFor="verse-note" 
                style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}
              >
                MY REFLECTIONS / NOTE
              </label>
              <textarea
                id="verse-note"
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Write down what this verse means to you..."
                rows="4"
                style={{
                  width: "100%",
                  padding: "1.2rem",
                  borderRadius: "6px",
                  border: "2px solid var(--transparent-light-color)",
                  background: "var(--primary-background-color)",
                  color: "var(--light-color)",
                  fontSize: "1.4rem",
                  lineHeight: "1.5",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="drawer-actions">
              <button
                onClick={() => setShowImageCreator(true)}
                className="btn-action btn-primary"
              >
                <i className="ri-image-line" style={{ fontSize: "1.8rem" }}></i>
                Create Visual Card
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`"${verseText}" - ${verseTag}`);
                  alert("Copied verse to clipboard!");
                }}
                className="btn-action btn-secondary"
              >
                <i className="ri-file-copy-line" style={{ fontSize: "1.8rem" }}></i>
                Copy Text
              </button>
            </div>
          </>
        ) : (
          <VerseImageCreator 
            verseText={verseText} 
            verseTag={verseTag} 
            onClose={() => setShowImageCreator(false)} 
          />
        )}
        
      </div>
    </div>
  );
}
