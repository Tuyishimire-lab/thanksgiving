import { Poppins, Playfair_Display, Caveat, Lora } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import NotificationManager from "@/components/NotificationManager";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_URL, SOCIAL_PROFILES, serializeJsonLd } from "@/lib/seo";




const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-family",
  display: "swap",
  preload: true,
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

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-family-reader",
  display: "swap",
  preload: false,
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | PraisePage",
    default: "PraisePage | A Sanctuary of Gratitude & Faith",
  },
  description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "PraisePage", url: SITE_URL }],
  creator: "PraisePage",
  publisher: "PraisePage",
  category: "Religion & Spirituality",
  keywords: [
    "PraisePage",
    "Christian devotionals",
    "Bible reader",
    "gratitude journal",
    "community testimonies",
    "prayer board",
    "scripture quotes",
    "daily faith",
  ],
  icons: {
    icon: "/assets/images/praisepage.jpeg",
  },
  openGraph: {
    title: "PraisePage | A Sanctuary of Gratitude & Faith",
    description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
    url: SITE_URL,
    siteName: "PraisePage",
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

export default function RootLayout({ children }) {

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PraisePage",
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/bible?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PraisePage",
    "url": SITE_URL,
    "logo": `${SITE_URL}/assets/images/praisepage.jpeg`,
    "description": "A Christian sanctuary offering free Bible reading, guided devotional plans, gratitude journaling, prayer requests, and faith testimonies.",
    "sameAs": SOCIAL_PROFILES
  };

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "PraisePage",
    "url": SITE_URL,
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web, PWA",
    "isAccessibleForFree": true,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${caveat.variable} ${lora.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webApplicationSchema) }}
        />
        <ThemeProvider>
          <Header />
          <main className="section-header-offset" style={{ minHeight: "75vh" }}>
            {children}
          </main>
          <Footer />
          <PwaInstallPrompt />
          <NotificationManager />
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-C8TS9EERMJ" />
    </html>
  );
}
