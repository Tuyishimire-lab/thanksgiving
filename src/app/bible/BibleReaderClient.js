"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const paramBook = searchParams.get("book");
  const paramChapter = searchParams.get("chapter");
  const paramQ = searchParams.get("q");

  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [selectedTranslation, setSelectedTranslation] = useState("web");
  const nextVerseTimerRef = useRef(null);

  // Load book/chapter from query params
  useEffect(() => {
    let book = paramBook;
    let chapter = parseInt(paramChapter, 10);

    if (paramQ) {
      const trimmedQ = paramQ.trim();
      const lastSpaceIdx = trimmedQ.lastIndexOf(" ");
      if (lastSpaceIdx !== -1) {
        let parsedBook = trimmedQ.substring(0, lastSpaceIdx).trim();
        let ref = trimmedQ.substring(lastSpaceIdx + 1).trim();

        const colonIdx = ref.indexOf(":");
        let parsedChapter = 1;
        if (colonIdx !== -1) {
          parsedChapter = parseInt(ref.substring(0, colonIdx), 10);
        } else {
          parsedChapter = parseInt(ref, 10);
        }

        if (parsedBook && !isNaN(parsedChapter)) {
          const matched = bibleBooks.find(b => {
            const name1 = b.name.toLowerCase().replace(/\s+/g, "");
            const name2 = parsedBook.toLowerCase().replace(/\s+/g, "");
            return name1 === name2 || 
                   name1 === name2 + "s" || 
                   name1 + "s" === name2 ||
                   (name1 === "psalms" && name2 === "psalm") ||
                   (name1 === "psalm" && name2 === "psalms");
          });
          if (matched) {
            book = matched.name;
            chapter = parsedChapter;
          }
        }
      } else {
        const matched = bibleBooks.find(b => b.name.toLowerCase() === trimmedQ.toLowerCase());
        if (matched) {
          book = matched.name;
          chapter = 1;
        }
      }
    }

    if (book) {
      const matchedBook = bibleBooks.find(b => b.name.toLowerCase() === book.toLowerCase());
      if (matchedBook) {
        setSelectedBook(matchedBook.name);
        if (!isNaN(chapter) && chapter > 0 && chapter <= matchedBook.chapters) {
          setSelectedChapter(chapter);
        } else {
          setSelectedChapter(1);
        }
      }
    }
  }, [paramBook, paramChapter, paramQ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  
  const [activeVerse, setActiveVerse] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [selectedMood, setSelectedMood] = useState(null);

  // Reader Customizer preference states
  const [fontSize, setFontSize] = useState("medium"); // "small", "medium", "large", "xlarge"
  const [fontFamily, setFontFamily] = useState("serif"); // "serif", "sans"
  const [readerTheme, setReaderTheme] = useState("default"); // "default", "sepia", "dark", "light"
  const [showSettings, setShowSettings] = useState(false);

  // Audio text-to-speech player states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [speakingVerseNum, setSpeakingVerseNum] = useState(null);


  // Sync setting customizers from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSize = localStorage.getItem("bible_font_size");
      const savedFamily = localStorage.getItem("bible_font_family");
      const savedTheme = localStorage.getItem("bible_reader_theme");
      if (savedSize) setFontSize(savedSize);
      if (savedFamily) setFontFamily(savedFamily);
      if (savedTheme) setReaderTheme(savedTheme);
    }
  }, []);

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem("bible_font_size", size);
  };

  const changeFontFamily = (family) => {
    setFontFamily(family);
    localStorage.setItem("bible_font_family", family);
  };

  const changeReaderTheme = (theme) => {
    setReaderTheme(theme);
    localStorage.setItem("bible_reader_theme", theme);
  };

  // Helper utility to translate reader themes to styling attributes
  const getThemeStyles = () => {
    switch (readerTheme) {
      case "sepia":
        return {
          backgroundColor: "#f4ecd8",
          color: "#5b4636",
          borderColor: "#e4dcc4",
          verseNumColor: "#8c7058"
        };
      case "dark":
        return {
          backgroundColor: "#18191c",
          color: "#e3e4e8",
          borderColor: "#2a2b2f",
          verseNumColor: "#8e9095"
        };
      case "light":
        return {
          backgroundColor: "#ffffff",
          color: "#1c1d22",
          borderColor: "#e3e4e8",
          verseNumColor: "#8c8e94"
        };
      default:
        return {
          backgroundColor: "var(--secondary-background-color)",
          color: "var(--light-color)",
          borderColor: "var(--transparent-light-color)",
          verseNumColor: "var(--light-color-alt)"
        };
    }
  };

  const getFontSizeStyle = () => {
    switch (fontSize) {
      case "small": return "1.55rem";
      case "large": return "2.1rem";
      case "xlarge": return "2.4rem";
      default: return "1.8rem";
    }
  };

  const getFontFamilyStyle = () => {
    return fontFamily === "serif"
      ? 'var(--font-family-serif), Georgia, serif'
      : 'var(--font-family), system-ui, sans-serif';
  };

  // Audio player voice speak handler
  const handleToggleAudio = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Text-to-speech audio reader is not supported in this browser.");
      return;
    }

    if (isPlayingAudio) {
      if (nextVerseTimerRef.current) {
        clearTimeout(nextVerseTimerRef.current);
        nextVerseTimerRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setSpeakingVerseNum(null);
      return;
    }

    const verses = chapterData?.verses;
    if (!verses || verses.length === 0) return;

    setIsPlayingAudio(true);
    let index = 0;

    const speakNextVerse = () => {
      if (index >= verses.length) {
        setIsPlayingAudio(false);
        setSpeakingVerseNum(null);
        return;
      }

      const currentVerse = verses[index];
      setSpeakingVerseNum(currentVerse.verse);

      const cleanText = currentVerse.text.trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = audioSpeed; 
      utterance.pitch = 0.95; // Warm, reverent depth pitch

      const voices = window.speechSynthesis.getVoices();
      const chosenVoice = voices.find(v => v.name.includes("UK English Male")) || 
                          voices.find(v => v.lang.toLowerCase() === "en-gb" && v.name.toLowerCase().includes("male")) ||
                          voices.find(v => v.lang.toLowerCase().startsWith("en-gb")) || 
                          voices.find(v => v.lang.startsWith("en")) || 
                          voices[0];
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onend = () => {
        index++;
        if (nextVerseTimerRef.current) {
          clearTimeout(nextVerseTimerRef.current);
        }
        nextVerseTimerRef.current = setTimeout(() => {
          speakNextVerse();
        }, 120); // 120ms brief transition pause between verses
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          console.error("Speech utterance error:", e);
          setIsPlayingAudio(false);
          setSpeakingVerseNum(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextVerse();
  };

  // Stop audio reader if chapter changes or page unmounts
  useEffect(() => {
    const cleanup = () => {
      if (nextVerseTimerRef.current) {
        clearTimeout(nextVerseTimerRef.current);
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    cleanup();
    setIsPlayingAudio(false);
    setSpeakingVerseNum(null);

    return cleanup;
  }, [selectedBook, selectedChapter, selectedTranslation]);

  // Get current book details
  const currentBook = bibleBooks.find(b => b.name === selectedBook) || bibleBooks[0];
  const maxChapters = currentBook.chapters;

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
      const matched = bibleBooks.find(b => {
        const name1 = b.name.toLowerCase().replace(/\s+/g, "");
        const name2 = book.toLowerCase().replace(/\s+/g, "");
        return name1 === name2 || 
               name1 === name2 + "s" || 
               name1 + "s" === name2 ||
               (name1 === "psalms" && name2 === "psalm") ||
               (name1 === "psalm" && name2 === "psalms");
      });
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

  const pageTitle = chapterData && chapterData.reference
    ? `${chapterData.reference} (${selectedTranslation.toUpperCase()}) | PraisePage Bible Reader`
    : `${selectedBook} ${selectedChapter} | PraisePage Bible Reader`;

  const pageDescription = chapterData && chapterData.verses && chapterData.verses.length > 0
    ? `Read ${selectedBook} ${selectedChapter} online. "${chapterData.verses[0].text.substring(0, 150)}..." Explore scriptures of gratitude and faith.`
    : `Read, search, highlight, and write reflections on Holy Scriptures of gratitude and faith.`;

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Mood Selector bar */}
        <div style={{
          backgroundColor: "var(--secondary-background-color)",
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
                  backgroundColor: selectedMood === mood ? "var(--accent-color)" : "rgba(255, 255, 255, 0.05)",
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
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
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
            backgroundColor: "var(--secondary-background-color)", 
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
              onChange={(e) => {
                setSelectedBook(e.target.value);
                setSelectedChapter(1);
              }}
              style={{
                backgroundColor: "var(--primary-background-color)",
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
                backgroundColor: "var(--primary-background-color)",
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
                backgroundColor: "var(--primary-background-color)",
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
        {(() => {
          const themeStyles = getThemeStyles();
          return (
            <div 
              id="scripture-reading-pane"
              style={{ 
                backgroundColor: themeStyles.backgroundColor,
                color: themeStyles.color,
                border: `1px solid ${themeStyles.borderColor}`,
                padding: "4rem 3rem",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                minHeight: "400px",
                position: "relative",
                transition: "all 0.3s ease"
              }}
            >
              {/* Toolbar Controls */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
                backgroundColor: "rgba(0,0,0,0.12)",
                padding: "1.2rem 1.8rem",
                borderRadius: "8px",
                marginBottom: "3rem",
                border: "1px solid var(--transparent-light-color)",
                transition: "all 0.3s ease"
              }}>
                {/* Main Player Row */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  gap: "1rem"
                }}>
                  {/* Left side: Audio player */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "nowrap" }}>
                    <button
                      type="button"
                      onClick={handleToggleAudio}
                      title={isPlayingAudio ? "Pause Audio Reader" : "Play Audio Reader"}
                      style={{
                        backgroundColor: isPlayingAudio ? "rgba(255, 94, 98, 0.15)" : "var(--accent-color)",
                        color: isPlayingAudio ? "#ff5e62" : "#131417",
                        border: isPlayingAudio ? "1px solid rgba(255, 94, 98, 0.3)" : "none",
                        width: "3.6rem",
                        height: "3.6rem",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      {isPlayingAudio ? (
                        <i className="ri-pause-mini-fill" style={{ fontSize: "2rem" }}></i>
                      ) : (
                        <i className="ri-play-mini-fill" style={{ fontSize: "2rem", marginLeft: "2px" }}></i>
                      )}
                    </button>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>Speed:</span>
                      <select
                        value={audioSpeed}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value);
                          setAudioSpeed(rate);
                          if (isPlayingAudio) {
                            window.speechSynthesis.cancel();
                            setTimeout(handleToggleAudio, 100);
                          }
                        }}
                        style={{
                          backgroundColor: "var(--primary-background-color)",
                          color: "var(--light-color)",
                          border: "1px solid var(--transparent-light-color)",
                          borderRadius: "4px",
                          padding: "0.3rem 0.6rem",
                          fontSize: "1.1rem",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        <option value="0.8">0.8x</option>
                        <option value="1">1.0x</option>
                        <option value="1.2">1.2x</option>
                        <option value="1.5">1.5x</option>
                      </select>
                    </div>
                  </div>

                  {/* Right side: Formatting Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    title={showSettings ? "Hide Style Options" : "Show Style Options"}
                    style={{
                      backgroundColor: showSettings ? "rgba(255,255,255,0.06)" : "transparent",
                      color: showSettings ? "var(--accent-color)" : "var(--light-color-alt)",
                      border: "1px solid var(--transparent-light-color)",
                      width: "3.6rem",
                      height: "3.6rem",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    <i className="ri-settings-3-line" style={{ fontSize: "1.8rem" }}></i>
                  </button>
                </div>

                {/* Collapsible Preferences Panel */}
                {showSettings && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "1.5rem",
                    paddingTop: "1.2rem",
                    borderTop: "1px dashed var(--transparent-light-color)",
                    width: "100%",
                    animation: "fadeIn 0.2s ease-out"
                  }}>
                    {/* Font size picker */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "600" }}>Font Size</span>
                      <div style={{ display: "inline-flex", backgroundColor: "var(--primary-background-color)", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--transparent-light-color)", alignSelf: "flex-start" }}>
                        {["small", "medium", "large", "xlarge"].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => changeFontSize(sz)}
                            title={`Font size: ${sz}`}
                            style={{
                              backgroundColor: fontSize === sz ? "rgba(255,255,255,0.08)" : "transparent",
                              color: fontSize === sz ? "var(--accent-color)" : "var(--light-color-alt)",
                              border: "none",
                              padding: "0.5rem 1rem",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              fontWeight: fontSize === sz ? "700" : "500",
                              transition: "all 0.15s"
                            }}
                          >
                            {sz === "small" ? "A-" : sz === "medium" ? "A" : sz === "large" ? "A+" : "A++"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font family picker */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "600" }}>Font Style</span>
                      <div style={{ display: "inline-flex", backgroundColor: "var(--primary-background-color)", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--transparent-light-color)", alignSelf: "flex-start" }}>
                        <button
                          type="button"
                          onClick={() => changeFontFamily("serif")}
                          style={{
                            backgroundColor: fontFamily === "serif" ? "rgba(255,255,255,0.08)" : "transparent",
                            color: fontFamily === "serif" ? "var(--accent-color)" : "var(--light-color-alt)",
                            border: "none",
                            padding: "0.5rem 1.2rem",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Serif
                        </button>
                        <button
                          type="button"
                          onClick={() => changeFontFamily("sans")}
                          style={{
                            backgroundColor: fontFamily === "sans" ? "rgba(255,255,255,0.08)" : "transparent",
                            color: fontFamily === "sans" ? "var(--accent-color)" : "var(--light-color-alt)",
                            border: "none",
                            padding: "0.5rem 1.2rem",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Sans
                        </button>
                      </div>
                    </div>

                    {/* Themes picker */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "600" }}>Reader Theme</span>
                      <div style={{ display: "flex", gap: "0.6rem" }}>
                        {[
                          { id: "default", name: "Default Theme", color: "var(--secondary-background-color)", border: "1px solid var(--transparent-light-color)" },
                          { id: "sepia", name: "Warm Sepia Theme", color: "#f4ecd8", border: "1px solid #e4dcc4" },
                          { id: "light", name: "Soft White Theme", color: "#ffffff", border: "1px solid #e3e4e8" },
                          { id: "dark", name: "Pure Charcoal Theme", color: "#18191c", border: "1px solid #2a2b2f" }
                        ].map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => changeReaderTheme(th.id)}
                            title={th.name}
                            style={{
                              width: "2rem",
                              height: "2rem",
                              borderRadius: "50%",
                              backgroundColor: th.color,
                              border: readerTheme === th.id ? "2px solid var(--accent-color)" : th.border,
                              cursor: "pointer",
                              boxShadow: readerTheme === th.id ? "0 0 8px var(--accent-color)" : "none",
                              transition: "all 0.2s"
                            }}
                          />
                        ))}
                      </div>
                    </div>


                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
                <h2 style={{ fontSize: "2.4rem", color: themeStyles.color }}>
                  {selectedBook} {selectedChapter}
                </h2>
                <span style={{ fontSize: "1.2rem", padding: "0.5rem 1rem", backgroundColor: "var(--transparent-light-color)", borderRadius: "20px", textTransform: "uppercase", fontWeight: "600" }}>
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
                    type="button"
                    onClick={() => setUpdateTrigger(prev => prev + 1)}
                    style={{ marginTop: "2rem", padding: "0.8rem 2rem", backgroundColor: "var(--light-color)", color: "var(--primary-background-color)", borderRadius: "30px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Retry
                  </button>
                </div>
              ) : chapterData && chapterData.verses ? (
                <div 
                  style={{ 
                    fontSize: getFontSizeStyle(), 
                    lineHeight: "2", 
                    color: themeStyles.color, 
                    fontFamily: getFontFamilyStyle(),
                    textAlign: "justify",
                    transition: "all 0.3s ease"
                  }}
                >
                  {chapterData.verses.map((v) => {
                    const verseId = `${v.book_name}_${v.chapter}_${v.verse}`;
                    const highlightColor = highlights[verseId] || "";
                    const isSpeaking = isPlayingAudio && speakingVerseNum === v.verse;
                    
                    return (
                      <span 
                        key={v.verse} 
                        className={`highlight-text-interactive ${highlightColor}`}
                        onClick={() => setActiveVerse({
                          id: verseId,
                          text: v.text.trim(),
                          tag: `${v.book_name} ${v.chapter}:${v.verse} ${selectedTranslation.toUpperCase()}`
                        })}
                        style={{ 
                          display: "inline", 
                          paddingRight: "4px",
                          backgroundColor: isSpeaking ? "rgba(250, 214, 72, 0.25)" : undefined,
                          borderRadius: isSpeaking ? "4px" : undefined,
                          transition: "background-color 0.3s ease",
                          borderBottom: isSpeaking ? "2px solid var(--accent-color)" : undefined
                        }}
                      >
                        <sup 
                          style={{ 
                            fontSize: "1rem", 
                            fontWeight: "600",
                            color: isSpeaking ? "var(--accent-color)" : themeStyles.verseNumColor, 
                            marginRight: "4px",
                            userSelect: "none",
                            transition: "color 0.3s"
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
                  type="button"
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
                  type="button"
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
          );
        })()}

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
