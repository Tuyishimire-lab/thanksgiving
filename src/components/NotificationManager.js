"use client";

import { useState, useEffect, useCallback } from "react";
import NotificationSettingsModal from "@/components/NotificationSettingsModal";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Convert VAPID public key string to Uint8Array for the browser Push API
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const DEFAULT_PREFS = {
  verse_of_day: true,
  devotional_reminder: true,
  gratitude_journal: true,
  scripture_quiz: true,
};

export default function NotificationManager() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscription, setSubscription] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // ── Check browser support & existing subscription on mount ──────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);

    const wasDismissed = localStorage.getItem("notif-banner-dismissed");
    if (wasDismissed) { setDismissed(true); return; }

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setSubscription(existing);
        // Load saved preferences for this endpoint
        const res = await fetch(`/api/notifications/preferences?endpoint=${encodeURIComponent(existing.endpoint)}`);
        if (res.ok) {
          const data = await res.json();
          setPreferences({
            verse_of_day:        !!data.verse_of_day,
            devotional_reminder: !!data.devotional_reminder,
            gratitude_journal:   !!data.gratitude_journal,
            scripture_quiz:      !!data.scripture_quiz,
          });
        }
      } else if (Notification.permission === "default") {
        // Show the banner after a short delay so it doesn't interrupt page load
        setTimeout(() => setShowBanner(true), 4000);
      }
    });
  }, []);

  // ── Subscribe to push ────────────────────────────────────────────────────────
  const subscribe = useCallback(async (prefs = DEFAULT_PREFS) => {
    if (!supported || !VAPID_PUBLIC_KEY) return null;

    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return null;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    setSubscription(sub);

    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), preferences: prefs }),
    });

    return sub;
  }, [supported]);

  // ── Unsubscribe from push ────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    setSubscription(null);
    setPermission("default");
  }, [subscription]);

  // ── Handle "Enable" button on the banner ────────────────────────────────────
  const handleBannerEnable = async () => {
    setShowBanner(false);
    setShowModal(true);
  };

  const handleBannerDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("notif-banner-dismissed", "true");
  };

  // ── Save preferences from the modal ─────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      if (!subscription) {
        // First time — subscribe then save prefs
        await subscribe(preferences);
      } else {
        // Already subscribed — just update prefs
        await fetch("/api/notifications/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint, preferences }),
        });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  if (!supported) return null;

  return (
    <>
      {/* ── Subtle bottom banner (first-time prompt) ───────────────────────── */}
      {showBanner && !subscription && (
        <div style={{
          position: "fixed",
          bottom: "88px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9998,
          width: "calc(100% - 32px)",
          maxWidth: "480px",
          background: "rgba(19, 22, 30, 0.96)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(74,222,128,0.25)",
          borderRadius: "18px",
          padding: "1.4rem 1.6rem",
          boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "1.2rem",
          animation: "pwaSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes pwaSlideUp {
              from { transform: translate(-50%, 50px); opacity: 0; }
              to   { transform: translate(-50%, 0);    opacity: 1; }
            }
          ` }} />

          <div style={{ fontSize: "2.2rem", flexShrink: 0 }}>🔔</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "1.35rem", color: "#f1f5f9", marginBottom: "0.2rem" }}>
              Daily Inspiration Awaits
            </div>
            <div style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
              Get verse of the day, devotional reminders & more.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
            <button
              onClick={handleBannerEnable}
              style={{
                padding: "0.7rem 1.3rem",
                background: "linear-gradient(135deg, #4ade80, #22c55e)",
                color: "#0f172a",
                border: "none",
                borderRadius: "20px",
                fontWeight: 700,
                fontSize: "1.2rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Enable
            </button>
            <button
              onClick={handleBannerDismiss}
              style={{
                padding: "0.5rem",
                background: "transparent",
                color: "rgba(255,255,255,0.35)",
                border: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
                textAlign: "center",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* ── Notification bell on profile / accessible via trigger ──────────── */}
      {/* The modal can also be opened programmatically via window.openNotifSettings */}
      {typeof window !== "undefined" && (() => {
        window.openNotifSettings = () => setShowModal(true);
        return null;
      })()}

      {/* ── Settings modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <NotificationSettingsModal
          preferences={preferences}
          onChange={(key, val) => setPreferences(prev => ({ ...prev, [key]: val }))}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
          isSubscribed={!!subscription}
          onUnsubscribe={async () => { await unsubscribe(); setShowModal(false); }}
        />
      )}
    </>
  );
}
