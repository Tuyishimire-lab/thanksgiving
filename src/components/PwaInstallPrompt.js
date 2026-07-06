"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Only show the prompt if the user hasn't dismissed it in the current session
      const isDismissed = sessionStorage.getItem("pwa-prompt-dismissed");
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Also check if the app is already installed or running as standalone PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isStandalone) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "95px", // sits perfectly above the mobile sticky bottom navigation (which is ~70px high)
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      width: "calc(100% - 32px)",
      maxWidth: "460px",
      backgroundColor: "rgba(37, 40, 48, 0.95)",
      backdropFilter: "blur(12px)",
      borderRadius: "16px",
      padding: "1.6rem",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
      border: "1px solid var(--accent-color)",
      display: "flex",
      alignItems: "center",
      gap: "1.5rem",
      animation: "pwaSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      color: "var(--light-color)"
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pwaSlideUp {
          from {
            transform: translate(-50%, 50px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        @media (min-width: 769px) {
          #pwa-install-prompt-container {
            bottom: 24px !important;
            left: auto !important;
            right: 24px !important;
            transform: none !important;
          }
          @keyframes pwaSlideUp {
            from {
              transform: translateY(50px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        }
      `}} />
      
      <div id="pwa-install-prompt-container" style={{ display: "flex", alignItems: "center", width: "100%", gap: "1.2rem" }}>
        {/* App Logo */}
        <div style={{ 
          width: "48px", 
          height: "48px", 
          position: "relative", 
          flexShrink: 0,
          borderRadius: "10px",
          overflow: "hidden",
          border: "1px solid var(--transparent-light-color)"
        }}>
          <img 
            src="/assets/images/icon-192.png" 
            alt="PraisePage Logo" 
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Text Details */}
        <div style={{ flexGrow: 1 }}>
          <h4 style={{ 
            fontSize: "1.45rem", 
            fontWeight: "700", 
            margin: "0 0 0.3rem 0", 
            color: "var(--light-color)",
            fontFamily: "var(--font-family)" 
          }}>
            Install PraisePage App
          </h4>
          <p style={{ 
            fontSize: "1.15rem", 
            margin: 0, 
            color: "var(--light-color-alt)",
            lineHeight: "1.4"
          }}>
            Access devotionals, Bible, and testimonies directly from your home screen.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flexShrink: 0 }}>
          <button 
            onClick={handleInstallClick}
            style={{
              padding: "0.8rem 1.4rem",
              backgroundColor: "var(--accent-color)",
              color: "#131417",
              border: "none",
              borderRadius: "20px",
              fontWeight: "600",
              fontSize: "1.2rem",
              cursor: "pointer",
              transition: "transform 0.15s, opacity 0.15s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
            onMouseOut={(e) => e.currentTarget.style.opacity = 1}
          >
            Install
          </button>
          <button 
            onClick={handleDismiss}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "transparent",
              color: "var(--light-color-alt)",
              border: "none",
              borderRadius: "20px",
              fontWeight: "500",
              fontSize: "1.1rem",
              cursor: "pointer",
              textAlign: "center"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "var(--light-color)"}
            onMouseOut={(e) => e.currentTarget.style.color = "var(--light-color-alt)"}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
