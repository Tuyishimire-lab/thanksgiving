import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

const title = "Prayer Board";
const description =
  "Share prayer requests, stand in faith with others, and support the community through active prayer.";

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
        url: DEFAULT_OG_IMAGE,
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
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function PrayersLayout({ children }) {
  return children;
}
