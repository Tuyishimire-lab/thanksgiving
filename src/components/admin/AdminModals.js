"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  getDefaultPlanCover,
  isSafeImageUrl,
  sanitizeAdminHtml,
} from "./adminConstants";

function formatPreviewDate(value) {
  if (!value) return "";
  const str = String(value);
  if (str.includes("-") || str.includes(":")) {
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return str;
}

function AdminModalShell({
  title,
  subtitle,
  headerBadge,
  wide = false,
  narrow = false,
  busy = false,
  onClose,
  footer,
  children,
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
      if (e.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  if (typeof document === "undefined") return null;

  const sizeClass = wide ? " wide" : narrow ? " narrow" : "";

  const modalContent = (
    <div
      className="sanc-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className={`sanc-modal-dialog${sizeClass}`}>
        <div className="sanc-modal-header">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {headerBadge && (
                <span className={`sanc-badge ${headerBadge.variant || "gold"}`}>
                  {headerBadge.label}
                </span>
              )}
              {subtitle && (
                <span className="sanc-eyebrow" style={{ marginBottom: 0 }}>
                  {subtitle}
                </span>
              )}
            </div>
            <h3 className="sanc-modal-title" style={{ marginTop: subtitle || headerBadge ? "0.35rem" : 0 }}>
              {title}
            </h3>
          </div>

          <button
            type="button"
            className="sanc-modal-close"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            aria-label={`Close ${title}`}
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <div className="sanc-modal-body">{children}</div>

        {footer && <div className="sanc-modal-footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function ConfirmActionModal({ dialog, busy = false, onCancel, onConfirm }) {
  if (!dialog) return null;

  const {
    title = "Confirm Action",
    message = "",
    confirmLabel = "Confirm",
    tone = "danger",
    icon = "ri-error-warning-line",
  } = dialog;

  const confirmClass =
    tone === "danger"
      ? "sanc-btn-danger-solid"
      : tone === "gold"
        ? "sanc-btn-gold"
        : "sanc-btn-primary";

  const iconToneStyle =
    tone === "gold"
      ? {
          background: "var(--sanc-gold-soft)",
          borderColor: "var(--sanc-gold-border)",
          color: "var(--sanc-gold)",
        }
      : tone === "primary"
        ? {
            background: "var(--sanc-emerald-soft)",
            borderColor: "var(--sanc-emerald-border)",
            color: "var(--sanc-emerald)",
          }
        : undefined;

  return (
    <AdminModalShell
      title={title}
      subtitle="Confirmation Required"
      narrow
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="sanc-btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Processing..." : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ textAlign: "center", paddingBlock: "0.4rem" }}>
        <div className="sanc-admin-confirm-icon" style={iconToneStyle}>
          <i className={icon} aria-hidden="true"></i>
        </div>
        <p
          className="sanc-subtitle"
          style={{ marginInline: "auto", color: "var(--sanc-text)", fontSize: "1.46rem" }}
        >
          {message}
        </p>
      </div>
    </AdminModalShell>
  );
}

function renderParsedTestimonyBlocks(content) {
  if (!content) {
    return (
      <p style={{ margin: 0, color: "var(--sanc-muted)" }}>
        No testimony body provided.
      </p>
    );
  }

  const trimmed = String(content).trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => {
          if (item && typeof item === "object") {
            if (item.type === "paragraph") {
              return (
                <p
                  key={idx}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeAdminHtml(item.text || ""),
                  }}
                />
              );
            }
            if (item.type === "blockquote") {
              return (
                <blockquote
                  key={idx}
                  className="sanc-blockquote"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeAdminHtml(item.text || ""),
                  }}
                />
              );
            }
            if (item.type === "list" && Array.isArray(item.items)) {
              return (
                <ul key={idx}>
                  {item.items.map((li, lIdx) => (
                    <li
                      key={lIdx}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeAdminHtml(li || ""),
                      }}
                    />
                  ))}
                </ul>
              );
            }
          } else if (typeof item === "string") {
            return <p key={idx}>{item}</p>;
          }
          return null;
        });
      }
    } catch {
      // Render raw plain text cleanly below
    }
  }

  return <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{content}</p>;
}

export function TestimonyPreviewModal({
  testimony,
  busy = false,
  onClose,
  onRequestDelete,
}) {
  if (!testimony) return null;

  const authorInitial =
    String(testimony.author_name || "M").trim().charAt(0).toUpperCase() || "M";
  const createdLabel = formatPreviewDate(testimony.created_at);

  return (
    <AdminModalShell
      title={testimony.title || "Testimony Preview"}
      subtitle="Community Testimony"
      headerBadge={testimony.tag ? { label: testimony.tag, variant: "sky" } : null}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="sanc-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
          <button
            type="button"
            className="sanc-btn-danger-solid"
            onClick={() => onRequestDelete(testimony)}
            disabled={busy}
          >
            <i className="ri-delete-bin-line" aria-hidden="true"></i>
            Delete Post
          </button>
        </>
      }
    >
      <div className="sanc-admin-modal-meta" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <div className="sanc-avatar">{authorInitial}</div>
          <div>
            <div style={{ fontWeight: 700, color: "var(--sanc-text)", fontSize: "1.38rem" }}>
              {testimony.author_name || "Community Member"}
            </div>
            {createdLabel && (
              <div style={{ fontSize: "1.18rem", color: "var(--sanc-muted)" }}>
                {createdLabel}
              </div>
            )}
          </div>
        </div>

        {testimony.tag && (
          <span className="sanc-badge sky">{testimony.tag}</span>
        )}
      </div>

      <div className="sanc-card-muted">
        <div className="sanc-article-prose" style={{ fontSize: "1.46rem" }}>
          {renderParsedTestimonyBlocks(testimony.content)}
        </div>
      </div>
    </AdminModalShell>
  );
}

export function PrayerPreviewModal({
  prayer,
  busy = false,
  onClose,
  onRequestDelete,
}) {
  if (!prayer) return null;

  const requester =
    prayer.is_anonymous === 1 ? "Anonymous" : prayer.author_name || "Member";
  const statusLabel = String(prayer.status || "ACTIVE").toUpperCase();
  const createdLabel = formatPreviewDate(prayer.created_at);

  return (
    <AdminModalShell
      title={prayer.title || "Prayer Request Preview"}
      subtitle="Prayer Wall Request"
      headerBadge={{ label: statusLabel, variant: "emerald" }}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="sanc-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
          <button
            type="button"
            className="sanc-btn-danger-solid"
            onClick={() => onRequestDelete(prayer)}
            disabled={busy}
          >
            <i className="ri-delete-bin-line" aria-hidden="true"></i>
            Delete Request
          </button>
        </>
      }
    >
      <div className="sanc-admin-modal-meta" style={{ justifyContent: "space-between" }}>
        <span>
          Requested by: <strong style={{ color: "var(--sanc-text)" }}>{requester}</strong>
          {createdLabel ? ` • ${createdLabel}` : ""}
        </span>
        <span className="sanc-badge emerald">{statusLabel}</span>
      </div>

      <div
        className="sanc-card-muted"
        style={{
          fontSize: "1.46rem",
          lineHeight: 1.7,
          color: "var(--sanc-text)",
          whiteSpace: "pre-wrap",
        }}
      >
        {prayer.content}
      </div>
    </AdminModalShell>
  );
}

export function CommentPreviewModal({
  comment,
  busy = false,
  onClose,
  onRequestDelete,
}) {
  if (!comment) return null;

  const createdLabel = formatPreviewDate(comment.created_at);

  return (
    <AdminModalShell
      title="Comment Preview"
      subtitle="Comment Moderation"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="sanc-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
          <button
            type="button"
            className="sanc-btn-danger-solid"
            onClick={() => onRequestDelete(comment)}
            disabled={busy}
          >
            <i className="ri-delete-bin-line" aria-hidden="true"></i>
            Delete Comment
          </button>
        </>
      }
    >
      <div className="sanc-admin-modal-meta" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.35rem" }}>
        <span>
          Written by:{" "}
          <strong style={{ color: "var(--sanc-text)" }}>
            {comment.author_name || "Member"}
          </strong>
          {createdLabel ? ` • ${createdLabel}` : ""}
        </span>
        <span>
          On post:{" "}
          <strong style={{ color: "var(--sanc-gold)" }}>
            {comment.testimony_title || "Post deleted"}
          </strong>
        </span>
      </div>

      <div
        className="sanc-card-muted"
        style={{
          fontSize: "1.46rem",
          lineHeight: 1.7,
          color: "var(--sanc-text)",
          fontStyle: "italic",
          whiteSpace: "pre-wrap",
        }}
      >
        &ldquo;{comment.content}&rdquo;
      </div>
    </AdminModalShell>
  );
}

export function PlanPreviewModal({
  plan,
  busy = false,
  onClose,
  onEdit,
  onRequestDelete,
}) {
  if (!plan) return null;

  const rawCover = isSafeImageUrl(plan?.image)
    ? plan.image.trim()
    : getDefaultPlanCover(plan?.category);
  const isExternal = !rawCover.startsWith("/");
  const dayCount = plan.days?.length || 0;

  return (
    <AdminModalShell
      title={plan.title || "Devotional Plan Preview"}
      subtitle={
        plan.isCustom
          ? plan.isOverridden
            ? "System Override Plan"
            : "Admin Created Custom Plan"
          : "System Core Plan"
      }
      wide
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="sanc-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
          <button
            type="button"
            className="sanc-btn-gold"
            onClick={() => onEdit(plan)}
            disabled={busy}
          >
            <i className="ri-edit-line" aria-hidden="true"></i>
            Edit Plan
          </button>
          {plan.isCustom && (
            <button
              type="button"
              className="sanc-btn-danger-solid"
              onClick={() => onRequestDelete(plan)}
              disabled={busy}
            >
              <i
                className={plan.isOverridden ? "ri-restart-line" : "ri-delete-bin-line"}
                aria-hidden="true"
              ></i>
              {plan.isOverridden ? "Restore Default" : "Delete Plan"}
            </button>
          )}
        </>
      }
    >
      <div className="sanc-admin-modal-cover">
        <Image
          src={rawCover}
          alt={plan.title || "Devotional plan cover"}
          fill
          sizes="(max-width: 640px) 100vw, 720px"
          unoptimized={isExternal}
          style={{ objectFit: "cover" }}
        />
        <div className="sanc-admin-modal-cover-overlay">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span className="sanc-badge gold">{plan.category}</span>
            <span className="sanc-badge emerald">
              {dayCount} {dayCount === 1 ? "Day" : "Days"}
            </span>
          </div>
          <h4
            style={{
              margin: 0,
              fontFamily: "var(--font-family-serif), Georgia, serif",
              fontSize: "2.1rem",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {plan.title}
          </h4>
        </div>
      </div>

      <div className="sanc-stack">
        {(plan.days || []).map((d, idx) => (
          <div key={d.day ?? idx} className="sanc-admin-day-card">
            <div className="sanc-admin-day-head">
              <strong style={{ fontSize: "1.48rem", color: "var(--sanc-text)" }}>
                Day {d.day}: {d.title}
              </strong>
              {d.verseTag && <span className="sanc-badge sky">{d.verseTag}</span>}
            </div>

            <blockquote
              className="sanc-blockquote"
              style={{ marginBlock: "0.2rem", padding: "1.4rem 1.8rem", fontSize: "1.52rem" }}
            >
              &ldquo;{d.verseText}&rdquo;
            </blockquote>

            <p
              style={{
                margin: 0,
                fontSize: "1.38rem",
                lineHeight: 1.65,
                color: "var(--sanc-muted)",
              }}
            >
              {d.reflection}
            </p>
          </div>
        ))}
      </div>
    </AdminModalShell>
  );
}
