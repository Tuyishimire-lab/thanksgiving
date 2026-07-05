import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer section">
      <div className="footer-container container d-grid">
        <div className="company-data">
          <Link href="/">
            <h2 className="logo">PraisePage</h2>
          </Link>
          <p className="company-description">
            Stories about faith and how it has impacted our lives. Share your PraisePage reflection and touch the hearts of others.
          </p>

          <ul className="list social-media">
            <li className="list-item">
              <a href="https://www.instagram.com/praisepage__?igsh=czB1MWpndDM5dmxl" className="list-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <i className="ri-instagram-line"></i>
              </a>
            </li>
            <li className="list-item">
              <a href="https://www.facebook.com/share/17UGpy6s6P/" className="list-link" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <i className="ri-facebook-circle-line"></i>
              </a>
            </li>
            <li className="list-item">
              <a href="https://x.com/praisepage_" className="list-link" aria-label="X (Twitter)" target="_blank" rel="noopener noreferrer">
                <i className="ri-twitter-line"></i>
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h6 className="title footer-title">Explore</h6>
          <ul className="footer-list list">
            <li className="list-item">
              <Link href="/bible" className="list-link">
                Bible Reader
              </Link>
            </li>
            <li className="list-item">
              <Link href="/plans" className="list-link">
                Reading Plans
              </Link>
            </li>
            <li className="list-item">
              <Link href="/feed" className="list-link">
                Community Feed
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h6 className="title footer-title">Support</h6>
          <ul className="footer-list list">
            <li className="list-item">
              <Link href="/" className="list-link">
                Home
              </Link>
            </li>
            <li className="list-item">
              <Link href="/contacts" className="list-link">
                Contact us
              </Link>
            </li>
            <li className="list-item">
              <Link href="/profile" className="list-link">
                My Profile
              </Link>
            </li>
          </ul>
        </div>

        <span className="copyright-notice">
          &copy; {new Date().getFullYear()} Ju & Vicky. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
