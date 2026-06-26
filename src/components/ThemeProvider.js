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
  }, []);

  return <>{children}</>;
}
