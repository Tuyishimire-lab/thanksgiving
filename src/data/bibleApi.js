import { TRANSLATIONS, getBookByName, normalizeTranslation } from "./bibleParser.js";

const TRANSLATIONS_BY_ID = new Map(TRANSLATIONS.map((t) => [t.id, t]));
const FETCH_TIMEOUT_MS = 6000;

function buildAbortTimeout(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return { signal: AbortSignal.timeout(ms), cleanup: () => {} };
  }
  if (typeof AbortController !== "undefined") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
  }
  return { signal: undefined, cleanup: () => {} };
}

/**
 * Fetch a full Bible chapter from bible-api.com with 24h Next.js revalidation.
 * Returns null on invalid input, timeout, or upstream error so SSR never crashes.
 */
export async function fetchBibleChapter(book, chapter, translation = "web") {
  const bookObj = getBookByName(book);
  if (!bookObj) return null;

  const chapterNum = Number.parseInt(String(chapter ?? ""), 10);
  if (!Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > bookObj.chapters) {
    return null;
  }

  const validTranslation = normalizeTranslation(translation);
  const queryBook = bookObj.name.replace(/\s+/g, "+");
  const url = `https://bible-api.com/${queryBook}+${chapterNum}?translation=${validTranslation}`;

  const { signal, cleanup } = buildAbortTimeout(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.verses) || data.verses.length === 0) {
      return null;
    }

    const meta = TRANSLATIONS_BY_ID.get(validTranslation);
    return {
      reference: data.reference || `${bookObj.name} ${chapterNum}`,
      verses: data.verses,
      text: data.text || data.verses.map((v) => String(v.text || "")).join(""),
      translation_id: data.translation_id || validTranslation,
      translation_name: data.translation_name || meta?.name || validTranslation.toUpperCase(),
    };
  } catch {
    return null;
  } finally {
    cleanup();
  }
}

/**
 * Fetch a specific verse or verse range across multiple translations in parallel.
 */
export async function fetchVerseAcrossTranslations(
  book,
  chapter,
  verseNum,
  endVerse = null,
  translationIds = ["web", "kjv", "asv"]
) {
  const bookObj = getBookByName(book);
  const chapterNum = Number.parseInt(String(chapter ?? ""), 10);
  const startVerse = Number.parseInt(String(verseNum ?? ""), 10);
  if (
    !bookObj ||
    !Number.isInteger(chapterNum) ||
    chapterNum < 1 ||
    chapterNum > bookObj.chapters ||
    !Number.isInteger(startVerse) ||
    startVerse < 1
  ) {
    return { reference: "", comparisons: [] };
  }

  const parsedEnd =
    endVerse !== null && endVerse !== undefined
      ? Number.parseInt(String(endVerse), 10)
      : NaN;
  const lastVerse = Number.isInteger(parsedEnd) && parsedEnd >= startVerse ? parsedEnd : startVerse;

  const uniqueIds = [];
  const seen = new Set();
  for (const rawId of Array.isArray(translationIds) ? translationIds : []) {
    const id = String(rawId || "").trim().toLowerCase();
    if (TRANSLATIONS_BY_ID.has(id) && !seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }

  const chapters = await Promise.all(
    uniqueIds.map((id) => fetchBibleChapter(bookObj.name, chapterNum, id))
  );

  const comparisons = [];
  for (let i = 0; i < uniqueIds.length; i++) {
    const id = uniqueIds[i];
    const meta = TRANSLATIONS_BY_ID.get(id);
    const chapterData = chapters[i];
    if (!meta || !chapterData?.verses) continue;

    const matching = chapterData.verses.filter(
      (v) => v.verse >= startVerse && v.verse <= lastVerse
    );
    const text = matching
      .map((v) => String(v.text || "").trim())
      .filter(Boolean)
      .join(" ");

    if (text) {
      comparisons.push({
        id: meta.id,
        short: meta.short,
        name: meta.name,
        text,
      });
    }
  }

  const reference = `${bookObj.name} ${chapterNum}:${startVerse}${
    lastVerse > startVerse ? `-${lastVerse}` : ""
  }`;

  return { reference, comparisons };
}
