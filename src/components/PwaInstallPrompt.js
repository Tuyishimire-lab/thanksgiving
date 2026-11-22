"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      try {
        const isDismissed = sessionStorage.getItem("pwa-prompt-dismissed");
        if (!isDismissed) {
          setIsVisible(true);
        }
      } catch {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("pwa-prompt-dismissed", "true");
    } catch {
      // Ignore storage write errors in restricted browsing modes
    }
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <aside className="sanc-float-banner" role="region" aria-label="Install PraisePage App">
      <div className="sanc-float-icon" style={{ overflow: "hidden" }}>
        <Image
          src="/assets/images/icon-192.png"
          alt="PraisePage Logo"
          width={40}
          height={40}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
        />
      </div>

      <div className="sanc-float-body">
        <h4
          style={{
            margin: "0 0 0.25rem",
            fontSize: "1.45rem",
            fontWeight: 700,
            color: "var(--sanc-text)",
          }}
        >
          Install PraisePage App
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: "1.22rem",
            lineHeight: 1.45,
            color: "var(--sanc-muted)",
          }}
        >
          Access devotionals, Bible, and testimonies directly from your home screen.
        </p>

        <div className="sanc-float-actions">
          <button
            type="button"
            onClick={handleInstallClick}
            className="sanc-btn-primary sanc-btn-sm"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="sanc-btn-ghost sanc-btn-sm"
          >
            Later
          </button>
        </div>
      </div>
    </aside>
  );
}
