"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, getMe } from "@/app/actions/authActions";
import { syncLocalData } from "@/app/actions/dbActions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
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
            Welcome Back
          </h2>
          <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
            Sign in to continue your daily walk of faith
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <label htmlFor="email" style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <i className="ri-mail-line" style={{ position: "absolute", left: "1.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--light-color-alt)", fontSize: "1.8rem" }}></i>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
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
                placeholder="••••••••"
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "1.3rem", color: "var(--light-color-alt)", marginTop: "1rem" }}>
          Don't have an account?{" "}
          <Link href="/signup" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "underline" }}>
            Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
}
