"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMe, logout } from "@/app/actions/authActions";
import { parseBibleReference } from "@/data/bibleParser";

const QUICK_SCRIPTURES = [
  "Psalm 23",
  "John 3:16",
  "Romans 8:28",
  "Proverbs 3:5",
  "Philippians 4:6",
  "Isaiah 41:10",
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const currentUser = await getMe();
      if (!cancelled) {
        setUser(currentUser);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setIsMenuOpen(false);
    window.location.href = "/";
  };

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY >= 15;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isSearchOpen && !isMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, isMenuOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, [isSearchOpen]);

  const toggleTheme = () => {
    if (document.body.classList.contains("light-theme")) {
      document.body.classList.remove("light-theme");
      localStorage.removeItem("currentTheme");
    } else {
      document.body.classList.add("light-theme");
      localStorage.setItem("currentTheme", "themeActive");
    }
  };

  const isNavActive = (href) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navigateSearch = (rawQuery) => {
    const trimmed = String(rawQuery || "").trim();
    if (!trimmed) return;

    const parsed = parseBibleReference(trimmed);
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setSearchQuery("");

    if (parsed) {
      const params = new URLSearchParams({
        book: parsed.book,
        chapter: String(parsed.chapter),
      });
      if (parsed.verse) {
        params.set("verse", String(parsed.verse));
      }
      router.push(`/bible?${params.toString()}`);
    } else {
      router.push(`/bible?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/bible", label: "Bible" },
    { href: "/plans", label: "Plans" },
    { href: "/feed", label: "Feed" },
    { href: "/prayers", label: "Prayers" },
  ];

  return (
    <>
      <header className={`sanc-header${isScrolled ? " activated" : ""}`} id="header">
        <nav className="sanc-navbar" aria-label="Main Navigation">
          <Link href="/" className="sanc-brand" onClick={() => setIsMenuOpen(false)}>
            PraisePage
          </Link>

          <div className={`sanc-nav-menu${isMenuOpen ? " activated" : ""}`} id="menu">
            <ul className="sanc-nav-list">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`sanc-nav-link${isNavActive(item.href) ? " current" : ""}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {user ? (
                <>
                  {user.role === "admin" && (
                    <li>
                      <Link
                        href="/admin"
                        className={`sanc-nav-link admin${isNavActive("/admin") ? " current" : ""}`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link
                      href="/profile"
                      className={`sanc-nav-link${isNavActive("/profile") ? " current" : ""}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="sanc-nav-link"
                    >
                      Log Out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    href="/login"
                    className={`sanc-nav-link${isNavActive("/login") ? " current" : ""}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log In
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="sanc-nav-actions">
            <button
              type="button"
              className="sanc-icon-btn"
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              <i
                className="ri-sun-line sun-icon"
                style={{ fontSize: "1.75rem", lineHeight: 1 }}
                aria-hidden="true"
              ></i>
              <i
                className="ri-moon-line moon-icon"
                style={{ fontSize: "1.75rem", lineHeight: 1 }}
                aria-hidden="true"
              ></i>
            </button>

            <button
              type="button"
              className="sanc-icon-btn"
              id="search-icon"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open Scripture Search"
            >
              <i
                className="ri-search-line"
                style={{ fontSize: "1.75rem", lineHeight: 1 }}
                aria-hidden="true"
              ></i>
            </button>

            <button
              type="button"
              className={`sanc-icon-btn screen-lg-hidden menu-toggle-icon${isMenuOpen ? " activated" : ""}`}
              id="menu-toggle-icon"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label="Toggle Menu"
              aria-expanded={isMenuOpen}
            >
              <i
                className="ri-menu-3-line open-menu-icon"
                style={{ fontSize: "1.8rem", lineHeight: 1 }}
                aria-hidden="true"
              ></i>
              <i
                className="ri-close-line close-menu-icon"
                style={{ fontSize: "1.8rem", lineHeight: 1 }}
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </nav>
      </header>

      <nav className="sanc-mobile-nav" aria-label="Mobile Navigation">
        <ul className="nav-list">
          <li className="nav-item">
            <Link href="/" className={`nav-link${isNavActive("/") ? " active" : ""}`}>
              <i className="ri-home-5-line" aria-hidden="true"></i>
              <span>Home</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/bible" className={`nav-link${isNavActive("/bible") ? " active" : ""}`}>
              <i className="ri-book-open-line" aria-hidden="true"></i>
              <span>Bible</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/plans" className={`nav-link${isNavActive("/plans") ? " active" : ""}`}>
              <i className="ri-calendar-check-line" aria-hidden="true"></i>
              <span>Plans</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/prayers" className={`nav-link${isNavActive("/prayers") ? " active" : ""}`}>
              <i className="ri-chat-heart-line" aria-hidden="true"></i>
              <span>Prayers</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/feed" className={`nav-link${isNavActive("/feed") ? " active" : ""}`}>
              <i className="ri-message-3-line" aria-hidden="true"></i>
              <span>Feed</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/profile" className={`nav-link${isNavActive("/profile") ? " active" : ""}`}>
              <i className="ri-user-3-line" aria-hidden="true"></i>
              <span>Profile</span>
            </Link>
          </li>
          {user && user.role === "admin" && (
            <li className="nav-item">
              <Link href="/admin" className={`nav-link admin${isNavActive("/admin") ? " active" : ""}`}>
                <i className="ri-shield-user-line" aria-hidden="true"></i>
                <span>Admin</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {isSearchOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="sanc-search-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Search Scripture"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSearchOpen(false);
              }
            }}
          >
            <div className="sanc-search-dialog">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1.2rem",
                }}
              >
                <div>
                  <span className="sanc-eyebrow">Scripture Search</span>
                  <h2 className="sanc-modal-title">Jump to a Passage or Keyword</h2>
                </div>
                <button
                  type="button"
                  className="sanc-modal-close"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close Search"
                >
                  <i className="ri-close-line" aria-hidden="true"></i>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigateSearch(searchQuery);
                }}
                className="sanc-search-form"
              >
                <div className="sanc-input-wrap" style={{ flex: 1, minWidth: 0 }}>
                  <i className="ri-search-line sanc-input-icon" aria-hidden="true"></i>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="sanc-input has-icon"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Try Psalm 23, John 3:16, Rom 8, or grace..."
                    aria-label="Search scripture reference or keyword"
                  />
                </div>
                <button type="submit" className="sanc-btn-primary">
                  <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  Go
                </button>
              </form>

              <div className="sanc-search-quick">
                {QUICK_SCRIPTURES.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    className="sanc-pill"
                    onClick={() => navigateSearch(ref)}
                  >
                    {ref}
                  </button>
                ))}
              </div>

              <p className="sanc-subtitle" style={{ margin: 0, fontSize: "1.22rem" }}>
                Enter any book &amp; chapter reference to open it directly, or search by keyword. Press Esc to close.
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
