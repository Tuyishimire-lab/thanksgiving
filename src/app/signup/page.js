"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup, getMe, loginWithGoogle } from "@/app/actions/authActions";
import { syncAndClearLocalData } from "@/data/syncHelper";

const DEMO_ACCOUNTS = [
  { name: "John Doe", email: "john.doe@example.com" },
  { name: "Jane Smith", email: "jane.smith@example.com" },
  { name: "Admin User", email: "admin@praisepage.com" },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoCustomEmail, setDemoCustomEmail] = useState("");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const tokenClientRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      const user = await getMe();
      if (!active) return;
      if (user) {
        router.push("/profile");
      } else {
        setCheckingAuth(false);
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!showDemoModal || typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => {
      if (e.key === "Escape") setShowDemoModal(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [showDemoModal]);

  const handleGoogleSuccess = useCallback(
    async (emailToUse, nameToUse, tokenToUse = "demo-token", tokenType = "id-token") => {
      setError("");
      setLoading(true);

      try {
        const res = await loginWithGoogle(tokenToUse, emailToUse, nameToUse, tokenType);
        if (res.error) {
          setError(res.error);
          setLoading(false);
        } else {
          await syncAndClearLocalData();
          window.location.href = "/profile";
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred during Google Sign-In.");
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setError(tokenResponse.error_description || "Google Authentication failed.");
              return;
            }

            setLoading(true);
            try {
              const userInfoRes = await fetch(
                `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
              );
              if (!userInfoRes.ok) {
                throw new Error("Failed to fetch user info from Google");
              }
              const userInfo = await userInfoRes.json();
              await handleGoogleSuccess(
                userInfo.email,
                userInfo.name,
                tokenResponse.access_token,
                "access-token"
              );
            } catch (err) {
              console.error("Error during Google OAuth flow:", err);
              setError("Google login failed. Please try again.");
              setLoading(false);
            }
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleClientId, handleGoogleSuccess]);

  const handleGoogleClick = () => {
    if (googleClientId && tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
    } else {
      setShowDemoModal(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await signup(name, email, password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        await syncAndClearLocalData();
        window.location.href = "/profile";
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <section className="sanc-page">
        <div className="sanc-auth-wrap" style={{ color: "var(--sanc-muted)" }}>
          Checking session...
        </div>
      </section>
    );
  }

  const demoModalContent =
    showDemoModal && process.env.NODE_ENV !== "production" && typeof document !== "undefined"
      ? createPortal(
          <div
            className="sanc-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-signup-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDemoModal(false);
            }}
          >
            <div className="sanc-modal-dialog narrow">
              <div className="sanc-modal-header">
                <div>
                  <span className="sanc-eyebrow">Local Development</span>
                  <h3 id="demo-signup-title" className="sanc-modal-title">
                    Google Sign-In (Demo)
                  </h3>
                </div>
                <button
                  type="button"
                  className="sanc-modal-close"
                  onClick={() => setShowDemoModal(false)}
                  aria-label="Close modal"
                >
                  <i className="ri-close-line" aria-hidden="true"></i>
                </button>
              </div>

              <div className="sanc-modal-body">
                <p style={{ fontSize: "1.32rem", color: "var(--sanc-muted)", margin: 0 }}>
                  Select a test account to simulate the Google authentication flow.
                </p>

                <div className="sanc-stack" style={{ gap: "0.9rem" }}>
                  {DEMO_ACCOUNTS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      className="sanc-card-muted sanc-card-hover"
                      onClick={() => {
                        setShowDemoModal(false);
                        handleGoogleSuccess(u.email, u.name);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "0.25rem",
                        textAlign: "left",
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--sanc-text)" }}>
                        {u.name}
                      </span>
                      <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                        {u.email}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="sanc-field">
                  <label htmlFor="demo-custom-email" className="sanc-label">
                    Or Enter Custom Email
                  </label>
                  <div style={{ display: "flex", gap: "0.85rem" }}>
                    <input
                      id="demo-custom-email"
                      type="email"
                      className="sanc-input"
                      placeholder="custom@example.com"
                      value={demoCustomEmail}
                      onChange={(e) => setDemoCustomEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = demoCustomEmail.trim();
                          if (val) {
                            setShowDemoModal(false);
                            handleGoogleSuccess(val, val.split("@")[0]);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="sanc-btn-primary sanc-btn-sm"
                      onClick={() => {
                        const val = demoCustomEmail.trim();
                        if (val) {
                          setShowDemoModal(false);
                          handleGoogleSuccess(val, val.split("@")[0]);
                        }
                      }}
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>

              <div className="sanc-modal-footer">
                <button
                  type="button"
                  className="sanc-btn-secondary sanc-btn-sm"
                  onClick={() => setShowDemoModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <section className="sanc-page">
      <div className="sanc-auth-wrap">
        <div className="sanc-auth-card">
          <div style={{ textAlign: "center" }}>
            <span className="sanc-eyebrow">PraisePage Sanctuary</span>
            <h1 className="sanc-title" style={{ fontSize: "clamp(2.4rem, 3vw, 3rem)" }}>
              Create Account
            </h1>
            <p className="sanc-subtitle" style={{ marginInline: "auto", fontSize: "1.4rem" }}>
              Join the community and keep your gratitude journal synced across devices.
            </p>
          </div>

          {error && (
            <div className="sanc-alert error" role="alert">
              <i className="ri-error-warning-line" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          {(googleClientId || process.env.NODE_ENV !== "production") && (
            <>
              <button type="button" onClick={handleGoogleClick} className="sanc-google-btn">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.57 2.69-3.88 2.69-6.57z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.72H.95v2.3C2.43 15.89 5.5 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.99H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.01l3-2.3z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A8.99 8.99 0 0 0 9 0C5.5 0 2.43 2.11.95 5l3 2.3c.71-2.14 2.7-3.72 5.05-3.72z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="sanc-divider">
                <span>or</span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="sanc-stack" style={{ gap: "1.65rem" }}>
            <div className="sanc-field">
              <label htmlFor="name" className="sanc-label">
                Full Name
              </label>
              <div className="sanc-input-wrap">
                <i className="ri-user-line sanc-input-icon" aria-hidden="true"></i>
                <input
                  id="name"
                  type="text"
                  className="sanc-input has-icon"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="sanc-field">
              <label htmlFor="email" className="sanc-label">
                Email Address
              </label>
              <div className="sanc-input-wrap">
                <i className="ri-mail-line sanc-input-icon" aria-hidden="true"></i>
                <input
                  id="email"
                  type="email"
                  className="sanc-input has-icon"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="sanc-field">
              <label htmlFor="password" className="sanc-label">
                Password
              </label>
              <div className="sanc-input-wrap">
                <i className="ri-lock-line sanc-input-icon" aria-hidden="true"></i>
                <input
                  id="password"
                  type="password"
                  className="sanc-input has-icon"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="sanc-field">
              <label htmlFor="confirmPassword" className="sanc-label">
                Confirm Password
              </label>
              <div className="sanc-input-wrap">
                <i className="ri-lock-line sanc-input-icon" aria-hidden="true"></i>
                <input
                  id="confirmPassword"
                  type="password"
                  className="sanc-input has-icon"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sanc-btn-primary"
              style={{ width: "100%", marginTop: "0.4rem" }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontSize: "1.32rem",
              color: "var(--sanc-muted)",
              margin: 0,
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--sanc-emerald)",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Log In
            </Link>
          </p>
        </div>
      </div>

      {demoModalContent}
    </section>
  );
}
