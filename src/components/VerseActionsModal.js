"use client";

import { useState, useEffect } from "react";
import { toggleHighlight, saveNote, getHighlights, getNotes } from "@/data/userState";
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

  useEffect(() => {
    // Load existing highlight and note for this specific verse
    const highlights = getHighlights();
    const notes = getNotes();
    
    if (highlights[verseId]) {
      setActiveHighlight(highlights[verseId]);
    }
    
    if (notes[verseId]) {
      setNoteText(notes[verseId].text);
    }
  }, [verseId]);

  const handleColorClick = (colorClass) => {
    const newHighlights = toggleHighlight(verseId, colorClass);
    const newColor = newHighlights[verseId] || null;
    setActiveHighlight(newColor);
    if (onStateChange) onStateChange();
  };

  const handleNoteChange = (e) => {
    const text = e.target.value;
    setNoteText(text);
    saveNote(verseId, text);
    if (onStateChange) onStateChange();
  };

  const clearHighlight = () => {
    toggleHighlight(verseId, null);
    setActiveHighlight(null);
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
                borderLeft: "4px solid #4fcf70"
              }}
            >
              <p style={{ fontStyle: "italic", fontSize: "1.6rem", lineHeight: "1.6", marginBottom: "1rem" }}>
                "{verseText}"
              </p>
              <span style={{ fontSize: "1.3rem", fontWeight: "600", color: "#4fcf70" }}>
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
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "2rem" }}>
              <button
                onClick={() => setShowImageCreator(true)}
                style={{
                  flex: 1,
                  background: "var(--gradient-color)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "30px",
                  padding: "1.2rem",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.8rem"
                }}
              >
                <i className="ri-image-line" style={{ fontSize: "1.8rem" }}></i>
                Create Visual Card
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`"${verseText}" - ${verseTag}`);
                  alert("Copied verse to clipboard!");
                }}
                style={{
                  padding: "1.2rem 2.5rem",
                  borderRadius: "30px",
                  border: "2px solid var(--transparent-light-color)",
                  background: "transparent",
                  color: "var(--light-color)",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem"
                }}
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
