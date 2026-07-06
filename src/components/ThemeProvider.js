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

    // Register Service Worker for PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register("/sw.js").then(
          (reg) => console.log("Service Worker registered with scope:", reg.scope),
          (err) => console.error("Service Worker registration failed:", err)
        );
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }
    }
  }, []);

  return <>{children}</>;
}
