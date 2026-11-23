import { SITE_NAME } from "@/lib/seo";

const title = "Inspirational Quotes & Scriptures";
const description =
  "Browse beautiful cards of daily reminders, scriptures, and motivational quotes to uplift your spirit.";
const ogImageUrl = "/api/og?type=quotes";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/quotes",
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: "/quotes",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "PraisePage Scripture Quotes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [ogImageUrl],
  },
};

export default function QuotesLayout({ children }) {
  return children;
}
