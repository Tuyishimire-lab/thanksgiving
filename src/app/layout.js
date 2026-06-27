import { Poppins } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-family", // Bind to custom property used in main.css
  display: "swap",
  preload: false,
});

export const metadata = {
  metadataBase: new URL("https://thanksgivings.vercel.app"),
  title: {
    template: "%s | ThanksGivings",
    default: "ThanksGivings | A Sanctuary of Gratitude & Faith",
  },
  description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
  icons: {
    icon: "/assets/images/thanksgivings.jpeg",
  },
  openGraph: {
    title: "ThanksGivings | A Sanctuary of Gratitude & Faith",
    description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
    images: [
      {
        url: "/assets/images/thanksgivings.jpeg",
        width: 1200,
        height: 630,
        alt: "ThanksGivings Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThanksGivings | A Sanctuary of Gratitude & Faith",
    description: "Explore devotional plans, scripture highlights, community testimonies, and reflections to anchor your life in gratitude and faith.",
    images: ["/assets/images/thanksgivings.jpeg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <ThemeProvider>
          <Header />
          <main className="section-header-offset" style={{ minHeight: "75vh" }}>
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
