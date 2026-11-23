import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";

const title = "Devotional Reading Plans";
const description =
  "Browse guided reading plans on Love, Gratitude, Happiness, Patience, Hope, Strength, and more, complete with daily reflections and highlights.";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/plans",
  },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: "/plans",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "PraisePage Devotional Reading Plans",
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

export default function PlansLayout({ children }) {
  return children;
}
