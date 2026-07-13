import { bibleBooks } from "@/data/bibleBooks";
import BibleReaderClient from "./BibleReaderClient";

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const book = resolvedSearchParams?.book;
  const chapter = resolvedSearchParams?.chapter;

  if (book) {
    const matchedBook = bibleBooks.find(
      (b) => b.name.toLowerCase() === book.toLowerCase()
    );
    if (matchedBook) {
      const ch = parseInt(chapter, 10) || 1;
      const title = `${matchedBook.name} ${ch} | PraisePage Bible`;
      const description = `Read and reflect on ${matchedBook.name} Chapter ${ch} in the PraisePage Bible Reader. Highlight verses, write daily reflections, and grow in faith.`;
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://praisepage.com/bible?book=${encodeURIComponent(matchedBook.name)}&chapter=${ch}`,
          images: [
            {
              url: "/assets/images/praisepage.jpeg",
              width: 1200,
              height: 630,
              alt: "PraisePage Bible",
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
        },
      };
    }
  }

  return {
    title: "Bible Reader | PraisePage",
    description: "Read, search, highlight, and write reflections on Holy Scriptures of gratitude and faith.",
  };
}

export default async function BiblePage() {
  return <BibleReaderClient />;
}
