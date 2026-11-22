"use client";

import { useEffect } from "react";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    const currentTheme = localStorage.getItem("currentTheme");
    if (currentTheme === "themeActive") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }

    // Manage Service Worker for PWA (disable & clean up stale caches in local dev)
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isLocalDev =
        process.env.NODE_ENV !== "production" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "0.0.0.0";

      if (isLocalDev) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister())))
          .catch(() => {});

        if ("caches" in window) {
          caches
            .keys()
            .then((names) =>
              Promise.all(
                names
                  .filter((n) => n.startsWith("praisepage-cache"))
                  .map((n) => caches.delete(n))
              )
            )
            .catch(() => {});
        }
        return;
      }

      const registerSW = () => {
        navigator.serviceWorker.register("/sw.js").then(
          (reg) => console.log("Service Worker registered with scope:", reg.scope),
          (err) => console.error("Service Worker registration failed:", err)
        );
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW, { once: true });
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return <>{children}</>;
}
