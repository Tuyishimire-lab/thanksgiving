import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

const title = "Inspirational Quotes & Scriptures";
const description =
  "Browse beautiful cards of daily reminders, scriptures, and motivational quotes to uplift your spirit.";

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
        url: DEFAULT_OG_IMAGE,
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
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function QuotesLayout({ children }) {
  return children;
}
