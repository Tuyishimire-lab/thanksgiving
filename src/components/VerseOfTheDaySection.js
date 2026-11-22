"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseBibleReference } from "@/data/bibleParser";
import VerseActionsModal from "@/components/VerseActionsModal";

const HIGHLIGHTS_KEY = "praisepage_highlights";
const HIGHLIGHTS_EVENT = "praisepage-highlights-change";
const EMPTY_HIGHLIGHTS = {};

let cachedHighlightsRaw = null;
let cachedHighlightsObj = EMPTY_HIGHLIGHTS;

function subscribeHighlights(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(HIGHLIGHTS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(HIGHLIGHTS_EVENT, callback);
  };
}

function getHighlightsServerSnapshot() {
  return EMPTY_HIGHLIGHTS;
}

function getHighlightsSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem(HIGHLIGHTS_KEY);
  } catch {
    return EMPTY_HIGHLIGHTS;
  }

  if (raw === cachedHighlightsRaw) {
    return cachedHighlightsObj;
  }

  if (!raw) {
    cachedHighlightsRaw = raw;
    cachedHighlightsObj = EMPTY_HIGHLIGHTS;
    return cachedHighlightsObj;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedHighlightsRaw = raw;
    cachedHighlightsObj = parsed && typeof parsed === "object" ? parsed : EMPTY_HIGHLIGHTS;
  } catch {
    cachedHighlightsRaw = raw;
    cachedHighlightsObj = EMPTY_HIGHLIGHTS;
  }
  return cachedHighlightsObj;
}

export default function VerseOfTheDaySection({ verseOfTheDay, dayOfWeek, initialHighlights, currentUser }) {
  const router = useRouter();
  const [activeVerse, setActiveVerse] = useState(null);
  const [dbHighlightOverride, setDbHighlightOverride] = useState(null);

  const localHighlights = useSyncExternalStore(
    subscribeHighlights,
    getHighlightsSnapshot,
    getHighlightsServerSnapshot
  );

  const handleStateChange = (info) => {
    if (!currentUser) {
      window.dispatchEvent(new Event(HIGHLIGHTS_EVENT));
    } else {
      if (info && "highlight" in info) {
        setDbHighlightOverride({
          userId: currentUser.id ?? null,
          verseId: info.verseId,
          value: info.highlight,
        });
      }
      router.refresh();
    }
  };

  const hasMatchingOverride =
    currentUser &&
    dbHighlightOverride &&
    dbHighlightOverride.userId === (currentUser.id ?? null) &&
    dbHighlightOverride.verseId === verseOfTheDay.id;

  const highlightClass = currentUser
    ? (hasMatchingOverride
        ? (dbHighlightOverride.value || "")
        : (initialHighlights?.[verseOfTheDay.id] || ""))
    : (localHighlights[verseOfTheDay.id] || "");

  const parsedRef = parseBibleReference(verseOfTheDay?.tag);
  const compareMeta = parsedRef?.verse
    ? {
        book: parsedRef.book,
        chapter: parsedRef.chapter,
        verse: parsedRef.verse,
        endVerse: parsedRef.endVerse,
      }
    : undefined;

  const openStudyModal = () => {
    setActiveVerse({
      id: verseOfTheDay.id,
      text: verseOfTheDay.verse,
      tag: verseOfTheDay.tag,
    });
  };

  return (
    <>
      <div
        className={`home-votd-card${highlightClass ? ` ${highlightClass}` : ""}`}
        onClick={openStudyModal}
      >
        <div className="home-votd-top">
          <span className="home-votd-badge">
            Verse of the Day &bull; {dayOfWeek}
          </span>
          <i className="ri-double-quotes-r" aria-hidden="true"></i>
        </div>

        <blockquote className="home-votd-quote">
          &ldquo;{verseOfTheDay.verse}&rdquo;
        </blockquote>

        <div className="home-votd-footer">
          <span className="home-votd-ref">&mdash; {verseOfTheDay.tag}</span>
          <div className="home-votd-actions">
            <button
              type="button"
              className="home-votd-chip"
              onClick={(e) => {
                e.stopPropagation();
                openStudyModal();
              }}
            >
              <i className="ri-sparkling-line" aria-hidden="true"></i>
              Reflect &amp; Highlight
            </button>
            <Link
              href={"/bible?q=" + encodeURIComponent(verseOfTheDay.tag)}
              className="home-votd-chip"
              onClick={(e) => e.stopPropagation()}
            >
              Read in Bible &rarr;
            </Link>
          </div>
        </div>
      </div>

      {activeVerse && (
        <VerseActionsModal
          verseText={activeVerse.text}
          verseTag={activeVerse.tag}
          verseId={activeVerse.id}
          compareMeta={compareMeta}
          onClose={() => setActiveVerse(null)}
          onStateChange={handleStateChange}
        />
      )}
    </>
  );
}
