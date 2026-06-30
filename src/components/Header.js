"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMe, logout } from "@/app/actions/authActions";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getMe();
      setUser(currentUser);
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    window.location.href = "/";
  };

  // Add scroll event listener for header activation
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY >= 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle ESC keypress to close search
  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, []);

  // Handle theme toggling
  const toggleTheme = () => {
    if (document.body.classList.contains("light-theme")) {
      document.body.classList.remove("light-theme");
      localStorage.removeItem("currentTheme");
    } else {
      document.body.classList.add("light-theme");
      localStorage.setItem("currentTheme", "themeActive");
    }
  };

  return (
    <>
      {/* Header */}
      <header className={`header ${isScrolled ? "activated" : ""}`} id="header">
        <nav className="navbar container">
          <Link href="/">
            <h2 className="logo">ThanksGivings</h2>
          </Link>

          <div className={`menu ${isMenuOpen ? "activated" : ""}`} id="menu">
            <ul className="list">
              <li className="list-item">
                <Link
                  href="/"
                  className={`list-link ${pathname === "/" ? "current" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
              </li>
              <li className="list-item">
                <Link
                  href="/bible"
                  className={`list-link ${pathname === "/bible" ? "current" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Bible
                </Link>
              </li>
              <li className="list-item">
                <Link
                  href="/plans"
                  className={`list-link ${pathname === "/plans" ? "current" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Plans
                </Link>
              </li>
              <li className="list-item">
                <Link
                  href="/feed"
                  className={`list-link ${pathname === "/feed" ? "current" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Feed
                </Link>
              </li>
              <li className="list-item">
                <Link
                  href="/prayers"
                  className={`list-link ${pathname === "/prayers" ? "current" : ""}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Prayers
                </Link>
              </li>
              {user ? (
                <>
                  <li className="list-item">
                    <Link
                      href="/profile"
                      className={`list-link ${pathname === "/profile" ? "current" : ""}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </li>
                  <li className="list-item">
                    <button
                      onClick={handleLogout}
                      className="list-link"
                      style={{ cursor: "pointer", background: "none", border: "none", font: "inherit", padding: "0" }}
                    >
                      Log Out
                    </button>
                  </li>
                </>
              ) : (
                <li className="list-item">
                  <Link
                    href="/login"
                    className={`list-link ${pathname === "/login" ? "current" : ""}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log In
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="list list-right">
            <button
              className="btn place-items-center"
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              <i className="ri-sun-line sun-icon"></i>
              <i className="ri-moon-line moon-icon"></i>
            </button>

            <button
              className="btn place-items-center"
              id="search-icon"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open Search"
            >
              <i className="ri-search-line"></i>
            </button>

            <button
              className={`btn place-items-center screen-lg-hidden menu-toggle-icon ${
                isMenuOpen ? "activated" : ""
              }`}
              id="menu-toggle-icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              <i className="ri-menu-3-line open-menu-icon"></i>
              <i className="ri-close-line close-menu-icon"></i>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Sticky Bottom Navigation Tab Bar */}
      <div className="mobile-bottom-nav">
        <ul className="nav-list">
          <li className="nav-item">
            <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
              <i className="ri-home-5-line"></i>
              <span>Home</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/bible" className={`nav-link ${pathname === "/bible" ? "active" : ""}`}>
              <i className="ri-book-open-line"></i>
              <span>Bible</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/plans" className={`nav-link ${pathname === "/plans" ? "active" : ""}`}>
              <i className="ri-calendar-check-line"></i>
              <span>Plans</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/prayers" className={`nav-link ${pathname === "/prayers" ? "active" : ""}`}>
              <i className="ri-chat-heart-line"></i>
              <span>Prayers</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/feed" className={`nav-link ${pathname === "/feed" ? "active" : ""}`}>
              <i className="ri-message-3-line"></i>
              <span>Feed</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link href="/profile" className={`nav-link ${pathname === "/profile" ? "active" : ""}`}>
              <i className="ri-user-3-line"></i>
              <span>Profile</span>
            </Link>
          </li>
        </ul>
      </div>

      {/* Search popup */}
      <div
        className={`search-form-container container ${
          isSearchOpen ? "activated" : ""
        }`}
        id="search-form-container"
      >
        <div className="form-container-inner">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Search functionality is currently simulated.");
              setIsSearchOpen(false);
            }}
            className="form"
          >
            <input
              className="form-input"
              type="text"
              placeholder="What are you looking for?"
              autoFocus={isSearchOpen}
            />
            <button className="btn form-btn" type="submit">
              <i className="ri-search-line"></i>
            </button>
          </form>
          <span className="form-note">Or press ESC to close.</span>
        </div>

        <button
          className="btn form-close-btn place-items-center"
          id="form-close-btn"
          onClick={() => setIsSearchOpen(false)}
          aria-label="Close Search"
        >
          <i className="ri-close-line"></i>
        </button>
      </div>
    </>
  );
}
