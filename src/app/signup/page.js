"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup, getMe, loginWithGoogle } from "@/app/actions/authActions";
import { syncLocalData } from "@/app/actions/dbActions";

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
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const tokenClientRef = useRef(null);

  // If already logged in, redirect to profile immediately
  useEffect(() => {
    async function checkAuth() {
      const user = await getMe();
      if (user) {
        router.push("/profile");
      } else {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // Load Google SDK if client ID is configured
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
              const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`);
              if (!userInfoRes.ok) {
                throw new Error("Failed to fetch user info from Google");
              }
              const userInfo = await userInfoRes.json();
              await handleGoogleSuccess(userInfo.email, userInfo.name, tokenResponse.access_token, "access-token");
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
      document.body.removeChild(script);
    };
  }, [googleClientId]);

  const handleGoogleSuccess = async (emailToUse, nameToUse, tokenToUse = "demo-token", tokenType = "id-token") => {
    setError("");
    setLoading(true);

    try {
      const res = await loginWithGoogle(tokenToUse, emailToUse, nameToUse, tokenType);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        // Sync local storage state to db
        if (typeof window !== "undefined") {
          try {
            const savedPlans = JSON.parse(localStorage.getItem("praisepage_saved_plans") || "[]");
            const plansProgress = JSON.parse(localStorage.getItem("praisepage_plans_progress") || "{}");
            const reflections = JSON.parse(localStorage.getItem("praisepage_plan_reflections") || "{}");
            const highlights = JSON.parse(localStorage.getItem("praisepage_highlights") || "{}");
            const notes = JSON.parse(localStorage.getItem("praisepage_notes") || "{}");
            const localTestimonies = JSON.parse(localStorage.getItem("praisepage_local_testimonies") || "[]");

            const hasLocalData = 
              savedPlans.length > 0 ||
              Object.keys(plansProgress).length > 0 ||
              Object.keys(reflections).length > 0 ||
              Object.keys(highlights).length > 0 ||
              Object.keys(notes).length > 0 ||
              localTestimonies.length > 0;

            if (hasLocalData) {
              await syncLocalData({
                savedPlans,
                plansProgress,
                reflections,
                highlights,
                notes,
                localTestimonies
              });

              localStorage.removeItem("praisepage_saved_plans");
              localStorage.removeItem("praisepage_plans_progress");
              localStorage.removeItem("praisepage_plan_reflections");
              localStorage.removeItem("praisepage_highlights");
              localStorage.removeItem("praisepage_notes");
              localStorage.removeItem("praisepage_local_testimonies");
            }
          } catch (storageError) {
            console.error("Local data sync failed: ", storageError);
          }
        }

        router.push("/profile");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during Google Sign-In.");
      setLoading(false);
    }
  };

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
        // Sync local storage state to db
        if (typeof window !== "undefined") {
          try {
            const savedPlans = JSON.parse(localStorage.getItem("praisepage_saved_plans") || "[]");
            const plansProgress = JSON.parse(localStorage.getItem("praisepage_plans_progress") || "{}");
            const reflections = JSON.parse(localStorage.getItem("praisepage_plan_reflections") || "{}");
            const highlights = JSON.parse(localStorage.getItem("praisepage_highlights") || "{}");
            const notes = JSON.parse(localStorage.getItem("praisepage_notes") || "{}");
            const localTestimonies = JSON.parse(localStorage.getItem("praisepage_local_testimonies") || "[]");

            const hasLocalData = 
              savedPlans.length > 0 ||
              Object.keys(plansProgress).length > 0 ||
              Object.keys(reflections).length > 0 ||
              Object.keys(highlights).length > 0 ||
              Object.keys(notes).length > 0 ||
              localTestimonies.length > 0;

            if (hasLocalData) {
              await syncLocalData({
                savedPlans,
                plansProgress,
                reflections,
                highlights,
                notes,
                localTestimonies
              });

              // Clean up local items since they are now stored in SQLite
              localStorage.removeItem("praisepage_saved_plans");
              localStorage.removeItem("praisepage_plans_progress");
              localStorage.removeItem("praisepage_plan_reflections");
              localStorage.removeItem("praisepage_highlights");
              localStorage.removeItem("praisepage_notes");
              localStorage.removeItem("praisepage_local_testimonies");
            }
          } catch (storageError) {
            console.error("Local data sync failed: ", storageError);
          }
        }

        router.push("/profile");
        // Force refresh to reload header state
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="place-items-center" style={{ width: "100%", height: "80vh", color: "var(--light-color-alt)" }}>
        Checking session...
      </div>
    );
  }

  return (
    <section className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", paddingBlock: "4rem" }}>
      <div 
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "var(--secondary-background-color)",
          padding: "4rem 3rem",
          borderRadius: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          border: "1px solid var(--transparent-light-color)",
          display: "flex",
          flexDirection: "column",
          gap: "2.5rem"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "var(--font-size-md)", color: "var(--light-color)", fontWeight: "700", marginBottom: "0.5rem" }}>
            Create Account
          </h2>
          <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
            Join the community and start your gratitude journal
          </p>
        </div>

        {error && (
          <div 
            style={{ 
              background: "rgba(255, 94, 98, 0.1)", 
              color: "#ff5e62", 
              padding: "1.2rem 1.5rem", 
              borderRadius: "8px", 
              fontSize: "1.3rem", 
              fontWeight: "600",
              border: "1px solid rgba(255, 94, 98, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "0.8rem"
            }}
          >
            <i className="ri-error-warning-line" style={{ fontSize: "1.8rem" }}></i>
            {error}
          </div>
        )}

        {/* Google Sign-in Option */}
        {(googleClientId || process.env.NODE_ENV !== "production") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <button
              type="button"
              onClick={handleGoogleClick}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.2rem",
                width: "100%",
                padding: "1.2rem",
                borderRadius: "8px",
                background: "var(--primary-background-color)",
                border: "1px solid var(--transparent-light-color)",
                color: "var(--light-color)",
                fontSize: "1.4rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "var(--light-color-alt)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary-background-color)";
                e.currentTarget.style.borderColor = "var(--transparent-light-color)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.57 2.69-3.88 2.69-6.57z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.72H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
                <path fill="#FBBC05" d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.99H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.01l3-2.3z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A8.99 8.99 0 0 0 9 0C5.5 0 2.43 2.11.95 5l3 2.3c.71-2.14 2.7-3.72 5.05-3.72z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", textTransform: "uppercase", fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
              <span style={{ flex: 1, height: "1px", background: "var(--transparent-light-color)" }}></span>
              <span style={{ padding: "0 1.5rem" }}>or</span>
              <span style={{ flex: 1, height: "1px", background: "var(--transparent-light-color)" }}></span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <label htmlFor="name" style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <i className="ri-user-line" style={{ position: "absolute", left: "1.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--light-color-alt)", fontSize: "1.8rem" }}></i>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1.2rem 1.5rem 1.2rem 4.5rem",
                  borderRadius: "8px",
                  background: "var(--primary-background-color)",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color)",
                  fontSize: "1.4rem"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <label htmlFor="email" style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <i className="ri-mail-line" style={{ position: "absolute", left: "1.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--light-color-alt)", fontSize: "1.8rem" }}></i>
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1.2rem 1.5rem 1.2rem 4.5rem",
                  borderRadius: "8px",
                  background: "var(--primary-background-color)",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color)",
                  fontSize: "1.4rem"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <label htmlFor="password" style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <i className="ri-lock-line" style={{ position: "absolute", left: "1.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--light-color-alt)", fontSize: "1.8rem" }}></i>
              <input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1.2rem 1.5rem 1.2rem 4.5rem",
                  borderRadius: "8px",
                  background: "var(--primary-background-color)",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color)",
                  fontSize: "1.4rem"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <label htmlFor="confirmPassword" style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <i className="ri-lock-line" style={{ position: "absolute", left: "1.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--light-color-alt)", fontSize: "1.8rem" }}></i>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1.2rem 1.5rem 1.2rem 4.5rem",
                  borderRadius: "8px",
                  background: "var(--primary-background-color)",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color)",
                  fontSize: "1.4rem"
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "var(--accent-color)",
              color: "#131417",
              padding: "1.3rem",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "1.4rem",
              cursor: "pointer",
              transition: "transform 0.2s ease, opacity 0.2s ease",
              opacity: loading ? 0.7 : 1,
              marginTop: "1rem"
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "1.3rem", color: "var(--light-color-alt)", marginTop: "1rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "underline" }}>
            Log In
          </Link>
        </div>
      </div>

      {showDemoModal && process.env.NODE_ENV !== "production" && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem"
          }}
        >
          <div 
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "var(--secondary-background-color)",
              border: "1px solid var(--transparent-light-color)",
              borderRadius: "12px",
              padding: "2.5rem",
              boxShadow: "0 15px 50px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "2rem"
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", fontWeight: "700", marginBottom: "0.5rem" }}>
                Google Sign-In (Demo)
              </h3>
              <p style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                Select a test account to simulate the Google authentication flow.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { name: "John Doe", email: "john.doe@example.com" },
                { name: "Jane Smith", email: "jane.smith@example.com" },
                { name: "Admin User", email: "admin@praisepage.com" }
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    setShowDemoModal(false);
                    handleGoogleSuccess(u.email, u.name);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "1.2rem",
                    borderRadius: "8px",
                    background: "var(--primary-background-color)",
                    border: "1px solid var(--transparent-light-color)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "border-color 0.2s, background-color 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-color)";
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--transparent-light-color)";
                    e.currentTarget.style.backgroundColor = "var(--primary-background-color)";
                  }}
                >
                  <span style={{ fontSize: "1.3rem", fontWeight: "600", color: "var(--light-color)" }}>{u.name}</span>
                  <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>{u.email}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600" }}>Or enter a custom email:</span>
              <div style={{ display: "flex", gap: "1rem" }}>
                <input
                  type="email"
                  placeholder="custom@example.com"
                  id="demo-custom-email"
                  style={{
                    flex: 1,
                    padding: "0.8rem 1.2rem",
                    borderRadius: "6px",
                    background: "var(--primary-background-color)",
                    border: "1px solid var(--transparent-light-color)",
                    color: "var(--light-color)",
                    fontSize: "1.2rem"
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        setShowDemoModal(false);
                        handleGoogleSuccess(val, val.split("@")[0]);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("demo-custom-email");
                    const val = input?.value.trim();
                    if (val) {
                      setShowDemoModal(false);
                      handleGoogleSuccess(val, val.split("@")[0]);
                    }
                  }}
                  style={{
                    padding: "0.8rem 1.5rem",
                    borderRadius: "6px",
                    background: "var(--accent-color)",
                    color: "#131417",
                    border: "none",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Go
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDemoModal(false)}
              style={{
                alignSelf: "flex-end",
                padding: "0.8rem 1.5rem",
                borderRadius: "6px",
                background: "transparent",
                color: "var(--light-color-alt)",
                border: "1px solid var(--transparent-light-color)",
                fontSize: "1.2rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
