"use client";

import { useState, useRef, useEffect } from "react";

export default function CopyVerseButton({
  verseText,
  reference,
  sharePath = "/verse-of-the-day",
  className = "sanc-btn-secondary",
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://praisepage.com";
    const normalizedPath =
      typeof sharePath === "string" && sharePath.startsWith("/")
        ? sharePath
        : `/${sharePath || ""}`;
    const payload = `"${verseText}" \u2014 ${reference}\n${origin}${normalizedPath}`;

    let didCopy = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy && typeof document !== "undefined") {
      try {
        const el = document.createElement("textarea");
        el.value = payload;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        didCopy = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        didCopy = false;
      }
    }

    if (didCopy) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
      }, 2500);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleCopy}
      aria-live="polite"
    >
      <i
        className={copied ? "ri-check-line" : "ri-file-copy-line"}
        aria-hidden="true"
      ></i>
      {copied ? "Copied!" : "Copy Verse"}
    </button>
  );
}
