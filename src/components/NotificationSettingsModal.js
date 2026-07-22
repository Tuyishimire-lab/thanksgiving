"use client";

export default function NotificationSettingsModal({ preferences, onChange, onSave, onClose, saving }) {
  const types = [
    {
      key: "verse_of_day",
      emoji: "🌅",
      label: "Morning Verse of the Day",
      desc: "Start each day with an inspiring scripture, delivered every morning.",
      color: "#4ade80",
    },
    {
      key: "devotional_reminder",
      emoji: "📖",
      label: "Continue Your Devotional Plan",
      desc: "A gentle nudge to keep up with your active reading plan.",
      color: "#60a5fa",
    },
    {
      key: "gratitude_journal",
      emoji: "✍️",
      label: "Daily Gratitude Journal",
      desc: "A nightly prompt to help you reflect and write in your gratitude journal.",
      color: "#f472b6",
    },
    {
      key: "scripture_quiz",
      emoji: "🧩",
      label: "Daily Scripture Quiz",
      desc: "A midday Bible trivia challenge to sharpen your knowledge of the Word.",
      color: "#fb923c",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 10000,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001,
          width: "min(520px, calc(100vw - 32px))",
          background: "linear-gradient(145deg, rgba(30,33,42,0.98), rgba(20,23,30,0.98))",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "2.4rem",
          boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp { from { transform: translate(-50%, -40%); opacity: 0 } to { transform: translate(-50%,-50%); opacity: 1 } }
          .notif-toggle { position: relative; display: inline-block; width: 48px; height: 26px; flex-shrink: 0; }
          .notif-toggle input { opacity: 0; width: 0; height: 0; }
          .notif-slider {
            position: absolute; inset: 0; border-radius: 26px;
            background: rgba(255,255,255,0.1); cursor: pointer;
            transition: background 0.3s;
          }
          .notif-slider::before {
            content: ""; position: absolute; height: 20px; width: 20px;
            left: 3px; bottom: 3px; border-radius: 50%;
            background: white; transition: transform 0.3s;
          }
          .notif-toggle input:checked + .notif-slider { background: var(--accent-color, #4ade80); }
          .notif-toggle input:checked + .notif-slider::before { transform: translateX(22px); }
          .notif-row:hover { background: rgba(255,255,255,0.04) !important; }
        ` }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--light-color, #f1f5f9)", margin: 0 }}>
              🔔 Notifications
            </h2>
            <p style={{ fontSize: "1.25rem", color: "rgba(255,255,255,0.5)", margin: "0.4rem 0 0" }}>
              Choose what inspires you daily
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              fontSize: "1.6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Toggle rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {types.map(({ key, emoji, label, desc, color }) => (
            <div
              key={key}
              className="notif-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.2rem",
                padding: "1.4rem",
                borderRadius: "16px",
                border: `1px solid ${preferences[key] ? color + "33" : "rgba(255,255,255,0.06)"}`,
                background: preferences[key] ? `${color}0d` : "transparent",
                transition: "all 0.25s ease",
                cursor: "pointer",
              }}
              onClick={() => onChange(key, !preferences[key])}
            >
              {/* Icon */}
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: preferences[key] ? `${color}22` : "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.8rem", flexShrink: 0,
                transition: "background 0.25s",
              }}>
                {emoji}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "1.35rem", color: preferences[key] ? color : "rgba(255,255,255,0.8)", marginBottom: "0.25rem" }}>
                  {label}
                </div>
                <div style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                  {desc}
                </div>
              </div>

              {/* Toggle */}
              <label className="notif-toggle" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={!!preferences[key]}
                  onChange={e => onChange(key, e.target.checked)}
                />
                <span className="notif-slider" style={preferences[key] ? { background: color } : {}} />
              </label>
            </div>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            width: "100%",
            marginTop: "2rem",
            padding: "1.4rem",
            borderRadius: "14px",
            border: "none",
            background: saving
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, var(--accent-color, #4ade80), #22c55e)",
            color: saving ? "rgba(255,255,255,0.4)" : "#0f172a",
            fontWeight: 700,
            fontSize: "1.5rem",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.3px",
          }}
        >
          {saving ? "Saving…" : "Save Preferences"}
        </button>

        <p style={{ textAlign: "center", fontSize: "1.1rem", color: "rgba(255,255,255,0.3)", marginTop: "1.2rem" }}>
          You can change these anytime from your profile.
        </p>
      </div>
    </>
  );
}
