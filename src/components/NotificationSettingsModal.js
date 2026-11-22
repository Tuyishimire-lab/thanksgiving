"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

const NOTIFICATION_TYPES = [
  {
    key: "verse_of_day",
    icon: "ri-sun-line",
    label: "Morning Verse of the Day",
    desc: "Start each day with an inspiring scripture, delivered every morning.",
  },
  {
    key: "devotional_reminder",
    icon: "ri-book-open-line",
    label: "Continue Your Devotional Plan",
    desc: "A gentle nudge to keep up with your active reading plan.",
  },
  {
    key: "gratitude_journal",
    icon: "ri-quill-pen-line",
    label: "Daily Gratitude Journal",
    desc: "A nightly prompt to help you reflect and write in your gratitude journal.",
  },
  {
    key: "scripture_quiz",
    icon: "ri-question-answer-line",
    label: "Daily Scripture Quiz",
    desc: "A midday Bible trivia challenge to sharpen your knowledge of the Word.",
  },
];

export default function NotificationSettingsModal({
  preferences,
  onChange,
  onSave,
  onClose,
  saving = false,
  isSubscribed = false,
  onUnsubscribe,
}) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const modalContent = (
    <div
      className="sanc-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="sanc-modal-dialog narrow">
        <div className="sanc-modal-header">
          <div>
            <span className="sanc-eyebrow">Daily Rhythm</span>
            <h2 className="sanc-modal-title">Notifications</h2>
          </div>
          <button
            type="button"
            className="sanc-modal-close"
            onClick={onClose}
            aria-label="Close notification settings"
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <div className="sanc-modal-body">
          <p className="sanc-subtitle" style={{ marginTop: 0 }}>
            Choose the quiet reminders that anchor your daily devotional habit.
          </p>

          <div className="sanc-stack">
            {NOTIFICATION_TYPES.map(({ key, icon, label, desc }) => {
              const active = Boolean(preferences?.[key]);
              return (
                <div
                  key={key}
                  className={`sanc-notif-row${active ? " active" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onChange(key, !active)}
                >
                  <div className="sanc-notif-icon">
                    <i className={icon} aria-hidden="true"></i>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "1.4rem",
                        color: "var(--sanc-text)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: "1.2rem",
                        color: "var(--sanc-muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      {desc}
                    </div>
                  </div>

                  <label className="sanc-switch" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => onChange(key, e.target.checked)}
                      aria-label={label}
                    />
                    <span className="sanc-switch-slider"></span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sanc-modal-footer" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          {isSubscribed && onUnsubscribe ? (
            <button
              type="button"
              onClick={onUnsubscribe}
              disabled={saving}
              className="sanc-btn-ghost sanc-btn-sm"
            >
              Pause Push Alerts
            </button>
          ) : (
            <span className="sanc-subtitle" style={{ fontSize: "1.15rem", margin: 0 }}>
              Change anytime in Profile
            </span>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="sanc-btn-primary"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
