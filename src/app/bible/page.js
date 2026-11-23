import { MOOD_TAGS } from "@/data/verseMoods";
import { verses as allStaticVerses } from "@/data/verses";
import { MOOD_META, resolveBibleParams } from "@/data/bibleParser";
import { fetchBibleChapter } from "@/data/bibleApi";
import { getMe } from "@/app/actions/authActions";
import { getNotebookData } from "@/app/actions/dbActions";
import BibleReaderClient from "./BibleReaderClient";

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const target = resolveBibleParams(resolvedSearchParams);

  if (target.hasExplicitTarget) {
    const title = `${target.book} ${target.chapter} (${target.translation.toUpperCase()}) Bible`;
    const description = `Read and reflect on ${target.book} Chapter ${target.chapter} (${target.translation.toUpperCase()}) in the PraisePage Bible Reader. Highlight verses, write daily reflections, and grow in faith.`;
    const canonicalPath = `/bible?book=${encodeURIComponent(target.book)}&chapter=${target.chapter}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${title} | PraisePage`,
        description,
        url: `https://praisepage.com${canonicalPath}`,
        images: [
          {
            url: "/assets/images/praisepage.jpeg",
            width: 1200,
            height: 630,
            alt: "PraisePage Bible"
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | PraisePage`,
        description
      }
    };
  }

  return {
    title: "Bible Reader",
    description: "Read, search, highlight, and write reflections on Holy Scriptures of gratitude and faith.",
    alternates: {
      canonical: "/bible",
    },
  };
}

export default async function BiblePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialTarget = resolveBibleParams(resolvedSearchParams);

  const [initialChapterData, initialUser, notebook] = await Promise.all([
    fetchBibleChapter(initialTarget.book, initialTarget.chapter, initialTarget.translation),
    getMe(),
    getNotebookData()
  ]);

  const moodVerses = Object.entries(MOOD_TAGS).map(([key, refs]) => ({
    key,
    label: MOOD_META[key]?.label || key,
    icon: MOOD_META[key]?.icon || "ri-book-open-line",
    verses: refs.map((ref) => {
      const match = allStaticVerses.find((v) => v.tag.includes(ref));
      return match
        ? { verse: match.verse, tag: match.tag }
        : { verse: "Find comfort and strength in God's promises.", tag: ref };
    })
  }));

  return (
    <BibleReaderClient
      initialTarget={initialTarget}
      initialChapterData={initialChapterData}
      initialUser={initialUser}
      initialHighlights={notebook?.highlights || {}}
      initialNotes={notebook?.notes || {}}
      moodVerses={moodVerses}
    />
  );
}
