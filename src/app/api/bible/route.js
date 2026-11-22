import { NextResponse } from "next/server";
import { getBookByName, isValidTranslation, normalizeTranslation } from "@/data/bibleParser";
import { fetchBibleChapter, fetchVerseAcrossTranslations } from "@/data/bibleApi";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request) {
  const searchParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams;
  const rawBook = searchParams.get("book");
  const rawChapter = searchParams.get("chapter");
  const rawTranslation = searchParams.get("translation");
  const compare = searchParams.get("compare");
  const rawVerse = searchParams.get("verse");
  const rawEndVerse = searchParams.get("endVerse");

  const bookObj = getBookByName(rawBook);
  if (!bookObj) {
    return NextResponse.json({ error: "Invalid Bible book." }, { status: 400 });
  }

  const chapterStr = String(rawChapter ?? "").trim();
  const chapterNum = /^\d+$/.test(chapterStr) ? Number.parseInt(chapterStr, 10) : NaN;
  if (!Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > bookObj.chapters) {
    return NextResponse.json({ error: "Invalid chapter number." }, { status: 400 });
  }

  if (rawTranslation !== null && rawTranslation.trim() !== "" && !isValidTranslation(rawTranslation)) {
    return NextResponse.json({ error: "Unsupported translation." }, { status: 400 });
  }
  const translation = normalizeTranslation(rawTranslation);

  if (compare === "true") {
    const verseStr = String(rawVerse ?? "").trim();
    const verseNum = /^\d+$/.test(verseStr) ? Number.parseInt(verseStr, 10) : NaN;
    if (!Number.isInteger(verseNum) || verseNum < 1) {
      return NextResponse.json({ error: "Invalid verse number for comparison." }, { status: 400 });
    }

    let endVerseNum = null;
    if (rawEndVerse !== null && rawEndVerse.trim() !== "") {
      const endStr = rawEndVerse.trim();
      const parsedEnd = /^\d+$/.test(endStr) ? Number.parseInt(endStr, 10) : NaN;
      if (!Number.isInteger(parsedEnd) || parsedEnd < verseNum) {
        return NextResponse.json({ error: "Invalid endVerse number." }, { status: 400 });
      }
      endVerseNum = parsedEnd;
    }

    const comparison = await fetchVerseAcrossTranslations(
      bookObj.name,
      chapterNum,
      verseNum,
      endVerseNum
    );
    if (!comparison || comparison.comparisons.length === 0) {
      return NextResponse.json(
        { error: "Unable to load translation comparison." },
        { status: 502 }
      );
    }

    return NextResponse.json(comparison, { status: 200, headers: CACHE_HEADERS });
  }

  const chapterData = await fetchBibleChapter(bookObj.name, chapterNum, translation);
  if (!chapterData) {
    return NextResponse.json(
      { error: "Unable to fetch scripture passage." },
      { status: 502 }
    );
  }

  return NextResponse.json(chapterData, { status: 200, headers: CACHE_HEADERS });
}
