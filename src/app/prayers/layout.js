import { SITE_NAME } from "@/lib/seo";

const title = "Prayer Board";
const description =
  "Share prayer requests, stand in faith with others, and support the community through active prayer.";
const ogImageUrl = "/api/og?type=prayers";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/prayers",
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: "/prayers",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "PraisePage Prayer Board",
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

export default function PrayersLayout({ children }) {
  return children;
}
