import { Poppins, Playfair_Display, Caveat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { headers } from "next/headers";


const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-family",
  display: "swap",
  preload: false,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-family-serif",
  display: "swap",
  preload: false,
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-family-cursive",
  display: "swap",
  preload: false,
});

export const metadata = {
  metadataBase: new URL("https://praisepage.com"),
  title: {
    template: "%s | PraisePage",
    default: "PraisePage | A Sanctuary of Gratitude & Faith",
  },
  description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
  icons: {
    icon: "/assets/images/praisepage.jpeg",
  },
  openGraph: {
    title: "PraisePage | A Sanctuary of Gratitude & Faith",
    description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
    images: [
      {
        url: "/assets/images/praisepage.jpeg",
        width: 1200,
        height: 630,
        alt: "PraisePage Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PraisePage | A Sanctuary of Gratitude & Faith",
    description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
    images: ["/assets/images/praisepage.jpeg"],
  },
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const canonicalUrl = `https://praisepage.com${pathname}`;

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PraisePage",
    "url": "https://praisepage.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://praisepage.com/bible?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PraisePage",
    "url": "https://praisepage.com",
    "logo": "https://praisepage.com/assets/images/praisepage.jpeg"
  };

  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${caveat.variable}`}>
      <head>
        <link rel="canonical" href={canonicalUrl} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <ThemeProvider>
          <Header />
          <main className="section-header-offset" style={{ minHeight: "75vh" }}>
            {children}
          </main>
          <Footer />
          <PwaInstallPrompt />
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-C8TS9EERMJ" />
      <Analytics />
    </html>
  );
}
