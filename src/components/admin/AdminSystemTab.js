"use client";

import { useState } from "react";
import { PUSH_AUDIENCE_OPTIONS } from "./adminConstants";

function formatAuditTime(iso) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSystemTab({
  systemData = null,
  loading = false,
  busy = false,
  onPurgeSessions,
  onSendBroadcast,
  onRefresh,
}) {
  const [audience, setAudience] = useState("self");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");

  const auditLogs = Array.isArray(systemData?.auditLogs) ? systemData.auditLogs : [];
  const pushStats = systemData?.pushStats || {};
  const sessionStats = systemData?.sessionStats || {};
  const expiredCount = Number(sessionStats.expired ?? 0);
  const totalSessions = Number(sessionStats.total ?? 0);
  const vapidReady = Boolean(pushStats.vapidConfigured);

  const handleBroadcastSubmit = (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanUrl = url.trim() || "/";
    if (busy || !cleanTitle || !cleanBody) return;

    onSendBroadcast(
      {
        title: cleanTitle,
        body: cleanBody,
        url: cleanUrl,
        audience,
      },
      () => {
        setTitle("");
        setBody("");
      }
    );
  };

  if (loading && !systemData) {
    return (
      <div className="sanc-admin-loading">
        <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
        <span>Loading system diagnostics &amp; audit logs...</span>
      </div>
    );
  }

  return (
    <div className="sanc-admin-system-grid">
      {/* Left Column: Push Broadcast & Session Hygiene */}
      <div className="sanc-stack">
        {/* Push Audience & Broadcast */}
        <div className="sanc-admin-panel">
          <div className="sanc-admin-panel-head">
            <h3 className="sanc-admin-panel-title">
              <i className="ri-notification-3-line" aria-hidden="true"></i>
              Push Audience &amp; Broadcast
            </h3>
            <span className={`sanc-badge ${vapidReady ? "emerald" : "danger"}`}>
              {vapidReady ? "VAPID READY" : "MISSING VAPID"}
            </span>
          </div>

          <div className="sanc-admin-stat-mini-grid">
            <div className="sanc-admin-stat-mini">
              <span className="sanc-label" style={{ fontSize: "1.06rem" }}>Subscribers</span>
              <strong style={{ fontSize: "1.95rem", color: "var(--sanc-text)" }}>
                {pushStats.total ?? 0}
              </strong>
            </div>
            <div className="sanc-admin-stat-mini">
              <span className="sanc-label" style={{ fontSize: "1.06rem" }}>Verse of Day</span>
              <strong style={{ fontSize: "1.95rem", color: "var(--sanc-text)" }}>
                {pushStats.verseOfDay ?? 0}
              </strong>
            </div>
            <div className="sanc-admin-stat-mini">
              <span className="sanc-label" style={{ fontSize: "1.06rem" }}>Devotional</span>
              <strong style={{ fontSize: "1.95rem", color: "var(--sanc-text)" }}>
                {pushStats.devotionalReminder ?? 0}
              </strong>
            </div>
            <div className="sanc-admin-stat-mini">
              <span className="sanc-label" style={{ fontSize: "1.06rem" }}>Journal</span>
              <strong style={{ fontSize: "1.95rem", color: "var(--sanc-text)" }}>
                {pushStats.gratitudeJournal ?? 0}
              </strong>
            </div>
            <div className="sanc-admin-stat-mini">
              <span className="sanc-label" style={{ fontSize: "1.06rem" }}>Quiz</span>
              <strong style={{ fontSize: "1.95rem", color: "var(--sanc-text)" }}>
                {pushStats.scriptureQuiz ?? 0}
              </strong>
            </div>
          </div>

          <form onSubmit={handleBroadcastSubmit} className="sanc-stack" style={{ gap: "1.2rem" }}>
            <div className="sanc-field">
              <label htmlFor="admin-push-audience" className="sanc-label">
                Target Audience
              </label>
              <select
                id="admin-push-audience"
                className="sanc-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                {PUSH_AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sanc-admin-form-grid">
              <div className="sanc-field">
                <label htmlFor="admin-push-title" className="sanc-label">
                  Notification Title
                </label>
                <input
                  id="admin-push-title"
                  type="text"
                  className="sanc-input"
                  maxLength={80}
                  placeholder="Morning Word & Encouragement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="sanc-field">
                <label htmlFor="admin-push-url" className="sanc-label">
                  Target Route
                </label>
                <input
                  id="admin-push-url"
                  type="text"
                  className="sanc-input"
                  placeholder="/plans"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="sanc-field">
              <label htmlFor="admin-push-body" className="sanc-label">
                Message Body
              </label>
              <textarea
                id="admin-push-body"
                className="sanc-textarea"
                maxLength={200}
                rows={3}
                placeholder="Write a concise, uplifting notification (max 200 characters)..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                {body.length}/200 characters &bull; Safe internal routes only
              </span>
              <button
                type="submit"
                className="sanc-btn-primary"
                disabled={busy || !vapidReady || !title.trim() || !body.trim()}
              >
                <i className="ri-send-plane-line" aria-hidden="true"></i>
                {audience === "self" ? "Send Test Push" : "Send Broadcast"}
              </button>
            </div>
          </form>
        </div>

        {/* Session Hygiene */}
        <div className="sanc-admin-panel">
          <div className="sanc-admin-panel-head">
            <h3 className="sanc-admin-panel-title">
              <i className="ri-shield-keyhole-line" aria-hidden="true"></i>
              Session Hygiene
            </h3>
            <span className={`sanc-badge ${expiredCount > 0 ? "danger" : "emerald"}`}>
              {expiredCount} Expired
            </span>
          </div>

          <div className="sanc-admin-health-list">
            <div className="sanc-admin-health-row">
              <span style={{ color: "var(--sanc-muted)" }}>Total Stored Sessions</span>
              <strong style={{ color: "var(--sanc-text)" }}>{totalSessions}</strong>
            </div>
            <div className="sanc-admin-health-row">
              <span style={{ color: "var(--sanc-muted)" }}>Expired Sessions Ready to Purge</span>
              <strong style={{ color: expiredCount > 0 ? "var(--sanc-error)" : "var(--sanc-emerald)" }}>
                {expiredCount}
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="sanc-btn-danger sanc-btn-sm"
              disabled={busy || expiredCount === 0}
              onClick={() => onPurgeSessions(expiredCount)}
            >
              <i className="ri-delete-bin-6-line" aria-hidden="true"></i>
              Purge Expired Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Persistent Admin Audit Log */}
      <div className="sanc-admin-panel">
        <div className="sanc-admin-panel-head">
          <h3 className="sanc-admin-panel-title">
            <i className="ri-history-line" aria-hidden="true"></i>
            Persistent Admin Audit Log
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="sanc-badge gold">{auditLogs.length}</span>
            <button
              type="button"
              className="sanc-btn-secondary sanc-btn-sm"
              onClick={onRefresh}
              disabled={loading || busy}
            >
              <i
                className={`ri-refresh-line${loading ? " sanc-spin" : ""}`}
                aria-hidden="true"
              ></i>
              Refresh
            </button>
          </div>
        </div>

        {auditLogs.length > 0 ? (
          <div className="sanc-admin-audit-list">
            {auditLogs.map((log) => (
              <div key={log.id} className="sanc-admin-audit-item">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                    <span className="sanc-badge gold">{log.action}</span>
                    {(log.target_type || log.target_id) && (
                      <span style={{ fontSize: "1.16rem", color: "var(--sanc-muted)" }}>
                        {log.target_type}
                        {log.target_id ? ` #${log.target_id}` : ""}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p style={{ margin: "0 0 0.35rem", color: "var(--sanc-text)", lineHeight: 1.45 }}>
                      {log.details}
                    </p>
                  )}
                  <span style={{ fontSize: "1.14rem", color: "var(--sanc-muted)" }}>
                    By {log.admin_email}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "1.14rem",
                    color: "var(--sanc-muted)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {formatAuditTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="sanc-empty" style={{ padding: "2.8rem 1.6rem" }}>
            <p style={{ margin: 0, color: "var(--sanc-muted)" }}>
              No audit log entries recorded yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
