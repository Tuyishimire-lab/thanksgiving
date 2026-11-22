"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { bibleBooks } from "@/data/bibleBooks";
import { getBookByName, parseBibleReference } from "@/data/bibleParser";

export default function BookChapterPicker({
  currentBook,
  currentChapter,
  onSelect,
  onClose,
}) {
  const initialBookMeta = bibleBooks.find((b) => b.name === currentBook) || bibleBooks[0];
  const [filterText, setFilterText] = useState("");
  const [activeTestament, setActiveTestament] = useState(initialBookMeta.testament);
  const [browsingBook, setBrowsingBook] = useState(initialBookMeta.name);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  const trimmedFilter = filterText.trim();
  const parsedQuickRef = trimmedFilter ? parseBibleReference(trimmedFilter) : null;
  const aliasMatch = trimmedFilter ? getBookByName(trimmedFilter) : null;

  const filteredBooks = trimmedFilter
    ? bibleBooks.filter(
        (b) =>
          b.name.toLowerCase().includes(trimmedFilter.toLowerCase()) ||
          b.name === aliasMatch?.name ||
          b.name === parsedQuickRef?.book
      )
    : bibleBooks.filter((b) => b.testament === activeTestament);

  const activeBookMeta =
    bibleBooks.find((b) => b.name === browsingBook) ||
    filteredBooks[0] ||
    initialBookMeta;

  const handleQuickJumpSubmit = (e) => {
    e.preventDefault();
    if (parsedQuickRef) {
      onSelect({
        book: parsedQuickRef.book,
        chapter: parsedQuickRef.chapter,
        verse: parsedQuickRef.verse ?? null,
      });
      onClose();
      return;
    }
    if (filteredBooks.length === 1) {
      const onlyBook = filteredBooks[0];
      setBrowsingBook(onlyBook.name);
      setActiveTestament(onlyBook.testament);
    }
  };

  return createPortal(
    <div
      className="bible-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Select Bible Book and Chapter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bible-picker-dialog">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <span className="sanc-eyebrow" style={{ marginBottom: "0.25rem" }}>
              Scripture Navigator
            </span>
            <h3
              className="sanc-section-title"
              style={{
                fontFamily: "var(--font-family-serif), Georgia, serif",
                margin: 0,
              }}
            >
              Choose Passage
            </h3>
          </div>
          <button
            type="button"
            className="sanc-modal-close"
            onClick={onClose}
            aria-label="Close passage picker"
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        {/* Quick-jump & live book filter */}
        <form
          onSubmit={handleQuickJumpSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          <div className="sanc-input-wrap">
            <i className="ri-search-line sanc-input-icon" aria-hidden="true"></i>
            <input
              type="text"
              className="sanc-input has-icon"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Quick jump (e.g. Ps 23:4, Rom 8) or filter books..."
              autoFocus
              aria-label="Quick jump or filter Bible books"
            />
          </div>
          {parsedQuickRef && (
            <button
              type="submit"
              className="sanc-pill active"
              style={{ alignSelf: "flex-start" }}
            >
              <i className="ri-arrow-right-circle-line" aria-hidden="true"></i>
              Jump to {parsedQuickRef.book} {parsedQuickRef.chapter}
              {parsedQuickRef.verse ? `:${parsedQuickRef.verse}` : ""}
            </button>
          )}
        </form>

        {/* Old / New Testament Tabs */}
        <div className="bible-picker-tabs sanc-tab-bar" role="tablist" aria-label="Testament">
          {["Old", "New"].map((testament) => {
            const isActive = !trimmedFilter && activeTestament === testament;
            return (
              <button
                key={testament}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`bible-picker-cell sanc-tab-btn${isActive ? " active" : ""}`}
                onClick={() => {
                  setFilterText("");
                  setActiveTestament(testament);
                  const currentInTab = bibleBooks.find(
                    (b) => b.name === browsingBook && b.testament === testament
                  );
                  if (!currentInTab) {
                    const firstInTab = bibleBooks.find((b) => b.testament === testament);
                    if (firstInTab) setBrowsingBook(firstInTab.name);
                  }
                }}
                style={{ flex: 1 }}
              >
                {testament === "Old" ? "Old Testament" : "New Testament"}
              </button>
            );
          })}
        </div>

        {/* Books Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <span className="sanc-eyebrow" style={{ marginBottom: 0 }}>
            Books {trimmedFilter ? `(${filteredBooks.length})` : ""}
          </span>
          {filteredBooks.length > 0 ? (
            <div className="bible-picker-books">
              {filteredBooks.map((book) => {
                const isSelected = activeBookMeta.name === book.name;
                return (
                  <button
                    key={book.name}
                    type="button"
                    className={`bible-picker-cell ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setBrowsingBook(book.name);
                      setActiveTestament(book.testament);
                    }}
                    title={book.name}
                  >
                    {book.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="sanc-subtitle" style={{ fontSize: "1.35rem", fontStyle: "italic" }}>
              No matching books. Try abbreviations like &ldquo;Ps 23:4&rdquo; or &ldquo;Rom 8&rdquo;.
            </p>
          )}
        </div>

        {/* Chapters Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <span className="sanc-eyebrow" style={{ marginBottom: 0 }}>
            {activeBookMeta.name} Chapters
          </span>
          <div className="bible-picker-chapters">
            {Array.from({ length: activeBookMeta.chapters }, (_, i) => i + 1).map((chap) => {
              const isCurrent =
                activeBookMeta.name === currentBook && chap === currentChapter;
              return (
                <button
                  key={chap}
                  type="button"
                  className={`bible-picker-cell ${isCurrent ? "active" : ""}`}
                  onClick={() => {
                    onSelect({
                      book: activeBookMeta.name,
                      chapter: chap,
                      verse: null,
                    });
                    onClose();
                  }}
                >
                  {chap}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
