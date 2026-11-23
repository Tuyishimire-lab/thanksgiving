import { SITE_NAME } from "@/lib/seo";

const title = "Community Feed";
const description =
  "Read, reflect, and share inspiring stories and testimonies of faith and gratitude from our community.";
const ogImageUrl = "/api/og?type=feed";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: "/feed",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "PraisePage Community Feed",
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

export default function FeedLayout({ children }) {
  return children;
}
