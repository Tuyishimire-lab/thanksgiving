"use client";

import { useState, useEffect, Suspense } from "react";
import { bibleBooks } from "@/data/bibleBooks";
import { getHighlights } from "@/data/userState";
import VerseActionsModal from "@/components/VerseActionsModal";
import { getMe } from "@/app/actions/authActions";
import { getNotebookData } from "@/app/actions/dbActions";
import { MOOD_TAGS } from "@/data/verseMoods";
import { verses as allStaticVerses } from "@/data/verses";

const TRANSLATIONS = [
  { id: "web", name: "World English Bible (WEB)" },
  { id: "kjv", name: "King James Version (KJV)" },
  { id: "bbe", name: "Basic English (BBE)" },
  { id: "asv", name: "American Standard (ASV)" }
];

function BibleReaderContent() {
  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [selectedTranslation, setSelectedTranslation] = useState("web");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  
  const [activeVerse, setActiveVerse] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [selectedMood, setSelectedMood] = useState(null);

  // Get current book details
  const currentBook = bibleBooks.find(b => b.name === selectedBook) || bibleBooks[0];
  const maxChapters = currentBook.chapters;

  // Sync chapter count when book changes
  useEffect(() => {
    setSelectedChapter(1);
  }, [selectedBook]);

  // Load highlights from DB or localStorage
  const refreshHighlights = async () => {
    const user = await getMe();
    if (user) {
      const notebook = await getNotebookData();
      setHighlights(notebook.highlights || {});
    } else {
      setHighlights(getHighlights());
    }
  };

  useEffect(() => {
    refreshHighlights();
  }, [updateTrigger]);

  // Fetch scripture from api.bible
  useEffect(() => {
    let active = true;
    const fetchScripture = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryBook = selectedBook.replace(/\s+/g, "+");
        const url = `https://bible-api.com/${queryBook}+${selectedChapter}?translation=${selectedTranslation}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Unable to fetch scripture. Please check your internet connection.");
        }
        const data = await res.json();
        if (active) {
          setChapterData(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchScripture();
    return () => {
      active = false;
    };
  }, [selectedBook, selectedChapter, selectedTranslation]);

  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1);
    } else {
      // Go to previous book's last chapter
      const bookIdx = bibleBooks.findIndex(b => b.name === selectedBook);
      if (bookIdx > 0) {
        const prevBook = bibleBooks[bookIdx - 1];
        setSelectedBook(prevBook.name);
        setSelectedChapter(prevBook.chapters);
      }
    }
  };

  const handleNextChapter = () => {
    if (selectedChapter < maxChapters) {
      setSelectedChapter(selectedChapter + 1);
    } else {
      // Go to next book's first chapter
      const bookIdx = bibleBooks.findIndex(b => b.name === selectedBook);
      if (bookIdx < bibleBooks.length - 1) {
        const nextBook = bibleBooks[bookIdx + 1];
        setSelectedBook(nextBook.name);
        setSelectedChapter(1);
      }
    }
  };

  const navigateToVerse = (tag) => {
    const lastSpaceIdx = tag.lastIndexOf(" ");
    if (lastSpaceIdx === -1) return;
    
    let book = tag.substring(0, lastSpaceIdx).trim();
    let ref = tag.substring(lastSpaceIdx + 1).trim();
    
    if (["NIV", "ESV", "NKJV", "KJV", "NLT", "NASB"].includes(ref)) {
      const remainingTag = tag.substring(0, lastSpaceIdx).trim();
      const secondLastSpaceIdx = remainingTag.lastIndexOf(" ");
      if (secondLastSpaceIdx !== -1) {
        book = remainingTag.substring(0, secondLastSpaceIdx).trim();
        ref = remainingTag.substring(secondLastSpaceIdx + 1).trim();
      }
    }

    const colonIdx = ref.indexOf(":");
    let chapter = 1;
    if (colonIdx !== -1) {
      chapter = parseInt(ref.substring(0, colonIdx), 10);
    } else {
      chapter = parseInt(ref, 10);
    }

    if (book && !isNaN(chapter)) {
      const matched = bibleBooks.find(b => 
        b.name.toLowerCase() === book.toLowerCase() || 
        b.name.toLowerCase().replace(/\s+/g, "") === book.toLowerCase().replace(/\s+/g, "")
      );
      if (matched) {
        setSelectedBook(matched.name);
        setSelectedChapter(chapter);
        
        // Scroll to the main text panel
        const pane = document.getElementById("scripture-reading-pane");
        if (pane) {
          pane.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const getVersesForMood = (mood) => {
    const refs = MOOD_TAGS[mood] || [];
    const matched = [];
    refs.forEach(ref => {
      const match = allStaticVerses.find(v => v.tag.includes(ref));
      if (match) {
        matched.push(match);
      } else {
        matched.push({
          verse: `Find comfort and strength in God's promises.`,
          tag: ref
        });
      }
    });
    return matched;
  };

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Mood Selector bar */}
        <div style={{
          background: "var(--secondary-background-color)",
          padding: "2.5rem",
          borderRadius: "12px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
          marginBottom: "3rem"
        }}>
          <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600", display: "block", marginBottom: "1.2rem", letterSpacing: "1px" }}>
            HOW IS YOUR SOUL TODAY?
          </span>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {Object.keys(MOOD_TAGS).map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                style={{
                  background: selectedMood === mood ? "var(--accent-color)" : "rgba(255, 255, 255, 0.05)",
                  color: selectedMood === mood ? "#131417" : "var(--light-color)",
                  border: "1px solid",
                  borderColor: selectedMood === mood ? "var(--accent-color)" : "var(--transparent-light-color)",
                  padding: "0.6rem 1.6rem",
                  borderRadius: "20px",
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.25s"
                }}
              >
                {mood}
              </button>
            ))}
          </div>

          {selectedMood && (
            <div style={{ 
              marginTop: "2rem", 
              paddingTop: "1.5rem", 
              borderTop: "1px solid var(--transparent-light-color)",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem"
            }}>
              <span style={{ fontSize: "1.15rem", color: "var(--light-color-alt)", fontStyle: "italic" }}>
                Scriptures for comfort and guidance when feeling <strong style={{ color: "var(--accent-color)" }}>{selectedMood}</strong>:
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
                {getVersesForMood(selectedMood).map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigateToVerse(v.tag)}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--transparent-light-color)",
                      borderRadius: "8px",
                      padding: "1.2rem",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.25s",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem"
                    }}
                  >
                    <p style={{ fontSize: "1.25rem", color: "var(--light-color)", lineHeight: "1.4", fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      "{v.verse}"
                    </p>
                    <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--accent-color)" }}>
                      {v.tag} &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selectors Bar */}
        <div 
          style={{ 
            background: "var(--secondary-background-color)", 
            padding: "2rem", 
            borderRadius: "12px", 
            boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
            marginBottom: "3rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1.5rem"
          }}
        >
          {/* Book Select */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600" }}>BOOK</label>
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              style={{
                background: "var(--primary-background-color)",
                color: "var(--light-color)",
                border: "1px solid var(--transparent-light-color)",
                borderRadius: "6px",
                padding: "1rem",
                fontSize: "1.4rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {bibleBooks.map((book) => (
                <option key={book.name} value={book.name}>{book.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter Select */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600" }}>CHAPTER</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
              style={{
                background: "var(--primary-background-color)",
                color: "var(--light-color)",
                border: "1px solid var(--transparent-light-color)",
                borderRadius: "6px",
                padding: "1rem",
                fontSize: "1.4rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map((chap) => (
                <option key={chap} value={chap}>{chap}</option>
              ))}
            </select>
          </div>

          {/* Translation Select */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600" }}>TRANSLATION</label>
            <select
              value={selectedTranslation}
              onChange={(e) => setSelectedTranslation(e.target.value)}
              style={{
                background: "var(--primary-background-color)",
                color: "var(--light-color)",
                border: "1px solid var(--transparent-light-color)",
                borderRadius: "6px",
                padding: "1rem",
                fontSize: "1.4rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Text Reader Interface */}
        <div 
          id="scripture-reading-pane"
          style={{ 
            background: "var(--secondary-background-color)",
            padding: "4rem 3rem",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
            minHeight: "400px",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2.4rem", color: "var(--light-color)" }}>
              {selectedBook} {selectedChapter}
            </h2>
            <span style={{ fontSize: "1.2rem", padding: "0.5rem 1rem", background: "var(--transparent-light-color)", borderRadius: "20px", textTransform: "uppercase", fontWeight: "600" }}>
              {selectedTranslation}
            </span>
          </div>

          {loading ? (
            <div className="place-items-center" style={{ width: "100%", height: "200px", color: "var(--light-color-alt)" }}>
              Loading scripture verses...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#ff5e62" }}>
              <i className="ri-error-warning-line" style={{ fontSize: "4rem", display: "block", marginBottom: "1.5rem" }}></i>
              <p style={{ fontSize: "1.6rem" }}>{error}</p>
              <button 
                onClick={() => setUpdateTrigger(prev => prev + 1)}
                style={{ marginTop: "2rem", padding: "0.8rem 2rem", background: "var(--light-color)", color: "var(--primary-background-color)", borderRadius: "30px", fontWeight: "600", cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          ) : chapterData && chapterData.verses ? (
            <div style={{ fontSize: "1.8rem", lineHeight: "2", color: "var(--light-color)", textAlign: "justify" }}>
              {chapterData.verses.map((v) => {
                const verseId = `${v.book_name}_${v.chapter}_${v.verse}`;
                const highlightColor = highlights[verseId] || "";
                
                return (
                  <span 
                    key={v.verse} 
                    className={`highlight-text-interactive ${highlightColor}`}
                    onClick={() => setActiveVerse({
                      id: verseId,
                      text: v.text.trim(),
                      tag: `${v.book_name} ${v.chapter}:${v.verse} ${selectedTranslation.toUpperCase()}`
                    })}
                    style={{ display: "inline", paddingRight: "4px" }}
                  >
                    <sup 
                      style={{ 
                        fontSize: "1rem", 
                        fontWeight: "600",
                        color: "var(--light-color-alt)", 
                        marginRight: "4px",
                        userSelect: "none"
                      }}
                    >
                      {v.verse}
                    </sup>
                    {v.text.trim()}
                    {" "}
                  </span>
                );
              })}
            </div>
          ) : null}

          {/* Reader Pagination Buttons */}
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginTop: "4rem", 
              borderTop: "1px solid var(--transparent-light-color)",
              paddingTop: "2.5rem"
            }}
          >
            <button
              onClick={handlePrevChapter}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                color: "var(--light-color-alt)"
              }}
            >
              <i className="ri-arrow-left-s-line"></i>
              Previous Chapter
            </button>

            <button
              onClick={handleNextChapter}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                color: "var(--light-color-alt)"
              }}
            >
              Next Chapter
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>
        </div>

        {/* Tip Box */}
        <div style={{ textAlign: "center", marginTop: "3rem", fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
          <i className="ri-lightbulb-line" style={{ marginRight: "0.5rem" }}></i>
          Tip: Tap any verse above to highlight it, write reflections, or make a social image card.
        </div>
      </div>

      {/* Modal Actions Overlay */}
      {activeVerse && (
        <VerseActionsModal
          verseText={activeVerse.text}
          verseTag={activeVerse.tag}
          verseId={activeVerse.id}
          onClose={() => setActiveVerse(null)}
          onStateChange={() => setUpdateTrigger(prev => prev + 1)}
        />
      )}
    </section>
  );
}

export default function BibleReader() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "5rem", textAlign: "center" }}>Loading Bible...</div>}>
      <BibleReaderContent />
    </Suspense>
  );
}
