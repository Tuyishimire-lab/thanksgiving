import Link from "next/link";

export default function Footer() {
  return (
    <footer className="sanc-footer">
      <div className="sanc-footer-grid">
        <div>
          <Link href="/" className="sanc-brand">
            PraisePage
          </Link>
          <p
            className="sanc-subtitle"
            style={{ marginTop: "1.1rem", fontSize: "1.35rem", maxWidth: "34rem" }}
          >
            Stories about faith and how it has impacted our lives. Share your PraisePage reflection and touch the hearts of others.
          </p>

          <div className="sanc-social-row" style={{ marginTop: "1.8rem" }}>
            <a
              href="https://www.instagram.com/praisepage__?igsh=czB1MWpndDM5dmxl"
              className="sanc-social-btn"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-instagram-line" aria-hidden="true"></i>
            </a>
            <a
              href="https://www.facebook.com/share/17UGpy6s6P/"
              className="sanc-social-btn"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-facebook-circle-line" aria-hidden="true"></i>
            </a>
            <a
              href="https://x.com/praisepage_"
              className="sanc-social-btn"
              aria-label="X (Twitter)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-twitter-line" aria-hidden="true"></i>
            </a>
          </div>
        </div>

        <div>
          <h6 className="sanc-label" style={{ marginBottom: "1.2rem" }}>
            Explore
          </h6>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "1.36rem" }}>
            <li>
              <Link href="/bible">Bible Reader</Link>
            </li>
            <li>
              <Link href="/plans">Reading Plans</Link>
            </li>
            <li>
              <Link href="/topics">Faith Topics</Link>
            </li>
            <li>
              <Link href="/verse-of-the-day">Verse of the Day</Link>
            </li>
            <li>
              <Link href="/quotes">Daily Quotes</Link>
            </li>
          </ul>
        </div>

        <div>
          <h6 className="sanc-label" style={{ marginBottom: "1.2rem" }}>
            Community
          </h6>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "1.36rem" }}>
            <li>
              <Link href="/feed">Community Feed</Link>
            </li>
            <li>
              <Link href="/prayers">Prayer Wall</Link>
            </li>
            <li>
              <Link href="/share">Share PraisePage</Link>
            </li>
            <li>
              <a href="/rss.xml">RSS Feed</a>
            </li>
          </ul>
        </div>

        <div>
          <h6 className="sanc-label" style={{ marginBottom: "1.2rem" }}>
            Support
          </h6>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "1.36rem" }}>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/profile">My Profile</Link>
            </li>
            <li>
              <Link href="/contacts">Contact Us</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy Policy</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="sanc-footer-bottom">
        <span>&copy; {new Date().getFullYear()} Ju &amp; Vicky. All rights reserved.</span>
        <span>A sanctuary for daily scripture, prayer &amp; gratitude.</span>
      </div>
    </footer>
  );
}
