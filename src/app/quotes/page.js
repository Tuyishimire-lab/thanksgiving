import { QUOTES_DATA, QUOTE_CATEGORIES } from "@/data/quotes";
import { SITE_URL, toAbsoluteUrl, serializeJsonLd } from "@/lib/seo";
import QuotesClient from "./QuotesClient";

export default async function QuotesPage({ searchParams }) {
  const resolved = await searchParams;
  const initialCategory =
    typeof resolved?.category === "string" && resolved.category.trim()
      ? resolved.category.trim()
      : "All";

  const schemaJson = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Inspirational Quotes",
            item: toAbsoluteUrl("/quotes"),
          },
        ],
      },
      {
        "@type": "ItemList",
        name: "Inspirational Quotes & Scriptures",
        numberOfItems: QUOTES_DATA.length,
        itemListElement: QUOTES_DATA.map((quote, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          item: {
            "@type": "Quotation",
            text: quote.text,
            about: quote.category,
            isBasedOn: quote.reference,
            image: toAbsoluteUrl(quote.image),
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemaJson) }}
      />
      <QuotesClient
        quotes={QUOTES_DATA}
        categories={QUOTE_CATEGORIES}
        initialCategory={initialCategory}
      />
    </>
  );
}
