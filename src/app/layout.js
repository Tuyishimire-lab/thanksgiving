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
});

export const metadata = {
  title: "ThanksGivings | Home",
  description: "Stories about faith and how it has impacted our lives.",
  icons: {
    icon: "/assets/images/thanksgivings.jpeg",
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
