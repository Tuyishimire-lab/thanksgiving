"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { BADGES } from "@/data/badges";
import {
  getThemeCovers,
  getDefaultTestimonyCover as getDefaultStoryCover,
  isUploadedMediaUrl,
  shouldBypassNextImageOpt,
  TESTIMONY_COVER_PRESETS,
} from "@/data/testimonyCovers";
import {
  getDefaultPlanCover,
  isSafeImageUrl,
  sanitizeAdminHtml,
  TESTIMONY_CATEGORIES,
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
  const badgeVariant = headerBadge?.variant ? ` ${headerBadge.variant}` : "";

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
                <span className={`sanc-badge${badgeVariant}`}>
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
  onEditMeta,
}) {
  if (!testimony) return null;

  const authorInitial =
    String(testimony.author_name || "M").trim().charAt(0).toUpperCase() || "M";
  const createdLabel = formatPreviewDate(testimony.created_at);
  const coverSrc = testimony.image || getDefaultStoryCover(testimony.tag);

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
          {onEditMeta && (
            <button
              type="button"
              className="sanc-btn-gold"
              onClick={() => onEditMeta(testimony)}
              disabled={busy}
            >
              <i className="ri-edit-line" aria-hidden="true"></i>
              Edit Title / Tag
            </button>
          )}
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
      <div className="sanc-admin-modal-cover">
        <Image
          src={coverSrc}
          alt={testimony.title || "Testimony cover"}
          fill
          sizes="(max-width: 640px) 100vw, 720px"
          unoptimized={shouldBypassNextImageOpt(coverSrc)}
          style={{ objectFit: "cover" }}
        />
        <div className="sanc-admin-modal-cover-overlay">
          <span
            className={`sanc-badge ${isUploadedMediaUrl(coverSrc) ? "emerald" : "gold"}`}
            style={{ alignSelf: "flex-start" }}
          >
            {isUploadedMediaUrl(coverSrc) ? "User Upload" : "Stock Cover"}
          </span>
        </div>
      </div>

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

function TestimonyEditForm({ testimony, busy, onClose, onSave }) {
  const [title, setTitle] = useState(() => testimony.title || "");
  const [tag, setTag] = useState(
    () => testimony.tag || TESTIMONY_CATEGORIES[0]
  );
  const [image, setImage] = useState(
    () => testimony.image || getDefaultStoryCover(testimony.tag)
  );
  const [showAllCovers, setShowAllCovers] = useState(false);

  const topicOptions =
    testimony.tag && !TESTIMONY_CATEGORIES.includes(testimony.tag)
      ? [testimony.tag, ...TESTIMONY_CATEGORIES]
      : TESTIMONY_CATEGORIES;

  const themeCovers = getThemeCovers(tag);
  const coverPresets = showAllCovers ? TESTIMONY_COVER_PRESETS : themeCovers;
  const previewCover = image || getDefaultStoryCover(tag);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || busy) return;
    onSave(testimony.id, cleanTitle, tag, image);
  };

  return (
    <AdminModalShell
      title="Edit Testimony Metadata"
      subtitle="Fix Title, Topic or Cover"
      headerBadge={{ label: testimony.author_name || "Member", variant: "sky" }}
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
            Cancel
          </button>
          <button
            type="submit"
            form="edit-testimony-meta-form"
            className="sanc-btn-primary"
            disabled={busy || !title.trim()}
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <form
        id="edit-testimony-meta-form"
        onSubmit={handleSubmit}
        className="sanc-stack"
        style={{ gap: "1.5rem" }}
      >
        <div className="sanc-field">
          <label htmlFor="admin-edit-testimony-title" className="sanc-label">
            Testimony Title
          </label>
          <input
            id="admin-edit-testimony-title"
            type="text"
            className="sanc-input"
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="sanc-field">
          <label htmlFor="admin-edit-testimony-tag" className="sanc-label">
            Topic Category
          </label>
          <select
            id="admin-edit-testimony-tag"
            className="sanc-select"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            {topicOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="sanc-field">
          <span className="sanc-label">Story Cover</span>
          <div className="sanc-admin-modal-cover" style={{ height: "14rem" }}>
            <Image
              src={previewCover}
              alt={title || "Testimony cover preview"}
              fill
              sizes="(max-width: 640px) 100vw, 560px"
              unoptimized={shouldBypassNextImageOpt(previewCover)}
              style={{ objectFit: "cover" }}
            />
            <div className="sanc-admin-modal-cover-overlay">
              <span
                className={`sanc-badge ${isUploadedMediaUrl(previewCover) ? "emerald" : "gold"}`}
                style={{ alignSelf: "flex-start" }}
              >
                {isUploadedMediaUrl(previewCover) ? "User Upload" : "Stock Cover"}
              </span>
            </div>
          </div>
        </div>

        <div className="sanc-admin-preset-bar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              className="sanc-btn-gold sanc-btn-sm"
              onClick={() => setImage(getDefaultStoryCover(tag))}
            >
              <i className="ri-refresh-line" aria-hidden="true"></i>
              Reset to Theme Stock
            </button>
            <button
              type="button"
              className="sanc-btn-ghost sanc-btn-sm"
              onClick={() => setShowAllCovers((prev) => !prev)}
            >
              {showAllCovers
                ? `Matching #${tag} (${themeCovers.length})`
                : `Show All (${TESTIMONY_COVER_PRESETS.length})`}
            </button>
          </div>

          <div className="sanc-admin-preset-grid">
            {coverPresets.map((p) => {
              const isSelected = previewCover === p.url;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setImage(p.url)}
                  className={`sanc-admin-preset-btn${isSelected ? " selected" : ""}`}
                  aria-pressed={isSelected}
                >
                  <div className="sanc-admin-preset-thumb">
                    <Image
                      src={p.url}
                      alt={p.label}
                      fill
                      sizes="160px"
                      unoptimized={shouldBypassNextImageOpt(p.url)}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <span style={{ color: "var(--sanc-text)", fontWeight: 700, lineHeight: 1.25 }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </AdminModalShell>
  );
}

export function TestimonyEditModal({ testimony, busy = false, onClose, onSave }) {
  if (!testimony) return null;

  return (
    <TestimonyEditForm
      key={testimony.id}
      testimony={testimony}
      busy={busy}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

export function PrayerPreviewModal({
  prayer,
  busy = false,
  onClose,
  onRequestDelete,
  onToggleStatus,
}) {
  if (!prayer) return null;

  const requester =
    prayer.is_anonymous === 1 ? "Anonymous" : prayer.author_name || "Member";
  const isAnswered = String(prayer.status || "active").toLowerCase() === "answered";
  const statusLabel = isAnswered ? "ANSWERED" : "ACTIVE";
  const statusVariant = isAnswered ? "emerald" : "gold";
  const createdLabel = formatPreviewDate(prayer.created_at);

  return (
    <AdminModalShell
      title={prayer.title || "Prayer Request Preview"}
      subtitle="Prayer Wall Request"
      headerBadge={{ label: statusLabel, variant: statusVariant }}
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
          {onToggleStatus && (
            <button
              type="button"
              className="sanc-btn-gold"
              onClick={() => onToggleStatus(prayer)}
              disabled={busy}
            >
              <i
                className={isAnswered ? "ri-restart-line" : "ri-checkbox-circle-line"}
                aria-hidden="true"
              ></i>
              {isAnswered ? "Reopen Active" : "Mark Answered"}
            </button>
          )}
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
        <span className={`sanc-badge ${statusVariant}`}>{statusLabel}</span>
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
  const contextLabel = comment.prayer_title ? "On prayer request:" : "On post:";
  const contextTitle =
    comment.testimony_title || comment.prayer_title || "Post deleted";

  return (
    <AdminModalShell
      title={comment.prayer_title ? "Encouragement Preview" : "Comment Preview"}
      subtitle={comment.prayer_title ? "Prayer Encouragement" : "Comment Moderation"}
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
      <div
        className="sanc-admin-modal-meta"
        style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.35rem" }}
      >
        <span>
          Written by:{" "}
          <strong style={{ color: "var(--sanc-text)" }}>
            {comment.author_name || "Member"}
          </strong>
          {createdLabel ? ` • ${createdLabel}` : ""}
        </span>
        <span>
          {contextLabel}{" "}
          <strong style={{ color: "var(--sanc-gold)" }}>{contextTitle}</strong>
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

export function UserDetailModal({
  user,
  details = null,
  loading = false,
  busy = false,
  isSelf = false,
  onClose,
  onGrantFreeze,
  onToggleRole,
  onRequestDelete,
}) {
  if (!user) return null;

  const activeUser = details?.user || user;
  const role = activeUser.role || "user";
  const counts = details?.counts || {};
  const badges = Array.isArray(details?.badges) ? details.badges : [];
  const plans = Array.isArray(details?.plans) ? details.plans : [];

  const statItems = [
    { label: "Bible Notes", value: counts.notes ?? 0 },
    { label: "Highlights", value: counts.highlights ?? 0 },
    { label: "Journal", value: counts.journal ?? 0 },
    { label: "Testimonies", value: counts.testimonies ?? 0 },
    { label: "Comments", value: counts.comments ?? 0 },
    { label: "Prayers", value: counts.prayers ?? 0 },
    { label: "Active Plans", value: counts.activePlans ?? 0 },
    { label: "Completed Plans", value: counts.completedPlans ?? 0 },
    { label: "Saved Plans", value: counts.savedPlans ?? 0 },
  ];

  return (
    <AdminModalShell
      title={activeUser.name || activeUser.email || "User Profile"}
      subtitle={activeUser.email}
      headerBadge={{
        label: role.toUpperCase(),
        variant: role === "admin" ? "gold" : "",
      }}
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
            onClick={() => onGrantFreeze(activeUser)}
            disabled={busy}
          >
            <i className="ri-shield-star-line" aria-hidden="true"></i>
            +1 Streak Freeze
          </button>
          <button
            type="button"
            className="sanc-btn-secondary"
            onClick={() => onToggleRole(activeUser)}
            disabled={busy || isSelf}
          >
            <i className="ri-user-settings-line" aria-hidden="true"></i>
            {role === "admin" ? "Demote" : "Promote"}
          </button>
          <button
            type="button"
            className="sanc-btn-danger-solid"
            onClick={() => onRequestDelete(activeUser)}
            disabled={busy || isSelf}
          >
            <i className="ri-delete-bin-line" aria-hidden="true"></i>
            Delete User
          </button>
        </>
      }
    >
      {loading ? (
        <div className="sanc-admin-loading" style={{ paddingBlock: "3.2rem" }}>
          <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
          <span>Loading member profile...</span>
        </div>
      ) : (
        <div className="sanc-stack">
          {/* Account Meta Summary */}
          <div className="sanc-admin-modal-meta" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span className="sanc-badge gold">
                <i className="ri-fire-line" aria-hidden="true"></i>
                {activeUser.streak_count ?? 0} Day Streak
              </span>
              <span className="sanc-badge sky">
                <i className="ri-shield-star-line" aria-hidden="true"></i>
                {activeUser.streak_freezes_count ?? 1} Freezes
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <span>
                Last active:{" "}
                <strong style={{ color: "var(--sanc-text)" }}>
                  {formatPreviewDate(activeUser.last_active) || "Never"}
                </strong>
              </span>
              <span>
                Joined:{" "}
                <strong style={{ color: "var(--sanc-text)" }}>
                  {formatPreviewDate(activeUser.created_at) || "Unknown"}
                </strong>
              </span>
            </div>
          </div>

          {/* 9 Activity Counts */}
          <div className="sanc-admin-stat-mini-grid">
            {statItems.map((item) => (
              <div key={item.label} className="sanc-admin-stat-mini">
                <span
                  style={{
                    fontSize: "1.12rem",
                    fontWeight: 700,
                    color: "var(--sanc-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.label}
                </span>
                <strong style={{ fontSize: "2rem", color: "var(--sanc-text)" }}>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          {/* Unlocked Milestones */}
          <div className="sanc-card-muted">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <span className="sanc-label">Unlocked Milestones</span>
              <span className="sanc-badge gold">{badges.length}</span>
            </div>

            {badges.length > 0 ? (
              <div className="sanc-admin-health-list">
                {badges.map((b, idx) => {
                  const badgeMeta = BADGES.find((item) => item.id === b.badgeId);
                  return (
                    <div key={`${b.badgeId}-${idx}`} className="sanc-admin-health-row">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.7rem" }}>
                        <i
                          className={badgeMeta?.icon || "ri-award-line"}
                          style={{ color: "var(--sanc-gold)", fontSize: "1.6rem" }}
                          aria-hidden="true"
                        ></i>
                        <strong style={{ color: "var(--sanc-text)" }}>
                          {badgeMeta?.title || b.badgeId}
                        </strong>
                      </span>
                      <span style={{ fontSize: "1.18rem", color: "var(--sanc-muted)" }}>
                        {formatPreviewDate(b.unlockedAt) || "Unlocked"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--sanc-muted)" }}>
                No milestones unlocked yet.
              </p>
            )}
          </div>

          {/* Enrolled Devotional Plans */}
          <div className="sanc-card-muted">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <span className="sanc-label">Enrolled Plans</span>
              <span className="sanc-badge emerald">{plans.length}</span>
            </div>

            {plans.length > 0 ? (
              <div className="sanc-admin-health-list">
                {plans.map((p) => (
                  <div key={p.planId} className="sanc-admin-health-row">
                    <div>
                      <strong style={{ color: "var(--sanc-text)" }}>{p.planId}</strong>
                      <span style={{ marginLeft: "0.8rem", fontSize: "1.18rem", color: "var(--sanc-muted)" }}>
                        {p.completedDaysCount} days completed
                      </span>
                    </div>
                    <span className={`sanc-badge ${p.isCompleted ? "emerald" : "gold"}`}>
                      {p.isCompleted ? "Completed" : "In Progress"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--sanc-muted)" }}>
                No devotional plans enrolled yet.
              </p>
            )}
          </div>
        </div>
      )}
    </AdminModalShell>
  );
}
