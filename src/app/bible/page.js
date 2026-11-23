import { MOOD_TAGS } from "@/data/verseMoods";
import { verses as allStaticVerses } from "@/data/verses";
import { MOOD_META, resolveBibleParams } from "@/data/bibleParser";
import { fetchBibleChapter } from "@/data/bibleApi";
import { getMe } from "@/app/actions/authActions";
import { getNotebookData } from "@/app/actions/dbActions";
import { SITE_URL } from "@/lib/seo";
import BibleReaderClient from "./BibleReaderClient";

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const target = resolveBibleParams(resolvedSearchParams);
  const ogImageUrl = `/api/og?type=bible&book=${encodeURIComponent(
    target.book
  )}&chapter=${target.chapter}&translation=${encodeURIComponent(
    target.translation
  )}`;

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
        url: `${SITE_URL}${canonicalPath}`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | PraisePage`,
        description,
        images: [ogImageUrl],
      },
    };
  }

  const defaultTitle = "Bible Reader";
  const defaultDescription =
    "Read, search, highlight, and write reflections on Holy Scriptures of gratitude and faith.";

  return {
    title: defaultTitle,
    description: defaultDescription,
    alternates: {
      canonical: "/bible",
    },
    openGraph: {
      title: `${defaultTitle} | PraisePage`,
      description: defaultDescription,
      url: `${SITE_URL}/bible`,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${target.book} ${target.chapter} (${target.translation.toUpperCase()}) — PraisePage Bible Reader`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${defaultTitle} | PraisePage`,
      description: defaultDescription,
      images: [ogImageUrl],
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
