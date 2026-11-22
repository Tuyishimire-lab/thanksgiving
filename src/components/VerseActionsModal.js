"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  toggleHighlight as toggleHighlightLocal,
  saveNote as saveNoteLocal,
  getHighlights as getHighlightsLocal,
  getNotes as getNotesLocal,
} from "@/data/userState";
import { getMe } from "@/app/actions/authActions";
import {
  toggleHighlight as toggleHighlightDb,
  saveNote as saveNoteDb,
  getNotebookData,
} from "@/app/actions/dbActions";
import VerseImageCreator from "./VerseImageCreator";

const HIGHLIGHT_COLORS = [
  { name: "Gold", class: "highlight-yellow", hex: "#ffe066" },
  { name: "Sage", class: "highlight-green", hex: "#a9e34b" },
  { name: "Sky", class: "highlight-blue", hex: "#74c0fc" },
  { name: "Rose", class: "highlight-pink", hex: "#faa2c1" },
];

const compareCache = new Map();

function normalizeNoteValue(noteProp) {
  if (typeof noteProp === "string") return noteProp;
  if (noteProp && typeof noteProp === "object" && typeof noteProp.text === "string") {
    return noteProp.text;
  }
  return "";
}

function formatVerseLabel(id) {
  if (!id || typeof id !== "string") return "";
  const parts = id.split("_");
  if (parts.length >= 3) {
    const book = parts.slice(0, parts.length - 2).join(" ");
    const chapter = parts[parts.length - 2];
    const verse = parts[parts.length - 1];
    return `${book} ${chapter}:${verse}`;
  }
  return id.replace(/_/g, " ");
}

export default function VerseActionsModal({
  verseText,
  verseTag,
  verseId,
  user: userProp,
  initialHighlight,
  initialNote,
  selectedVerses,
  compareMeta,
  onListenFromHere,
  onClose,
  onStateChange,
}) {
  const hasPreloadedProps =
    userProp !== undefined &&
    initialHighlight !== undefined &&
    initialNote !== undefined;
  const normalizedInitialNote = normalizeNoteValue(initialNote);

  const [prevVerseId, setPrevVerseId] = useState(verseId);
  const [activeHighlight, setActiveHighlight] = useState(() =>
    hasPreloadedProps ? initialHighlight || null : null
  );
  const [noteText, setNoteText] = useState(() =>
    hasPreloadedProps ? normalizedInitialNote : ""
  );
  const [originalNoteText, setOriginalNoteText] = useState(() =>
    hasPreloadedProps ? normalizedInitialNote : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showImageCreator, setShowImageCreator] = useState(false);
  const [loadedUser, setLoadedUser] = useState(null);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [showCompare, setShowCompare] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [compareData, setCompareData] = useState(null);

  const saveTimerRef = useRef(null);
  const copyTimerRef = useRef(null);
  const activeCompareFetchRef = useRef("");

  if (prevVerseId !== verseId) {
    setPrevVerseId(verseId);
    setShowImageCreator(false);
    setSaveSuccess(false);
    setSaveError("");
    setCopyStatus("idle");
    setShowCompare(false);
    setCompareLoading(false);
    setCompareError("");
    setCompareData(null);
    if (hasPreloadedProps) {
      setActiveHighlight(initialHighlight || null);
      setNoteText(normalizedInitialNote);
      setOriginalNoteText(normalizedInitialNote);
    }
  }

  const effectiveUser = hasPreloadedProps ? userProp : loadedUser;

  const isMultiVerse = Array.isArray(selectedVerses) && selectedVerses.length > 1;
  const targetVerseIds = (() => {
    if (!isMultiVerse) return verseId ? [verseId] : [];
    const ids = selectedVerses
      .map((item) => (typeof item === "string" ? item : item?.id || item?.verseId))
      .filter(Boolean);
    return ids.length > 0 ? ids : verseId ? [verseId] : [];
  })();

  const combinedFromSelection = isMultiVerse
    ? selectedVerses
        .map((item) =>
          typeof item === "object" && item ? item.text || item.verseText || "" : ""
        )
        .map((t) => t.trim())
        .filter(Boolean)
        .join(" ")
    : "";

  const displayText =
    verseText &&
    (!isMultiVerse ||
      !combinedFromSelection ||
      verseText.length >= combinedFromSelection.length)
      ? verseText
      : combinedFromSelection || verseText || "";

  const displayTag = verseTag || formatVerseLabel(verseId);

  const canCompare = Boolean(
    compareMeta && compareMeta.book && compareMeta.chapter && compareMeta.verse
  );
  const compareCacheKey = canCompare
    ? `${compareMeta.book}|${compareMeta.chapter}|${compareMeta.verse}|${compareMeta.endVerse || ""}`
    : "";

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const saveTimer = saveTimerRef;
    const copyTimer = copyTimerRef;
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      activeCompareFetchRef.current = "";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (hasPreloadedProps) return;
    let cancelled = false;

    async function loadState() {
      const currentUser = await getMe();
      if (cancelled) return;
      setLoadedUser(currentUser);

      if (currentUser) {
        // Load existing highlight and note for this specific verse from DB
        const notebook = await getNotebookData();
        if (cancelled) return;
        const dbHighlights = notebook.highlights || {};
        const dbNotes = notebook.notes || {};

        setActiveHighlight(dbHighlights[verseId] || null);
        const loadedText = dbNotes[verseId]?.text || "";
        setNoteText(loadedText);
        setOriginalNoteText(loadedText);
      } else {
        // Load existing highlight and note for this specific verse from local storage
        const highlights = getHighlightsLocal();
        const notes = getNotesLocal();

        setActiveHighlight(highlights[verseId] || null);
        const loadedText = notes[verseId]?.text || "";
        setNoteText(loadedText);
        setOriginalNoteText(loadedText);
      }
    }
    loadState();

    return () => {
      cancelled = true;
    };
  }, [verseId, hasPreloadedProps]);

  const applyHighlightBatch = async (targetColor) => {
    if (effectiveUser) {
      await Promise.all(
        targetVerseIds.map(async (id) => {
          const res = await toggleHighlightDb(id, targetColor);
          if (targetColor && res && res.color === null && !res.error) {
            await toggleHighlightDb(id, targetColor);
          }
        })
      );
      return targetColor;
    }

    const currentHighlights = getHighlightsLocal();
    for (const id of targetVerseIds) {
      if (targetColor) {
        if (currentHighlights[id] !== targetColor) {
          toggleHighlightLocal(id, targetColor);
        }
      } else if (currentHighlights[id]) {
        toggleHighlightLocal(id, null);
      }
    }
    return targetColor;
  };

  const handleColorClick = async (colorClass) => {
    let nextColor = null;
    if (isMultiVerse) {
      const targetColor = activeHighlight === colorClass ? null : colorClass;
      nextColor = await applyHighlightBatch(targetColor);
      setActiveHighlight(nextColor);
    } else if (effectiveUser) {
      const res = await toggleHighlightDb(verseId, colorClass);
      if (res?.error) return;
      nextColor = res.color || null;
      setActiveHighlight(nextColor);
    } else {
      const newHighlights = toggleHighlightLocal(verseId, colorClass);
      nextColor = newHighlights[verseId] || null;
      setActiveHighlight(nextColor);
    }
    if (onStateChange) {
      onStateChange({ verseId, verseIds: targetVerseIds, highlight: nextColor });
    }
  };

  const handleNoteChange = (e) => {
    setNoteText(e.target.value);
    if (saveError) setSaveError("");
  };

  const handleSaveNote = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      if (effectiveUser) {
        const res = await saveNoteDb(verseId, noteText);
        if (res?.error) {
          setSaveError(res.error);
          return;
        }
      } else {
        saveNoteLocal(verseId, noteText);
      }
      setOriginalNoteText(noteText);
      setSaveSuccess(true);
      if (onStateChange) {
        onStateChange({ verseId, note: noteText.trim() });
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const clearHighlight = async () => {
    if (isMultiVerse) {
      await applyHighlightBatch(null);
      setActiveHighlight(null);
    } else if (effectiveUser) {
      const res = await toggleHighlightDb(verseId, null);
      if (res?.error) return;
      setActiveHighlight(null);
    } else {
      toggleHighlightLocal(verseId, null);
      setActiveHighlight(null);
    }
    if (onStateChange) {
      onStateChange({ verseId, verseIds: targetVerseIds, highlight: null });
    }
  };

  const loadComparison = async (forceRefresh = false) => {
    if (!canCompare) return;
    if (!forceRefresh && compareCache.has(compareCacheKey)) {
      setCompareData(compareCache.get(compareCacheKey));
      setCompareError("");
      setCompareLoading(false);
      return;
    }

    activeCompareFetchRef.current = compareCacheKey;
    setCompareLoading(true);
    setCompareError("");

    try {
      const params = new URLSearchParams({
        book: compareMeta.book,
        chapter: String(compareMeta.chapter),
        verse: String(compareMeta.verse),
        compare: "true",
      });
      if (compareMeta.endVerse) {
        params.set("endVerse", String(compareMeta.endVerse));
      }

      const res = await fetch(`/api/bible?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.comparisons)) {
        throw new Error("Invalid comparison payload");
      }
      compareCache.set(compareCacheKey, data);
      if (activeCompareFetchRef.current === compareCacheKey) {
        setCompareData(data);
      }
    } catch {
      if (activeCompareFetchRef.current === compareCacheKey) {
        setCompareError("Could not load translations. Please try again.");
      }
    } finally {
      if (activeCompareFetchRef.current === compareCacheKey) {
        setCompareLoading(false);
      }
    }
  };

  const handleToggleCompare = () => {
    if (showCompare) {
      setShowCompare(false);
      return;
    }
    setShowCompare(true);
    loadComparison(false);
  };

  const handleCopyText = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(`"${displayText}" - ${displayTag}`);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyStatus("idle"), 2500);
  };

  if (typeof document === "undefined") return null;

  const modalContent = (
    <div
      className="study-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={showImageCreator ? "Create Visual Card" : `Scripture Study: ${displayTag}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`study-modal-dialog${showImageCreator ? " wide" : ""}`}>
        {/* Sticky Header */}
        <div className="study-modal-header">
          {!showImageCreator ? (
            <div className="study-modal-title-group">
              <span className="study-modal-eyebrow">
                {isMultiVerse
                  ? `Passage Study • ${targetVerseIds.length} verses`
                  : "Scripture Study"}
              </span>
              <h3 className="study-modal-title">{displayTag}</h3>
            </div>
          ) : (
            <div
              className="study-modal-title-group"
              style={{ flexDirection: "row", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
            >
              <button
                type="button"
                className="study-btn-icon"
                onClick={() => setShowImageCreator(false)}
              >
                <i className="ri-arrow-left-line" aria-hidden="true"></i>
                Back to Study
              </button>
              <h3 className="study-modal-title">Create Visual Card</h3>
            </div>
          )}

          <button
            type="button"
            className="study-modal-close"
            onClick={onClose}
            aria-label="Close study drawer"
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        {!showImageCreator ? (
          <>
            {/* Scrollable Body */}
            <div className="study-modal-body">
              {/* Verse Preview Card */}
              <div className={`study-verse-card${activeHighlight ? ` ${activeHighlight}` : ""}`}>
                <p className="study-verse-quote">&ldquo;{displayText}&rdquo;</p>
                <span className="study-verse-ref">&mdash; {displayTag}</span>
              </div>

              {/* Collapsible Translation Compare */}
              {canCompare && (
                <div className="study-compare-box">
                  <button
                    type="button"
                    className="study-compare-toggle"
                    onClick={handleToggleCompare}
                    aria-expanded={showCompare}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.7rem" }}>
                      <i className="ri-translate-2" aria-hidden="true"></i>
                      Compare Translations
                    </span>
                    <i
                      className={showCompare ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"}
                      aria-hidden="true"
                    ></i>
                  </button>

                  {showCompare && (
                    <div className="study-compare-list">
                      {compareLoading && (
                        <span className="study-compare-text">
                          Loading WEB, KJV, and ASV translations...
                        </span>
                      )}

                      {!compareLoading && compareError && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                          <span className="study-status-err">{compareError}</span>
                          <button
                            type="button"
                            className="study-btn-icon"
                            onClick={() => loadComparison(true)}
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {!compareLoading &&
                        !compareError &&
                        compareData?.comparisons?.map((item) => {
                          const isCurrent =
                            compareMeta.currentTranslation &&
                            item.id.toLowerCase() === String(compareMeta.currentTranslation).toLowerCase();
                          return (
                            <div
                              key={item.id}
                              className={`study-compare-item${isCurrent ? " current" : ""}`}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.45rem" }}>
                                <span className="study-compare-badge">{item.short}</span>
                                <span style={{ fontSize: "1.15rem", color: "var(--modal-muted, var(--light-color-alt))" }}>
                                  {item.name}
                                </span>
                                {isCurrent && (
                                  <span className="study-compare-current-pill">Current</span>
                                )}
                              </div>
                              <p className="study-compare-text">{item.text || "Unavailable"}</p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Highlight Section */}
              <div className="study-section">
                <span className="study-label">
                  {isMultiVerse ? "HIGHLIGHT PASSAGE" : "HIGHLIGHT VERSE"}
                </span>
                <div className="study-palette-row">
                  {HIGHLIGHT_COLORS.map((color) => {
                    const isSelected = activeHighlight === color.class;
                    return (
                      <button
                        key={color.class}
                        type="button"
                        onClick={() => handleColorClick(color.class)}
                        className={`study-swatch${isSelected ? " active" : ""}`}
                        style={{ background: color.hex }}
                        title={`Highlight in ${color.name}`}
                        aria-label={`Highlight in ${color.name}`}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <i className="ri-check-line" aria-hidden="true" />}
                      </button>
                    );
                  })}

                  {activeHighlight && (
                    <button
                      type="button"
                      onClick={clearHighlight}
                      className="study-clear-btn"
                    >
                      <i className="ri-delete-bin-line" aria-hidden="true"></i>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Reflections / Notes Section */}
              <div className="study-section">
                <label htmlFor="verse-note" className="study-label">
                  MY REFLECTIONS / NOTE
                </label>
                {isMultiVerse && (
                  <span className="study-note-hint">
                    Saved reflection will be attached to {formatVerseLabel(verseId)}.
                  </span>
                )}
                <textarea
                  id="verse-note"
                  value={noteText}
                  onChange={handleNoteChange}
                  placeholder="Write down what this verse means to you..."
                  rows={4}
                  className="study-textarea"
                />

                <div className="study-note-bar">
                  <div>
                    {saveSuccess && (
                      <span className="study-status-ok" role="status">
                        <i className="ri-checkbox-circle-line" aria-hidden="true"></i>
                        Reflections saved successfully!
                      </span>
                    )}
                    {!saveSuccess && saveError && (
                      <span className="study-status-err" role="alert">
                        {saveError}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={isSaving || noteText === originalNoteText}
                    className={`study-save-btn${noteText !== originalNoteText ? " ready" : ""}`}
                  >
                    <i className="ri-save-line" aria-hidden="true"></i>
                    {isSaving ? "Saving..." : "Save Reflections"}
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="study-modal-footer">
              <button
                type="button"
                onClick={() => setShowImageCreator(true)}
                className="study-btn-primary"
              >
                <i className="ri-image-line" aria-hidden="true"></i>
                Create Visual Card
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="study-btn-secondary"
              >
                <i
                  className={
                    copyStatus === "copied"
                      ? "ri-check-line"
                      : copyStatus === "error"
                        ? "ri-error-warning-line"
                        : "ri-file-copy-line"
                  }
                  aria-hidden="true"
                ></i>
                {copyStatus === "copied"
                  ? "Copied!"
                  : copyStatus === "error"
                    ? "Copy failed"
                    : "Copy Text"}
              </button>

              {onListenFromHere && (
                <button
                  type="button"
                  onClick={() => {
                    onListenFromHere();
                    onClose();
                  }}
                  className="study-btn-secondary"
                >
                  <i className="ri-volume-up-line" aria-hidden="true"></i>
                  Listen from here
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="study-creator-wrap">
            <VerseImageCreator
              embedded
              verseText={displayText}
              verseTag={displayTag}
              onClose={() => setShowImageCreator(false)}
            />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
