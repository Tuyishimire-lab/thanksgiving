"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TRANSLATIONS,
  parseBibleReference,
  getNeighborChapter
} from "@/data/bibleParser";
import {
  toggleHighlight as toggleHighlightLocal,
  getHighlights as getHighlightsLocal,
  getNotes as getNotesLocal
} from "@/data/userState";
import { toggleHighlight as toggleHighlightDb } from "@/app/actions/dbActions";
import VerseActionsModal from "@/components/VerseActionsModal";
import BookChapterPicker from "./BookChapterPicker";

const CHAPTER_CACHE_MAX = 50;
const chapterCache = new Map();

const OFFLINE_CACHE_KEY = "praisepage_bible_cache_v1";
const OFFLINE_CACHE_MAX = 15;
const LAST_POS_KEY = "praisepage_last_bible_pos";

const READER_PREFS_EVENT = "praisepage-reader-prefs";
const NOTEBOOK_UPDATED_EVENT = "praisepage-notebook-updated";
const LAST_POS_EVENT = "praisepage-last-bible-pos";

const EMPTY_OBJ = {};

function getCacheKey(book, chapter, translation) {
  return `${book}|${chapter}|${translation}`;
}

function setCachedChapter(key, data) {
  if (chapterCache.has(key)) {
    chapterCache.delete(key);
  } else if (chapterCache.size >= CHAPTER_CACHE_MAX) {
    const oldestKey = chapterCache.keys().next().value;
    if (oldestKey !== undefined) {
      chapterCache.delete(oldestKey);
    }
  }
  chapterCache.set(key, data);
}

function readOfflineEntries() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflineChapter(key, data) {
  if (typeof window === "undefined") return;
  try {
    const entries = readOfflineEntries().filter(([k]) => k !== key);
    entries.push([key, data]);
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(entries.slice(-OFFLINE_CACHE_MAX)));
  } catch {
    // Ignore storage quota errors in restricted contexts
  }
}

function getOfflineChapter(key) {
  const entries = readOfflineEntries();
  const hit = entries.find(([k]) => k === key);
  return hit ? hit[1] : null;
}

function subscribeReaderPrefs(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(READER_PREFS_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(READER_PREFS_EVENT, handler);
  };
}

function useLocalStoragePref(key, fallback) {
  return useSyncExternalStore(
    subscribeReaderPrefs,
    () => {
      if (typeof window === "undefined") return fallback;
      try {
        return localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );
}

function subscribeNotebook(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(NOTEBOOK_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(NOTEBOOK_UPDATED_EVENT, handler);
  };
}

let cachedGuestHighlightsRaw = null;
let cachedGuestHighlightsObj = EMPTY_OBJ;
function getGuestHighlightsSnapshot() {
  if (typeof window === "undefined") return EMPTY_OBJ;
  try {
    const raw = localStorage.getItem("praisepage_highlights");
    if (!raw) return EMPTY_OBJ;
    if (raw === cachedGuestHighlightsRaw) return cachedGuestHighlightsObj;
    const parsed = JSON.parse(raw);
    cachedGuestHighlightsRaw = raw;
    cachedGuestHighlightsObj =
      parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : EMPTY_OBJ;
    return cachedGuestHighlightsObj;
  } catch {
    return EMPTY_OBJ;
  }
}

let cachedGuestNotesRaw = null;
let cachedGuestNotesObj = EMPTY_OBJ;
function getGuestNotesSnapshot() {
  if (typeof window === "undefined") return EMPTY_OBJ;
  try {
    const raw = localStorage.getItem("praisepage_notes");
    if (!raw) return EMPTY_OBJ;
    if (raw === cachedGuestNotesRaw) return cachedGuestNotesObj;
    const parsed = JSON.parse(raw);
    cachedGuestNotesRaw = raw;
    cachedGuestNotesObj =
      parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : EMPTY_OBJ;
    return cachedGuestNotesObj;
  } catch {
    return EMPTY_OBJ;
  }
}

function subscribeLastPos(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(LAST_POS_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LAST_POS_EVENT, handler);
  };
}

let cachedLastPosRaw = null;
let cachedLastPosObj = null;
function getLastPosSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_POS_KEY);
    if (!raw) return null;
    if (raw === cachedLastPosRaw) return cachedLastPosObj;
    const parsed = JSON.parse(raw);
    cachedLastPosRaw = raw;
    cachedLastPosObj =
      parsed && typeof parsed.book === "string" && Number.isInteger(parsed.chapter)
        ? parsed
        : null;
    return cachedLastPosObj;
  } catch {
    return null;
  }
}

function saveLastPos(book, chapter, translation) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_POS_KEY, JSON.stringify({ book, chapter, translation }));
    window.dispatchEvent(new Event(LAST_POS_EVENT));
  } catch {
    // Ignore storage errors
  }
}

function formatVerseSelectionTag(book, chapter, verseNums, translation) {
  if (!verseNums || verseNums.length === 0) return "";
  const sorted = [...verseNums].sort((a, b) => a - b);
  const isContiguous = sorted.every((num, idx) => idx === 0 || num === sorted[idx - 1] + 1);
  const versePart =
    sorted.length === 1
      ? String(sorted[0])
      : isContiguous
        ? `${sorted[0]}-${sorted[sorted.length - 1]}`
        : sorted.join(", ");
  return `${book} ${chapter}:${versePart} ${translation.toUpperCase()}`;
}

function renderHighlightedText(text, searchTerm) {
  if (!searchTerm) return text;
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark key={idx} className="bible-match-mark">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const DEFAULT_TARGET = {
  book: "John",
  chapter: 3,
  verse: null,
  translation: "web",
  hasExplicitTarget: false
};

export default function BibleReaderClient({
  initialTarget = DEFAULT_TARGET,
  initialChapterData = null,
  initialUser = null,
  initialHighlights = EMPTY_OBJ,
  initialNotes = EMPTY_OBJ,
  moodVerses = []
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKey = getCacheKey(
    initialTarget.book,
    initialTarget.chapter,
    initialTarget.translation
  );

  const initialTargetKey = `${initialTarget.book}|${initialTarget.chapter}|${initialTarget.verse ?? ""}|${initialTarget.translation}|${Boolean(initialTarget.hasExplicitTarget)}`;
  const [prevInitialTargetKey, setPrevInitialTargetKey] = useState(initialTargetKey);

  const [selectedBook, setSelectedBook] = useState(initialTarget.book);
  const [selectedChapter, setSelectedChapter] = useState(initialTarget.chapter);
  const [selectedTranslation, setSelectedTranslation] = useState(initialTarget.translation);
  const [targetVerse, setTargetVerse] = useState(initialTarget.verse ?? null);
  const [pulsingVerse, setPulsingVerse] = useState(initialTarget.verse ?? null);
  const [hasNavigated, setHasNavigated] = useState(Boolean(initialTarget.hasExplicitTarget));
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const [loading, setLoading] = useState(!initialChapterData);
  const [error, setError] = useState(null);
  const [chapterData, setChapterData] = useState(initialChapterData);
  const [retryCount, setRetryCount] = useState(0);

  // Picker, search, mood, and settings UI
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [quickQuery, setQuickQuery] = useState("");

  // Study modal & multi-verse selection
  const [activeModal, setActiveModal] = useState(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVerseNums, setSelectedVerseNums] = useState([]);
  const [multiCopyStatus, setMultiCopyStatus] = useState("idle");

  // Optimistic DB state (logged-in) and SSR-safe localStorage store (guest)
  const [dbHighlights, setDbHighlights] = useState(initialHighlights);
  const [dbNotes, setDbNotes] = useState(initialNotes);
  const guestHighlights = useSyncExternalStore(
    subscribeNotebook,
    getGuestHighlightsSnapshot,
    () => EMPTY_OBJ
  );
  const guestNotes = useSyncExternalStore(
    subscribeNotebook,
    getGuestNotesSnapshot,
    () => EMPTY_OBJ
  );
  const highlights = initialUser ? dbHighlights : guestHighlights;
  const notes = initialUser ? dbNotes : guestNotes;

  const savedReadingPos = useSyncExternalStore(
    subscribeLastPos,
    getLastPosSnapshot,
    () => null
  );

  // Persisted reader preferences (SSR-safe)
  const fontSize = useLocalStoragePref("bible_font_size", "medium");
  const fontFamily = useLocalStoragePref("bible_font_family", "serif");
  const readerTheme = useLocalStoragePref("bible_reader_theme", "default");
  const layoutMode = useLocalStoragePref("bible_layout_mode", "paragraph");
  const audioAutoAdvance = useLocalStoragePref("bible_audio_autoadvance", "false") === "true";

  // Audio text-to-speech state & refs
  const [audioState, setAudioState] = useState("idle"); // "idle" | "playing" | "paused"
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [speakingVerseNum, setSpeakingVerseNum] = useState(null);

  // Sync external URL-param navigations (e.g. Header search or <Link href="/bible?book=..."> while mounted)
  if (initialTargetKey !== prevInitialTargetKey) {
    setPrevInitialTargetKey(initialTargetKey);
    const differs =
      initialTarget.book !== selectedBook ||
      initialTarget.chapter !== selectedChapter ||
      (initialTarget.verse ?? null) !== targetVerse ||
      initialTarget.translation !== selectedTranslation;
    if (initialTarget.hasExplicitTarget && differs) {
      setSelectedBook(initialTarget.book);
      setSelectedChapter(initialTarget.chapter);
      setSelectedTranslation(initialTarget.translation);
      setTargetVerse(initialTarget.verse ?? null);
      setPulsingVerse(initialTarget.verse ?? null);
      setHasNavigated(true);
      setAudioState("idle");
      setSpeakingVerseNum(null);
      setSelectedVerseNums([]);
      setMultiCopyStatus("idle");
    }
  }

  const nextVerseTimerRef = useRef(null);
  const multiCopyTimerRef = useRef(null);
  const currentVerseIdxRef = useRef(0);
  const speechSessionRef = useRef(0);
  const pausedBetweenVersesRef = useRef(false);
  const pendingAutoPlayRef = useRef(false);
  const audioSpeedRef = useRef(audioSpeed);
  const audioAutoAdvanceRef = useRef(audioAutoAdvance);
  const selectedBookRef = useRef(selectedBook);
  const selectedChapterRef = useRef(selectedChapter);
  const selectedTranslationRef = useRef(selectedTranslation);
  const startAudioFromVerseRef = useRef(null);
  const seededInitialRef = useRef(false);
  const quickSearchInputRef = useRef(null);

  const updateReaderPref = (key, value) => {
    try {
      localStorage.setItem(key, value);
      window.dispatchEvent(new Event(READER_PREFS_EVENT));
    } catch {
      // Ignore storage write errors
    }
  };

  const stopAudioSpeech = () => {
    speechSessionRef.current += 1;
    pausedBetweenVersesRef.current = false;
    if (nextVerseTimerRef.current) {
      clearTimeout(nextVerseTimerRef.current);
      nextVerseTimerRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const resetAudioPlayback = () => {
    stopAudioSpeech();
    pendingAutoPlayRef.current = false;
    setAudioState("idle");
    setSpeakingVerseNum(null);
  };

  const navigateToChapter = (
    nextBook,
    nextChapter,
    nextVerse = null,
    nextTranslation = selectedTranslationRef.current
  ) => {
    const chapterChanged =
      nextBook !== selectedBook ||
      nextChapter !== selectedChapter ||
      nextTranslation !== selectedTranslation;

    if (chapterChanged) {
      stopAudioSpeech();
      setAudioState("idle");
      setSpeakingVerseNum(null);
      setSelectedVerseNums([]);
      setMultiCopyStatus("idle");
    }

    setHasNavigated(true);
    setSelectedBook(nextBook);
    setSelectedChapter(nextChapter);
    setSelectedTranslation(nextTranslation);
    setTargetVerse(nextVerse);
    setPulsingVerse(nextVerse);
    saveLastPos(nextBook, nextChapter, nextTranslation);
  };

  const startAudioFromVerse = (startIndex = 0, rate = audioSpeedRef.current) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    const verses = chapterData?.verses;
    if (!verses || verses.length === 0) return;

    stopAudioSpeech();
    const sessionId = speechSessionRef.current;
    setAudioState("playing");
    let index = Math.max(0, Math.min(startIndex, verses.length - 1));

    const speakNextVerse = () => {
      if (sessionId !== speechSessionRef.current) return;

      if (index >= verses.length) {
        if (audioAutoAdvanceRef.current) {
          const next = getNeighborChapter(
            selectedBookRef.current,
            selectedChapterRef.current,
            1
          );
          if (next) {
            pendingAutoPlayRef.current = true;
            navigateToChapter(next.book, next.chapter, null, selectedTranslationRef.current);
            return;
          }
        }
        setAudioState("idle");
        setSpeakingVerseNum(null);
        currentVerseIdxRef.current = 0;
        return;
      }

      currentVerseIdxRef.current = index;
      const currentVerse = verses[index];
      setSpeakingVerseNum(currentVerse.verse);

      const cleanText = currentVerse.text.trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = rate;
      utterance.pitch = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const chosenVoice =
        voices.find((v) => v.name.includes("UK English Male")) ||
        voices.find(
          (v) => v.lang.toLowerCase() === "en-gb" && v.name.toLowerCase().includes("male")
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en-gb")) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onend = () => {
        if (sessionId !== speechSessionRef.current) return;
        index++;
        if (nextVerseTimerRef.current) {
          clearTimeout(nextVerseTimerRef.current);
        }
        nextVerseTimerRef.current = setTimeout(() => {
          speakNextVerse();
        }, 120);
      };

      utterance.onerror = (e) => {
        if (sessionId !== speechSessionRef.current) return;
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.error("Speech utterance error:", e);
          setAudioState("idle");
          setSpeakingVerseNum(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextVerse();
  };

  // Sync imperative refs outside render
  useEffect(() => {
    audioSpeedRef.current = audioSpeed;
    audioAutoAdvanceRef.current = audioAutoAdvance;
    selectedBookRef.current = selectedBook;
    selectedChapterRef.current = selectedChapter;
    selectedTranslationRef.current = selectedTranslation;
    startAudioFromVerseRef.current = startAudioFromVerse;
  });

  // Unmount cleanup
  useEffect(() => {
    const multiCopyTimer = multiCopyTimerRef;
    return () => {
      stopAudioSpeech();
      if (multiCopyTimer.current) clearTimeout(multiCopyTimer.current);
    };
  }, []);

  // Cancel active speech synthesis when chapter/translation changes
  useEffect(() => {
    return () => {
      stopAudioSpeech();
    };
  }, [selectedBook, selectedChapter, selectedTranslation]);

  // Save initial position when landed with explicit query target
  useEffect(() => {
    if (initialTarget.hasExplicitTarget) {
      saveLastPos(initialTarget.book, initialTarget.chapter, initialTarget.translation);
    }
  }, [initialTarget.book, initialTarget.chapter, initialTarget.translation, initialTarget.hasExplicitTarget]);

  // Sync URL query params cleanly when navigating
  useEffect(() => {
    if (!hasNavigated) return;
    const params = new URLSearchParams();
    params.set("book", selectedBook);
    params.set("chapter", String(selectedChapter));
    params.set("translation", selectedTranslation);
    if (targetVerse) {
      params.set("verse", String(targetVerse));
    }
    const nextSearch = params.toString();
    if (searchParams.toString() !== nextSearch) {
      router.replace(`/bible?${nextSearch}`, { scroll: false });
    }
  }, [hasNavigated, selectedBook, selectedChapter, selectedTranslation, targetVerse, router, searchParams]);

  // Fetch chapter with module LRU cache, localStorage offline fallback, and silent next-chapter prefetch
  useEffect(() => {
    let active = true;
    const cacheKey = getCacheKey(selectedBook, selectedChapter, selectedTranslation);

    if (!seededInitialRef.current && initialChapterData && Array.isArray(initialChapterData.verses)) {
      seededInitialRef.current = true;
      setCachedChapter(initialKey, initialChapterData);
      writeOfflineChapter(initialKey, initialChapterData);
    }

    const prefetchNextChapter = () => {
      const next = getNeighborChapter(selectedBook, selectedChapter, 1);
      if (!next) return;
      const nextKey = getCacheKey(next.book, next.chapter, selectedTranslation);
      if (chapterCache.has(nextKey)) return;

      fetch(
        `/api/bible?book=${encodeURIComponent(next.book)}&chapter=${next.chapter}&translation=${encodeURIComponent(selectedTranslation)}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((nextData) => {
          if (nextData && Array.isArray(nextData.verses)) {
            setCachedChapter(nextKey, nextData);
            writeOfflineChapter(nextKey, nextData);
          }
        })
        .catch(() => {});
    };

    const loadChapter = async () => {
      const cached = chapterCache.get(cacheKey);
      if (cached) {
        setCachedChapter(cacheKey, cached);
        await Promise.resolve();
        if (!active) return;
        setChapterData(cached);
        setError(null);
        setLoading(false);
        prefetchNextChapter();
        return;
      }

      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/bible?book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}&translation=${encodeURIComponent(selectedTranslation)}`
        );
        if (!res.ok) {
          throw new Error("Unable to fetch scripture passage.");
        }
        const data = await res.json();
        if (!data || !Array.isArray(data.verses)) {
          throw new Error("Invalid scripture response.");
        }
        setCachedChapter(cacheKey, data);
        writeOfflineChapter(cacheKey, data);
        if (active) {
          setChapterData(data);
          setError(null);
          prefetchNextChapter();
        }
      } catch (err) {
        const offline = getOfflineChapter(cacheKey);
        if (offline && Array.isArray(offline.verses)) {
          setCachedChapter(cacheKey, offline);
          if (active) {
            setChapterData(offline);
            setError(null);
          }
        } else if (active) {
          setError(err?.message || "Unable to fetch scripture. Please check your connection.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadChapter();
    return () => {
      active = false;
    };
  }, [selectedBook, selectedChapter, selectedTranslation, retryCount, initialChapterData, initialKey]);

  // Auto-start audio after chapter auto-advances
  useEffect(() => {
    if (!pendingAutoPlayRef.current || loading || !chapterData?.verses?.length) return;
    pendingAutoPlayRef.current = false;
    const timer = setTimeout(() => {
      startAudioFromVerseRef.current?.(0, audioSpeedRef.current);
    }, 150);
    return () => clearTimeout(timer);
  }, [chapterData, loading, selectedBook, selectedChapter, selectedTranslation]);

  // Target verse scroll and pulse animation
  useEffect(() => {
    if (!targetVerse || loading || !chapterData?.verses) return;
    const el = document.getElementById(`bible-verse-${targetVerse}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const startTimer = setTimeout(() => {
      setPulsingVerse(targetVerse);
    }, 0);
    const clearTimer = setTimeout(() => {
      setPulsingVerse(null);
    }, 2400);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(clearTimer);
    };
  }, [targetVerse, loading, chapterData]);

  // Auto-scroll gently to currently spoken verse
  useEffect(() => {
    if (audioState !== "playing" || !speakingVerseNum) return;
    const el = document.getElementById(`bible-verse-${speakingVerseNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [audioState, speakingVerseNum]);

  // Keyboard shortcuts: ArrowLeft / ArrowRight for Prev / Next chapter
  const prevNeighbor = getNeighborChapter(selectedBook, selectedChapter, -1);
  const nextNeighbor = getNeighborChapter(selectedBook, selectedChapter, 1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isPickerOpen || activeModal) return;

      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        activeEl?.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && prevNeighbor) {
        e.preventDefault();
        navigateToChapter(prevNeighbor.book, prevNeighbor.chapter, null);
      } else if (e.key === "ArrowRight" && nextNeighbor) {
        e.preventDefault();
        navigateToChapter(nextNeighbor.book, nextNeighbor.chapter, null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handlePlayPauseAudio = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (audioState === "idle") {
      startAudioFromVerse(0, audioSpeed);
      return;
    }

    if (audioState === "playing") {
      if (nextVerseTimerRef.current) {
        clearTimeout(nextVerseTimerRef.current);
        nextVerseTimerRef.current = null;
        pausedBetweenVersesRef.current = true;
      } else {
        window.speechSynthesis.pause();
      }
      setAudioState("paused");
      return;
    }

    if (audioState === "paused") {
      if (pausedBetweenVersesRef.current) {
        pausedBetweenVersesRef.current = false;
        startAudioFromVerse(currentVerseIdxRef.current + 1, audioSpeed);
      } else {
        window.speechSynthesis.resume();
        setAudioState("playing");
      }
    }
  };

  const handleListenFromVerse = (verseNum) => {
    const verses = chapterData?.verses || [];
    const idx = verses.findIndex((v) => v.verse === verseNum);
    startAudioFromVerse(idx >= 0 ? idx : 0, audioSpeed);
  };

  const handleMoodVerseClick = (tag) => {
    const parsed = parseBibleReference(tag);
    if (!parsed) return;
    navigateToChapter(parsed.book, parsed.chapter, parsed.verse ?? null);
    const pane = document.getElementById("scripture-reading-pane");
    if (pane) {
      pane.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleModalStateChange = (payload) => {
    if (!payload) return;
    if (!initialUser) {
      window.dispatchEvent(new Event(NOTEBOOK_UPDATED_EVENT));
      return;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "highlight")) {
      const ids =
        Array.isArray(payload.verseIds) && payload.verseIds.length > 0
          ? payload.verseIds
          : payload.verseId
            ? [payload.verseId]
            : [];
      setDbHighlights((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          if (payload.highlight) {
            next[id] = payload.highlight;
          } else {
            delete next[id];
          }
        });
        return next;
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, "note")) {
      setDbNotes((prev) => {
        const next = { ...prev };
        if (payload.note) {
          next[payload.verseId] = {
            text: payload.note,
            timestamp: prev[payload.verseId]?.timestamp || ""
          };
        } else {
          delete next[payload.verseId];
        }
        return next;
      });
    }
  };

  // Quick Jump / In-Chapter Filter derived values
  const trimmedQuickQuery = quickQuery.trim();
  const parsedQuickJump = trimmedQuickQuery ? parseBibleReference(trimmedQuickQuery) : null;
  const inChapterFilterTerm = trimmedQuickQuery && !parsedQuickJump ? trimmedQuickQuery : "";

  const allVerses = chapterData?.verses || [];
  const displayedVerses = inChapterFilterTerm
    ? allVerses.filter((v) =>
        v.text.toLowerCase().includes(inChapterFilterTerm.toLowerCase())
      )
    : allVerses;

  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    if (parsedQuickJump) {
      navigateToChapter(
        parsedQuickJump.book,
        parsedQuickJump.chapter,
        parsedQuickJump.verse ?? null
      );
      setQuickQuery("");
    }
  };

  // Multi-verse selection helpers
  const selectedVerseObjects = allVerses.filter((v) => selectedVerseNums.includes(v.verse));
  const selectionTag = formatVerseSelectionTag(
    selectedBook,
    selectedChapter,
    selectedVerseObjects.map((v) => v.verse),
    selectedTranslation
  );

  const handleVerseClick = (v, e) => {
    if (isSelectMode || e.shiftKey) {
      e.preventDefault();
      setSelectedVerseNums((prev) =>
        prev.includes(v.verse)
          ? prev.filter((num) => num !== v.verse)
          : [...prev, v.verse].sort((a, b) => a - b)
      );
      return;
    }

    const verseId = `${v.book_name}_${v.chapter}_${v.verse}`;
    setActiveModal({
      verseId,
      verseText: v.text.trim(),
      verseTag: `${v.book_name} ${v.chapter}:${v.verse} ${selectedTranslation.toUpperCase()}`,
      verseNum: v.verse,
      selectedVerses: null,
      compareMeta: {
        book: selectedBook,
        chapter: selectedChapter,
        verse: v.verse,
        endVerse: null,
        currentTranslation: selectedTranslation
      }
    });
  };

  const handleMultiHighlight = async (colorClass) => {
    if (selectedVerseObjects.length === 0) return;
    const ids = selectedVerseObjects.map((v) => `${v.book_name}_${v.chapter}_${v.verse}`);

    if (initialUser) {
      await Promise.all(
        ids.map(async (id) => {
          if (colorClass) {
            if (highlights[id] !== colorClass) {
              const res = await toggleHighlightDb(id, colorClass);
              if (res && res.color === null && !res.error) {
                await toggleHighlightDb(id, colorClass);
              }
            }
          } else if (highlights[id]) {
            await toggleHighlightDb(id, null);
          }
        })
      );
      setDbHighlights((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          if (colorClass) next[id] = colorClass;
          else delete next[id];
        });
        return next;
      });
    } else {
      const current = getHighlightsLocal();
      ids.forEach((id) => {
        if (colorClass) {
          if (current[id] !== colorClass) {
            toggleHighlightLocal(id, colorClass);
          }
        } else if (current[id]) {
          toggleHighlightLocal(id, null);
        }
      });
      window.dispatchEvent(new Event(NOTEBOOK_UPDATED_EVENT));
    }
  };

  const handleMultiCopy = async () => {
    if (selectedVerseObjects.length === 0) return;
    const text = selectedVerseObjects.map((v) => v.text.trim()).join(" ");
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(`"${text}" — ${selectionTag}`);
      setMultiCopyStatus("copied");
    } catch {
      setMultiCopyStatus("error");
    }
    if (multiCopyTimerRef.current) clearTimeout(multiCopyTimerRef.current);
    multiCopyTimerRef.current = setTimeout(() => setMultiCopyStatus("idle"), 2500);
  };

  const handleOpenMultiStudy = () => {
    if (selectedVerseObjects.length === 0) return;
    const selectedPayload = selectedVerseObjects.map((v) => ({
      id: `${v.book_name}_${v.chapter}_${v.verse}`,
      verse: v.verse,
      text: v.text.trim()
    }));
    const first = selectedVerseObjects[0];
    const last = selectedVerseObjects[selectedVerseObjects.length - 1];
    setActiveModal({
      verseId: selectedPayload[0].id,
      verseText: selectedPayload.map((x) => x.text).join(" "),
      verseTag: selectionTag,
      verseNum: first.verse,
      selectedVerses: selectedPayload.length > 1 ? selectedPayload : null,
      compareMeta: {
        book: selectedBook,
        chapter: selectedChapter,
        verse: first.verse,
        endVerse: last.verse > first.verse ? last.verse : null,
        currentTranslation: selectedTranslation
      }
    });
  };

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
      case "small":
        return "1.55rem";
      case "large":
        return "2.1rem";
      case "xlarge":
        return "2.4rem";
      default:
        return "1.8rem";
    }
  };

  const getFontFamilyStyle = () => {
    return fontFamily === "serif"
      ? "var(--font-family-reader), Georgia, serif"
      : "var(--font-family), system-ui, sans-serif";
  };

  const showResumeBanner = Boolean(
    !hasNavigated &&
      !resumeDismissed &&
      savedReadingPos &&
      (savedReadingPos.book !== selectedBook ||
        savedReadingPos.chapter !== selectedChapter ||
        (savedReadingPos.translation || "web") !== selectedTranslation)
  );

  const activeMoodObj = moodVerses.find((m) => m.key === selectedMood) || null;
  const themeStyles = getThemeStyles();

  const pageTitle =
    chapterData && chapterData.reference
      ? `${chapterData.reference} (${selectedTranslation.toUpperCase()}) | PraisePage Bible Reader`
      : `${selectedBook} ${selectedChapter} | PraisePage Bible Reader`;

  const pageDescription =
    chapterData && chapterData.verses && chapterData.verses.length > 0
      ? `Read ${selectedBook} ${selectedChapter} online. "${chapterData.verses[0].text.substring(0, 150)}..." Explore scriptures of gratitude and faith.`
      : "Read, search, highlight, and write reflections on Holy Scriptures of gratitude and faith.";

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "3rem" }}>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <div className="container" style={{ maxWidth: "860px" }}>

        {/* Compact Collapsible Mood Strip */}
        <div className="bible-mood-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "700", letterSpacing: "0.08em", marginRight: "0.4rem" }}>
              SOUL CHECK-IN:
            </span>
            {moodVerses.map((mood) => {
              const isActive = selectedMood === mood.key;
              return (
                <button
                  key={mood.key}
                  type="button"
                  className={`bible-mood-pill ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedMood(isActive ? null : mood.key)}
                  aria-expanded={isActive}
                >
                  <i className={mood.icon} aria-hidden="true"></i>
                  {mood.label}
                </button>
              );
            })}
          </div>

          {activeMoodObj && (
            <div className="bible-mood-grid">
              {activeMoodObj.verses.map((v, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="bible-mood-card"
                  onClick={() => handleMoodVerseClick(v.tag)}
                >
                  <p style={{ fontSize: "1.25rem", color: "var(--light-color)", lineHeight: "1.45", fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>
                    &ldquo;{v.verse}&rdquo;
                  </p>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--accent-color)" }}>
                    {v.tag} &rarr;
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Continue Reading Resume Banner */}
        {showResumeBanner && (
          <div className="bible-resume-banner">
            <button
              type="button"
              onClick={() =>
                navigateToChapter(
                  savedReadingPos.book,
                  savedReadingPos.chapter,
                  null,
                  savedReadingPos.translation || "web"
                )
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                fontWeight: "600",
                cursor: "pointer",
                color: "inherit",
                textAlign: "left"
              }}
            >
              <i className="ri-bookmark-line" style={{ color: "var(--accent-color)", fontSize: "1.7rem" }} aria-hidden="true"></i>
              <span>
                Continue reading{" "}
                <strong>
                  {savedReadingPos.book} {savedReadingPos.chapter} (
                  {(savedReadingPos.translation || "web").toUpperCase()})
                </strong>{" "}
                &rarr;
              </span>
            </button>
            <button
              type="button"
              onClick={() => setResumeDismissed(true)}
              aria-label="Dismiss continue reading banner"
              style={{ cursor: "pointer", fontSize: "1.8rem", lineHeight: 1, color: "var(--light-color-alt)" }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Sticky Compact Control Bar */}
        <div className="bible-sticky-bar">
          <div className="bible-bar-group">
            <button
              type="button"
              className="bible-icon-btn"
              disabled={!prevNeighbor}
              onClick={() => prevNeighbor && navigateToChapter(prevNeighbor.book, prevNeighbor.chapter)}
              title={prevNeighbor ? `Previous: ${prevNeighbor.book} ${prevNeighbor.chapter}` : "Beginning of Bible"}
              aria-label={prevNeighbor ? `Previous chapter: ${prevNeighbor.book} ${prevNeighbor.chapter}` : "No previous chapter"}
            >
              <i className="ri-arrow-left-s-line" aria-hidden="true"></i>
            </button>

            <button
              type="button"
              className="bible-ref-trigger"
              onClick={() => setIsPickerOpen(true)}
              aria-label={`Choose book and chapter, currently ${selectedBook} ${selectedChapter}`}
            >
              <span>
                {selectedBook} {selectedChapter}
              </span>
              <i className="ri-arrow-down-s-fill" aria-hidden="true"></i>
            </button>

            <button
              type="button"
              className="bible-icon-btn"
              disabled={!nextNeighbor}
              onClick={() => nextNeighbor && navigateToChapter(nextNeighbor.book, nextNeighbor.chapter)}
              title={nextNeighbor ? `Next: ${nextNeighbor.book} ${nextNeighbor.chapter}` : "End of Bible"}
              aria-label={nextNeighbor ? `Next chapter: ${nextNeighbor.book} ${nextNeighbor.chapter}` : "No next chapter"}
            >
              <i className="ri-arrow-right-s-line" aria-hidden="true"></i>
            </button>

            <select
              className="bible-translation-select"
              aria-label="Bible translation"
              value={selectedTranslation}
              onChange={(e) =>
                navigateToChapter(selectedBook, selectedChapter, targetVerse, e.target.value)
              }
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Jump / In-Chapter Search */}
          <form onSubmit={handleQuickSearchSubmit} className="bible-quick-search">
            <i
              className="ri-search-line"
              aria-hidden="true"
              onClick={() => quickSearchInputRef.current?.focus()}
            ></i>
            <input
              ref={quickSearchInputRef}
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Jump (Ps 23:4) or filter chapter..."
              aria-label="Quick jump to reference or filter current chapter"
            />
            {parsedQuickJump && (
              <button
                type="submit"
                style={{
                  fontSize: "1.15rem",
                  fontWeight: "700",
                  color: "var(--accent-color)",
                  whiteSpace: "nowrap",
                  cursor: "pointer"
                }}
              >
                Go {parsedQuickJump.book} {parsedQuickJump.chapter}
                {parsedQuickJump.verse ? `:${parsedQuickJump.verse}` : ""} &crarr;
              </button>
            )}
            {inChapterFilterTerm && (
              <span style={{ fontSize: "1.15rem", color: "var(--light-color-alt)", whiteSpace: "nowrap" }}>
                {displayedVerses.length} {displayedVerses.length === 1 ? "match" : "matches"}
              </span>
            )}
            {trimmedQuickQuery && (
              <button
                type="button"
                onClick={() => setQuickQuery("")}
                aria-label="Clear quick jump or filter"
                style={{ cursor: "pointer", fontSize: "1.6rem", lineHeight: 1, color: "var(--light-color-alt)" }}
              >
                &times;
              </button>
            )}
          </form>

          {/* Audio, Layout, Select, and Settings */}
          <div className="bible-bar-group">
            <button
              type="button"
              className={`bible-icon-btn ${audioState !== "idle" ? "active" : ""}`}
              onClick={handlePlayPauseAudio}
              title={
                audioState === "playing"
                  ? "Pause Audio Reader"
                  : audioState === "paused"
                    ? "Resume Audio Reader"
                    : "Listen to Chapter"
              }
              aria-label={
                audioState === "playing"
                  ? "Pause Audio Reader"
                  : audioState === "paused"
                    ? "Resume Audio Reader"
                    : "Listen to Chapter"
              }
            >
              <i
                className={
                  audioState === "playing" ? "ri-pause-fill" : "ri-play-fill"
                }
                aria-hidden="true"
              ></i>
            </button>

            {audioState !== "idle" && (
              <button
                type="button"
                className="bible-icon-btn"
                onClick={resetAudioPlayback}
                title="Stop Audio Reader"
                aria-label="Stop Audio Reader"
              >
                <i className="ri-stop-fill" aria-hidden="true"></i>
              </button>
            )}

            <select
              className="bible-translation-select"
              aria-label="Audio playback speed"
              value={audioSpeed}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setAudioSpeed(rate);
                if (audioState !== "idle") {
                  startAudioFromVerse(currentVerseIdxRef.current, rate);
                }
              }}
              style={{ padding: "0 0.55rem" }}
            >
              <option value="0.8">0.8x</option>
              <option value="1">1.0x</option>
              <option value="1.2">1.2x</option>
              <option value="1.5">1.5x</option>
            </select>

            <button
              type="button"
              className={`bible-icon-btn ${layoutMode === "verses" ? "active" : ""}`}
              onClick={() =>
                updateReaderPref(
                  "bible_layout_mode",
                  layoutMode === "paragraph" ? "verses" : "paragraph"
                )
              }
              title={layoutMode === "paragraph" ? "Switch to Verse-by-Verse" : "Switch to Paragraph"}
              aria-label="Toggle paragraph or verse-by-verse layout"
            >
              <i
                className={layoutMode === "verses" ? "ri-list-ordered" : "ri-align-left"}
                aria-hidden="true"
              ></i>
            </button>

            <button
              type="button"
              className={`bible-icon-btn ${isSelectMode ? "active" : ""}`}
              onClick={() => {
                setIsSelectMode((prev) => !prev);
                if (isSelectMode) setSelectedVerseNums([]);
              }}
              title="Select multiple verses (or Shift+Click)"
              aria-pressed={isSelectMode}
            >
              <i className="ri-checkbox-multiple-line" aria-hidden="true"></i>
              <span>Select</span>
            </button>

            <button
              type="button"
              className={`bible-icon-btn ${showSettings ? "active" : ""}`}
              onClick={() => setShowSettings((prev) => !prev)}
              aria-expanded={showSettings}
              title="Reader typography and theme settings"
              aria-label="Reader settings"
            >
              <span>Aa</span>
            </button>
          </div>

          {/* Collapsible Settings Popover Row */}
          {showSettings && (
            <div className="bible-settings-panel">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1.2rem" }}>
                {/* Font Size */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "700" }}>
                    Font Size
                  </span>
                  <div style={{ display: "inline-flex", backgroundColor: "var(--secondary-background-color)", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--transparent-light-color)", alignSelf: "flex-start" }}>
                    {["small", "medium", "large", "xlarge"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updateReaderPref("bible_font_size", sz)}
                        style={{
                          backgroundColor: fontSize === sz ? "rgba(79, 207, 112, 0.16)" : "transparent",
                          color: fontSize === sz ? "var(--accent-color)" : "var(--light-color-alt)",
                          border: "none",
                          padding: "0.5rem 0.95rem",
                          fontSize: "1.15rem",
                          cursor: "pointer",
                          fontWeight: fontSize === sz ? "700" : "500"
                        }}
                      >
                        {sz === "small" ? "A-" : sz === "medium" ? "A" : sz === "large" ? "A+" : "A++"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Style */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "700" }}>
                    Font Style
                  </span>
                  <div style={{ display: "inline-flex", backgroundColor: "var(--secondary-background-color)", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--transparent-light-color)", alignSelf: "flex-start" }}>
                    {["serif", "sans"].map((fam) => (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => updateReaderPref("bible_font_family", fam)}
                        style={{
                          backgroundColor: fontFamily === fam ? "rgba(79, 207, 112, 0.16)" : "transparent",
                          color: fontFamily === fam ? "var(--accent-color)" : "var(--light-color-alt)",
                          border: "none",
                          padding: "0.5rem 1.2rem",
                          fontSize: "1.15rem",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        {fam === "serif" ? "Serif" : "Sans"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "700" }}>
                    Reader Theme
                  </span>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    {[
                      { id: "default", name: "Default Theme", color: "var(--secondary-background-color)", border: "1px solid var(--transparent-light-color)" },
                      { id: "sepia", name: "Warm Sepia Theme", color: "#f4ecd8", border: "1px solid #e4dcc4" },
                      { id: "light", name: "Soft White Theme", color: "#ffffff", border: "1px solid #e3e4e8" },
                      { id: "dark", name: "Pure Charcoal Theme", color: "#18191c", border: "1px solid #2a2b2f" }
                    ].map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => updateReaderPref("bible_reader_theme", th.id)}
                        title={th.name}
                        aria-label={th.name}
                        style={{
                          width: "2.2rem",
                          height: "2.2rem",
                          borderRadius: "50%",
                          backgroundColor: th.color,
                          border: readerTheme === th.id ? "2px solid var(--accent-color)" : th.border,
                          cursor: "pointer",
                          boxShadow: readerTheme === th.id ? "0 0 8px var(--accent-color)" : "none"
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Audio Auto-Advance */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", textTransform: "uppercase", fontWeight: "700" }}>
                    Audio Playback
                  </span>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", fontSize: "1.25rem", color: "var(--light-color)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={audioAutoAdvance}
                      onChange={(e) =>
                        updateReaderPref(
                          "bible_audio_autoadvance",
                          e.target.checked ? "true" : "false"
                        )
                      }
                    />
                    Auto-advance next chapter
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reading Pane */}
        <div
          id="scripture-reading-pane"
          className="bible-reader-pane"
          style={{
            backgroundColor: themeStyles.backgroundColor,
            color: themeStyles.color,
            borderColor: themeStyles.borderColor
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.6rem", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "2.4rem", color: themeStyles.color, margin: 0 }}>
              {selectedBook} {selectedChapter}
            </h2>
            <span style={{ fontSize: "1.2rem", padding: "0.45rem 1rem", backgroundColor: "var(--transparent-light-color)", borderRadius: "20px", textTransform: "uppercase", fontWeight: "600" }}>
              {selectedTranslation}
            </span>
          </div>

          {loading ? (
            <div aria-busy="true" aria-label="Loading scripture verses">
              {Array.from({ length: 10 }, (_, idx) => (
                <div key={idx} className="bible-skeleton-line" />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#ff5e62" }}>
              <i className="ri-error-warning-line" style={{ fontSize: "4rem", display: "block", marginBottom: "1.5rem" }} aria-hidden="true"></i>
              <p style={{ fontSize: "1.6rem" }}>{error}</p>
              <button
                type="button"
                onClick={() => {
                  chapterCache.delete(getCacheKey(selectedBook, selectedChapter, selectedTranslation));
                  setRetryCount((prev) => prev + 1);
                }}
                style={{ marginTop: "2rem", padding: "0.8rem 2rem", backgroundColor: "var(--light-color)", color: "var(--primary-background-color)", borderRadius: "30px", fontWeight: "600", cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          ) : displayedVerses.length > 0 ? (
            <div
              className={`bible-scripture-body ${layoutMode === "verses" ? "verse-by-verse" : ""}`}
              style={{
                fontSize: getFontSizeStyle(),
                color: themeStyles.color,
                fontFamily: getFontFamilyStyle()
              }}
            >
              {displayedVerses.map((v) => {
                const verseId = `${v.book_name}_${v.chapter}_${v.verse}`;
                const highlightColor = highlights[verseId] || "";
                const hasNote = Boolean(notes[verseId]?.text);
                const isSelected = selectedVerseNums.includes(v.verse);
                const isSpeaking = audioState !== "idle" && speakingVerseNum === v.verse;
                const isPulsing = pulsingVerse === v.verse;

                const itemClasses = [
                  "bible-verse-item",
                  "highlight-text-interactive",
                  highlightColor,
                  isSelected ? "bible-verse-selected" : "",
                  isSpeaking ? "bible-verse-speaking" : "",
                  isPulsing ? "bible-verse-target-pulse" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <span
                    key={v.verse}
                    id={`bible-verse-${v.verse}`}
                    className={itemClasses}
                    onClick={(e) => handleVerseClick(v, e)}
                  >
                    <sup
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: isSpeaking ? "var(--accent-color)" : themeStyles.verseNumColor,
                        marginRight: "4px",
                        userSelect: "none"
                      }}
                    >
                      {v.verse}
                    </sup>
                    {renderHighlightedText(v.text.trim(), inChapterFilterTerm)}
                    {hasNote && (
                      <span
                        className="bible-note-badge"
                        title="Saved reflection note"
                        aria-label="Has saved note"
                      >
                        <i className="ri-sticky-note-line" aria-hidden="true"></i>
                      </span>
                    )}
                    {" "}
                  </span>
                );
              })}
            </div>
          ) : inChapterFilterTerm ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--light-color-alt)" }}>
              <p style={{ fontSize: "1.5rem", marginBottom: "1.2rem" }}>
                No verses in {selectedBook} {selectedChapter} match &ldquo;{inChapterFilterTerm}&rdquo;.
              </p>
              <button
                type="button"
                className="bible-icon-btn"
                onClick={() => setQuickQuery("")}
              >
                Clear filter
              </button>
            </div>
          ) : null}

          {/* Smart Chapter Footer Navigation */}
          <div className="bible-footer-nav">
            <button
              type="button"
              disabled={!prevNeighbor}
              onClick={() => prevNeighbor && navigateToChapter(prevNeighbor.book, prevNeighbor.chapter)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                color: themeStyles.verseNumColor
              }}
            >
              <i className="ri-arrow-left-s-line" aria-hidden="true"></i>
              {prevNeighbor ? `${prevNeighbor.book} ${prevNeighbor.chapter}` : "Genesis 1"}
            </button>

            <button
              type="button"
              disabled={!nextNeighbor}
              onClick={() => nextNeighbor && navigateToChapter(nextNeighbor.book, nextNeighbor.chapter)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                fontWeight: "600",
                color: themeStyles.verseNumColor
              }}
            >
              {nextNeighbor ? `${nextNeighbor.book} ${nextNeighbor.chapter}` : "Revelation 22"}
              <i className="ri-arrow-right-s-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Tip Box */}
        <div style={{ textAlign: "center", marginTop: "2.4rem", fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
          <i className="ri-lightbulb-line" style={{ marginRight: "0.5rem" }} aria-hidden="true"></i>
          Tip: Tap any verse to highlight, compare translations, or save notes. Use Shift+Click or Select for multiple verses.
        </div>
      </div>

      {/* Floating Multi-Verse Action Bar */}
      {selectedVerseObjects.length > 0 && (
        <div className="bible-multi-bar" role="region" aria-label="Multi-verse actions">
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <strong style={{ fontSize: "1.3rem", color: "var(--accent-color)" }}>
              {selectedVerseObjects.length} {selectedVerseObjects.length === 1 ? "verse" : "verses"} selected
            </strong>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              {[
                { name: "Yellow", className: "highlight-yellow", hex: "#ffe066" },
                { name: "Green", className: "highlight-green", hex: "#a9e34b" },
                { name: "Blue", className: "highlight-blue", hex: "#74c0fc" },
                { name: "Pink", className: "highlight-pink", hex: "#faa2c1" }
              ].map((sw) => (
                <button
                  key={sw.className}
                  type="button"
                  onClick={() => handleMultiHighlight(sw.className)}
                  title={`Highlight selected in ${sw.name}`}
                  aria-label={`Highlight selected in ${sw.name}`}
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    backgroundColor: sw.hex,
                    cursor: "pointer",
                    border: "1px solid rgba(0,0,0,0.2)"
                  }}
                />
              ))}
              <button
                type="button"
                className="bible-icon-btn"
                onClick={() => handleMultiHighlight(null)}
                title="Clear highlights on selected"
                aria-label="Clear highlights on selected"
                style={{ height: "2.6rem", minWidth: "2.6rem", padding: "0 0.6rem" }}
              >
                <i className="ri-eraser-line" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <button type="button" className="bible-icon-btn" onClick={handleMultiCopy}>
              <i
                className={
                  multiCopyStatus === "copied"
                    ? "ri-check-line"
                    : multiCopyStatus === "error"
                      ? "ri-error-warning-line"
                      : "ri-file-copy-line"
                }
                aria-hidden="true"
              ></i>
              <span>
                {multiCopyStatus === "copied"
                  ? "Copied!"
                  : multiCopyStatus === "error"
                    ? "Copy failed"
                    : "Copy"}
              </span>
            </button>

            <button
              type="button"
              className="bible-icon-btn active"
              onClick={handleOpenMultiStudy}
            >
              <i className="ri-book-open-line" aria-hidden="true"></i>
              <span>Study &amp; Card</span>
            </button>

            <button
              type="button"
              className="bible-icon-btn"
              onClick={() => {
                setSelectedVerseNums([]);
                setIsSelectMode(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Book & Chapter Picker Modal */}
      {isPickerOpen && (
        <BookChapterPicker
          currentBook={selectedBook}
          currentChapter={selectedChapter}
          onSelect={({ book, chapter, verse }) =>
            navigateToChapter(book, chapter, verse ?? null)
          }
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {/* Verse Actions Drawer Modal */}
      {activeModal && (
        <VerseActionsModal
          verseText={activeModal.verseText}
          verseTag={activeModal.verseTag}
          verseId={activeModal.verseId}
          user={initialUser}
          initialHighlight={highlights[activeModal.verseId] || null}
          initialNote={notes[activeModal.verseId]?.text || ""}
          selectedVerses={activeModal.selectedVerses}
          compareMeta={activeModal.compareMeta}
          onListenFromHere={() => handleListenFromVerse(activeModal.verseNum)}
          onClose={() => setActiveModal(null)}
          onStateChange={handleModalStateChange}
        />
      )}
    </section>
  );
}
