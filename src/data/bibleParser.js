import { bibleBooks } from "./bibleBooks.js";

export const TRANSLATIONS = [
  { id: "web", short: "WEB", name: "World English Bible (WEB)" },
  { id: "kjv", short: "KJV", name: "King James Version (KJV)" },
  { id: "bbe", short: "BBE", name: "Basic English (BBE)" },
  { id: "asv", short: "ASV", name: "American Standard (ASV)" },
];

export const MOOD_META = {
  Anxious: { label: "Anxious", icon: "ri-mental-health-line" },
  Grateful: { label: "Grateful", icon: "ri-heart-3-line" },
  Weary: { label: "Weary", icon: "ri-battery-low-line" },
  Joyful: { label: "Joyful", icon: "ri-sun-line" },
  Grieving: { label: "Grieving", icon: "ri-hand-heart-line" },
  SeekingGuidance: { label: "Seeking Guidance", icon: "ri-compass-3-line" },
};

const TRANSLATION_SET = new Set(TRANSLATIONS.map((t) => t.id));
const TRANSLATION_SUFFIX_RE = /\s+(?:NIV|ESV|KJV|NKJV|NLT|CSB|NASB|WEB|BBE|ASV)$/i;

const ALIAS_GROUPS = {
  Genesis: ["gen", "ge", "gn"],
  Exodus: ["ex", "exod", "exo"],
  Leviticus: ["lev", "le", "lv"],
  Numbers: ["num", "nu", "nm", "nb"],
  Deuteronomy: ["deut", "deu", "dt"],
  Joshua: ["josh", "jos"],
  Judges: ["judg", "jdg", "jdgs"],
  Ruth: ["rth", "ru"],
  "1 Samuel": ["1 sam", "1 sa", "1 sm", "1sam", "1sa"],
  "2 Samuel": ["2 sam", "2 sa", "2 sm", "2sam", "2sa"],
  "1 Kings": ["1 kgs", "1 ki", "1 kng", "1 king", "1kgs", "1ki"],
  "2 Kings": ["2 kgs", "2 ki", "2 kng", "2 king", "2kgs", "2ki"],
  "1 Chronicles": ["1 chr", "1 ch", "1 chron", "1chr", "1chron"],
  "2 Chronicles": ["2 chr", "2 ch", "2 chron", "2chr", "2chron"],
  Ezra: ["ezr"],
  Nehemiah: ["neh", "ne"],
  Esther: ["esth", "est"],
  Job: ["jb"],
  Psalms: ["ps", "psa", "psalm", "pslm"],
  Proverbs: ["prov", "pro", "pr", "prv"],
  Ecclesiastes: ["eccl", "ecc", "ec", "qoh"],
  "Song of Solomon": ["song", "sos", "song of songs", "canticles", "cant"],
  Isaiah: ["isa", "is"],
  Jeremiah: ["jer", "je", "jr"],
  Lamentations: ["lam", "la"],
  Ezekiel: ["ezek", "eze", "ezk", "ez"],
  Daniel: ["dan", "da", "dn"],
  Hosea: ["hos", "ho"],
  Joel: ["jl", "joe"],
  Amos: ["am"],
  Obadiah: ["obad", "ob", "oba"],
  Jonah: ["jon", "jnh"],
  Micah: ["mic", "mi"],
  Nahum: ["nah", "na"],
  Habakkuk: ["hab", "hb"],
  Zephaniah: ["zeph", "zep", "zp"],
  Haggai: ["hag", "hg"],
  Zechariah: ["zech", "zec", "zc"],
  Malachi: ["mal", "ml"],
  Matthew: ["matt", "mt", "mat"],
  Mark: ["mk", "mrk", "mr"],
  Luke: ["lk", "luk", "lu"],
  John: ["jn", "jhn", "joh"],
  Acts: ["ac", "act"],
  Romans: ["rom", "ro", "rm"],
  "1 Corinthians": ["1 cor", "1 co", "1cor", "1co"],
  "2 Corinthians": ["2 cor", "2 co", "2cor", "2co"],
  Galatians: ["gal", "ga"],
  Ephesians: ["eph", "ephes"],
  Philippians: ["phil", "php", "pp"],
  Colossians: ["col", "co"],
  "1 Thessalonians": ["1 thess", "1 thes", "1 th", "1thess", "1thes", "1th"],
  "2 Thessalonians": ["2 thess", "2 thes", "2 th", "2thess", "2thes", "2th"],
  "1 Timothy": ["1 tim", "1 ti", "1tim", "1ti"],
  "2 Timothy": ["2 tim", "2 ti", "2tim", "2ti"],
  Titus: ["tit", "ti"],
  Philemon: ["phlm", "phm", "philem"],
  Hebrews: ["heb", "hebr"],
  James: ["jas", "jm", "jam"],
  "1 Peter": ["1 pet", "1 pe", "1 pt", "1pet", "1pe", "1pt"],
  "2 Peter": ["2 pet", "2 pe", "2 pt", "2pet", "2pe", "2pt"],
  "1 John": ["1 jn", "1 jo", "1 jhn", "1jn", "1jo"],
  "2 John": ["2 jn", "2 jo", "2 jhn", "2jn", "2jo"],
  "3 John": ["3 jn", "3 jo", "3 jhn", "3jn", "3jo"],
  Jude: ["jud"],
  Revelation: ["rev", "re", "rv", "revelations"],
};

const BOOK_BY_NAME = new Map(bibleBooks.map((b) => [b.name, b]));
const BOOK_INDEX_BY_NAME = new Map(bibleBooks.map((b, idx) => [b.name, idx]));
const BOOK_LOOKUP = new Map();

function normalizeLookupKey(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^iii\s+/, "3 ")
    .replace(/^ii\s+/, "2 ")
    .replace(/^i\s+/, "1 ")
    .replace(/^([123])([a-z])/, "$1 $2");
}

for (const book of bibleBooks) {
  BOOK_LOOKUP.set(normalizeLookupKey(book.name), book);
  BOOK_LOOKUP.set(normalizeLookupKey(book.name).replace(/\s+/g, ""), book);
}

for (const [canonical, aliases] of Object.entries(ALIAS_GROUPS)) {
  const book = BOOK_BY_NAME.get(canonical);
  if (!book) continue;
  for (const alias of aliases) {
    const key = normalizeLookupKey(alias);
    BOOK_LOOKUP.set(key, book);
    BOOK_LOOKUP.set(key.replace(/\s+/g, ""), book);
  }
}

export function getBookByName(rawName) {
  if (!rawName || typeof rawName !== "string") return null;
  const key = normalizeLookupKey(rawName);
  return BOOK_LOOKUP.get(key) || BOOK_LOOKUP.get(key.replace(/\s+/g, "")) || null;
}

export function normalizeBookName(rawName) {
  return getBookByName(rawName)?.name || null;
}

export function normalizeTranslation(translation) {
  const candidate = String(translation || "").trim().toLowerCase();
  return TRANSLATION_SET.has(candidate) ? candidate : "web";
}

export function isValidTranslation(translation) {
  const candidate = String(translation || "").trim().toLowerCase();
  return TRANSLATION_SET.has(candidate);
}

/**
 * Parse a scripture reference such as "Ps 23:4", "1 Cor 13:4-7", "Rom 8", or "Song of Solomon 8:7 NIV".
 */
export function parseBibleReference(input) {
  if (!input || typeof input !== "string") return null;

  const cleaned = input
    .trim()
    .replace(TRANSLATION_SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–—]\s*(\d+))?)?$/);
  if (!match) return null;

  const [, rawBook, rawChapter, rawVerse, rawEndVerse] = match;
  const bookObj = getBookByName(rawBook);
  if (!bookObj) return null;

  const parsedChapter = Number.parseInt(rawChapter, 10);
  if (!Number.isInteger(parsedChapter) || parsedChapter < 1) return null;
  const chapter = Math.min(bookObj.chapters, parsedChapter);

  let verse = null;
  let endVerse = null;
  if (rawVerse !== undefined) {
    const parsedVerse = Number.parseInt(rawVerse, 10);
    if (Number.isInteger(parsedVerse) && parsedVerse >= 1) {
      verse = parsedVerse;
      if (rawEndVerse !== undefined) {
        const parsedEnd = Number.parseInt(rawEndVerse, 10);
        if (Number.isInteger(parsedEnd) && parsedEnd >= verse) {
          endVerse = parsedEnd;
        }
      }
    }
  }

  return {
    book: bookObj.name,
    chapter,
    verse,
    endVerse,
  };
}

/**
 * Resolve /bible URL search params into a validated target, defaulting to John 3 (WEB).
 */
export function resolveBibleParams({ book, chapter, verse, q, translation } = {}) {
  const validTranslation = normalizeTranslation(translation);

  if (q && typeof q === "string" && q.trim()) {
    const parsed = parseBibleReference(q);
    if (parsed) {
      return {
        book: parsed.book,
        chapter: parsed.chapter,
        verse: parsed.verse,
        translation: validTranslation,
        hasExplicitTarget: true,
      };
    }

    const bareBook = getBookByName(q);
    if (bareBook) {
      return {
        book: bareBook.name,
        chapter: 1,
        verse: null,
        translation: validTranslation,
        hasExplicitTarget: true,
      };
    }
  }

  if (book && typeof book === "string" && book.trim()) {
    const bookObj = getBookByName(book);
    if (bookObj) {
      const parsedCh = Number.parseInt(String(chapter ?? "1"), 10);
      const safeChapter = Number.isInteger(parsedCh) && parsedCh >= 1
        ? Math.min(bookObj.chapters, parsedCh)
        : 1;
      const parsedVerse = verse !== undefined && verse !== null
        ? Number.parseInt(String(verse), 10)
        : NaN;
      return {
        book: bookObj.name,
        chapter: safeChapter,
        verse: Number.isInteger(parsedVerse) && parsedVerse >= 1 ? parsedVerse : null,
        translation: validTranslation,
        hasExplicitTarget: true,
      };
    }
  }

  return {
    book: "John",
    chapter: 3,
    verse: null,
    translation: validTranslation,
    hasExplicitTarget: false,
  };
}

/**
 * Compute adjacent chapter (-1 prev, +1 next), returning null before Genesis 1 or after Revelation 22.
 */
export function getNeighborChapter(bookName, chapter, direction) {
  const bookObj = getBookByName(bookName);
  if (!bookObj) return null;

  const idx = BOOK_INDEX_BY_NAME.get(bookObj.name);
  if (idx === undefined) return null;

  const dir = direction < 0 ? -1 : 1;
  const parsedCh = Number.parseInt(String(chapter ?? "1"), 10);
  const safeCh = Number.isInteger(parsedCh) && parsedCh >= 1
    ? Math.min(bookObj.chapters, parsedCh)
    : 1;

  if (dir > 0) {
    if (safeCh < bookObj.chapters) {
      return { book: bookObj.name, chapter: safeCh + 1 };
    }
    if (idx + 1 < bibleBooks.length) {
      return { book: bibleBooks[idx + 1].name, chapter: 1 };
    }
    return null;
  }

  if (safeCh > 1) {
    return { book: bookObj.name, chapter: safeCh - 1 };
  }
  if (idx - 1 >= 0) {
    const prevBook = bibleBooks[idx - 1];
    return { book: prevBook.name, chapter: prevBook.chapters };
  }
  return null;
}
