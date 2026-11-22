"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import NotificationSettingsModal from "@/components/NotificationSettingsModal";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const emptySubscribe = () => () => {};
const getPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
const getPushSupportedServer = () => false;

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
  const supported = useSyncExternalStore(
    emptySubscribe,
    getPushSupported,
    getPushSupportedServer
  );
  const [subscription, setSubscription] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supported) return;
    window.openNotifSettings = () => setShowModal(true);
    return () => {
      delete window.openNotifSettings;
    };
  }, [supported]);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    let bannerTimer = null;

    let wasDismissed = false;
    try {
      wasDismissed = Boolean(localStorage.getItem("notif-banner-dismissed"));
    } catch {
      wasDismissed = false;
    }

    navigator.serviceWorker.ready
      .then(async (reg) => {
        if (cancelled) return;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;

        if (existing) {
          setSubscription(existing);
          const res = await fetch(
            `/api/notifications/preferences?endpoint=${encodeURIComponent(existing.endpoint)}`
          );
          if (!cancelled && res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setPreferences({
                verse_of_day: Boolean(data.verse_of_day),
                devotional_reminder: Boolean(data.devotional_reminder),
                gratitude_journal: Boolean(data.gratitude_journal),
                scripture_quiz: Boolean(data.scripture_quiz),
              });
            }
          }
        } else if (!wasDismissed && Notification.permission === "default") {
          bannerTimer = setTimeout(() => {
            if (!cancelled) setShowBanner(true);
          }, 4000);
        }
      })
      .catch((err) => {
        console.error("Failed to check push subscription:", err);
      });

    return () => {
      cancelled = true;
      if (bannerTimer) clearTimeout(bannerTimer);
    };
  }, [supported]);

  const subscribe = useCallback(
    async (prefs = DEFAULT_PREFS) => {
      if (!supported || !VAPID_PUBLIC_KEY) return null;

      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
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
    },
    [supported]
  );

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
    setSubscription(null);
  }, [subscription]);

  const handleBannerEnable = () => {
    setShowBanner(false);
    setShowModal(true);
  };

  const handleBannerDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("notif-banner-dismissed", "true");
    } catch {
      // Ignore storage write errors in restricted browsing modes
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!subscription) {
        await subscribe(preferences);
      } else {
        await fetch("/api/notifications/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint, preferences }),
        });
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!supported) return null;

  return (
    <>
      {showBanner && !subscription && (
        <aside
          className="sanc-float-banner"
          role="region"
          aria-label="Daily Inspiration Notifications"
        >
          <div className="sanc-float-icon">
            <i className="ri-notification-3-line" aria-hidden="true"></i>
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
              Daily Inspiration Awaits
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "1.22rem",
                lineHeight: 1.45,
                color: "var(--sanc-muted)",
              }}
            >
              Get verse of the day, devotional reminders &amp; more.
            </p>

            <div className="sanc-float-actions">
              <button
                type="button"
                onClick={handleBannerEnable}
                className="sanc-btn-primary sanc-btn-sm"
              >
                Enable
              </button>
              <button
                type="button"
                onClick={handleBannerDismiss}
                className="sanc-btn-ghost sanc-btn-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </aside>
      )}

      {showModal && (
        <NotificationSettingsModal
          preferences={preferences}
          onChange={(key, val) => setPreferences((prev) => ({ ...prev, [key]: val }))}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
          isSubscribed={Boolean(subscription)}
          onUnsubscribe={async () => {
            await unsubscribe();
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
