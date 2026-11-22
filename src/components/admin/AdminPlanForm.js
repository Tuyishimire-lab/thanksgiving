"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ADMIN_PLAN_CATEGORIES,
  PLAN_COVER_PRESETS,
  getDefaultPlanCover,
  isSafeImageUrl,
} from "./adminConstants";

export default function AdminPlanForm({
  planData,
  editingPlanId,
  busy = false,
  onUpdateField,
  onAddDay,
  onRemoveDay,
  onChangeDayField,
  onSubmit,
  onCancel,
}) {
  const [coverFilter, setCoverFilter] = useState("all");

  const activeCategory = planData?.category || "Gratitude";
  const days = Array.isArray(planData?.days) ? planData.days : [];
  const matchingPresets = PLAN_COVER_PRESETS.filter(
    (img) => img.category === activeCategory
  );
  const visiblePresets =
    coverFilter === "matching" ? matchingPresets : PLAN_COVER_PRESETS;

  const previewCover = isSafeImageUrl(planData?.image)
    ? planData.image.trim()
    : getDefaultPlanCover(activeCategory);
  const isExternal = !previewCover.startsWith("/");

  return (
    <form onSubmit={onSubmit} className="sanc-admin-form">
      <div className="sanc-admin-form-head">
        <div>
          <span className="sanc-eyebrow">
            {editingPlanId ? "Editing Plan" : "New Custom Plan"}
          </span>
          <h3 className="sanc-section-title">
            {editingPlanId ? "Edit Devotional Plan" : "Create Custom Devotional Plan"}
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="sanc-badge gold">{activeCategory}</span>
          <span className="sanc-badge emerald">
            {days.length} {days.length === 1 ? "Day" : "Days"}
          </span>
        </div>
      </div>

      {/* Title & Category */}
      <div className="sanc-admin-form-grid">
        <div className="sanc-field">
          <label htmlFor="admin-plan-title" className="sanc-label">
            Plan Title
          </label>
          <input
            id="admin-plan-title"
            type="text"
            className="sanc-input"
            placeholder="e.g. Anchored in Grace"
            value={planData?.title || ""}
            onChange={(e) => onUpdateField("title", e.target.value)}
            required
          />
        </div>

        <div className="sanc-field">
          <label htmlFor="admin-plan-category" className="sanc-label">
            Category / Topic
          </label>
          <select
            id="admin-plan-category"
            className="sanc-select"
            value={activeCategory}
            onChange={(e) => onUpdateField("category", e.target.value)}
          >
            {ADMIN_PLAN_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Cover Preview */}
      <div className="sanc-field">
        <span className="sanc-label">Live Cover Preview</span>
        <div className="sanc-admin-cover-preview">
          <Image
            src={previewCover}
            alt={planData?.title || "Plan cover preview"}
            fill
            sizes="(max-width: 720px) 100vw, 900px"
            unoptimized={isExternal}
            style={{ objectFit: "cover" }}
          />
          <div className="sanc-admin-cover-overlay">
            <span className="sanc-badge gold" style={{ alignSelf: "flex-start" }}>
              {activeCategory}
            </span>
            <strong
              style={{
                fontFamily: "var(--font-family-serif), Georgia, serif",
                fontSize: "2rem",
                lineHeight: 1.2,
              }}
            >
              {planData?.title || "Untitled Devotional Plan"}
            </strong>
            <span style={{ fontSize: "1.22rem", opacity: 0.85 }}>
              {days.length}-Day Guided Devotional
            </span>
          </div>
        </div>
      </div>

      {/* Cover Preset Picker & Custom URL */}
      <div className="sanc-admin-preset-bar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div className="sanc-segmented" role="tablist" aria-label="Filter cover presets">
            <button
              type="button"
              role="tab"
              aria-selected={coverFilter === "all"}
              onClick={() => setCoverFilter("all")}
              className={`sanc-seg-btn${coverFilter === "all" ? " active" : ""}`}
            >
              All 22 Covers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={coverFilter === "matching"}
              onClick={() => setCoverFilter("matching")}
              className={`sanc-seg-btn${coverFilter === "matching" ? " active" : ""}`}
            >
              Matching {activeCategory} ({matchingPresets.length})
            </button>
          </div>

          <button
            type="button"
            className="sanc-btn-gold sanc-btn-sm"
            onClick={() => onUpdateField("image", getDefaultPlanCover(activeCategory))}
          >
            <i className="ri-sparkling-line" aria-hidden="true"></i>
            Match Category Cover
          </button>
        </div>

        <div className="sanc-admin-preset-grid">
          {visiblePresets.map((img) => {
            const isSelected = planData?.image === img.url;
            return (
              <button
                key={img.url}
                type="button"
                onClick={() => onUpdateField("image", img.url)}
                className={`sanc-admin-preset-btn${isSelected ? " selected" : ""}`}
                aria-pressed={isSelected}
              >
                <div className="sanc-admin-preset-thumb">
                  <Image
                    src={img.url}
                    alt={img.label}
                    fill
                    sizes="160px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <span style={{ color: "var(--sanc-text)", fontWeight: 700, lineHeight: 1.25 }}>
                  {img.label}
                </span>
                <span style={{ fontSize: "1.02rem", color: "var(--sanc-muted)" }}>
                  {img.category}
                </span>
              </button>
            );
          })}
        </div>

        <div className="sanc-field">
          <label htmlFor="admin-plan-image-url" className="sanc-label">
            Custom Cover Image URL (Optional)
          </label>
          <input
            id="admin-plan-image-url"
            type="text"
            className="sanc-input"
            placeholder="https://... or /assets/images/plans/hope-dawn-horizon.png"
            value={planData?.image || ""}
            onChange={(e) => onUpdateField("image", e.target.value)}
          />
        </div>
      </div>

      {/* Days Builder */}
      <div className="sanc-stack">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <span className="sanc-label">Plan Days &amp; Daily Content</span>
          <button
            type="button"
            onClick={onAddDay}
            disabled={busy}
            className="sanc-btn-gold sanc-btn-sm"
          >
            <i className="ri-add-line" aria-hidden="true"></i>
            Add Day
          </button>
        </div>

        {days.map((day, idx) => (
          <div key={idx} className="sanc-admin-day-card">
            <div className="sanc-admin-day-head">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span className="sanc-badge gold">Day {day.day}</span>
                {day.verseId && (
                  <span className="sanc-badge sky">Reader ID: {day.verseId}</span>
                )}
              </div>

              {days.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveDay(idx)}
                  disabled={busy}
                  className="sanc-btn-danger sanc-btn-sm"
                >
                  <i className="ri-delete-bin-line" aria-hidden="true"></i>
                  Remove Day
                </button>
              )}
            </div>

            <div className="sanc-admin-form-grid">
              <div className="sanc-field">
                <label htmlFor={`plan-day-title-${idx}`} className="sanc-label">
                  Day Subtitle
                </label>
                <input
                  id={`plan-day-title-${idx}`}
                  type="text"
                  className="sanc-input"
                  placeholder="e.g. Walking in Grace"
                  value={day.title || ""}
                  onChange={(e) => onChangeDayField(idx, "title", e.target.value)}
                  required
                />
              </div>

              <div className="sanc-field">
                <label htmlFor={`plan-day-citation-${idx}`} className="sanc-label">
                  Scripture Citation
                </label>
                <input
                  id={`plan-day-citation-${idx}`}
                  type="text"
                  className="sanc-input"
                  placeholder="e.g. Psalm 23:1 KJV"
                  value={day.verseTag || ""}
                  onChange={(e) => onChangeDayField(idx, "verseTag", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="sanc-field">
              <label htmlFor={`plan-day-verse-${idx}`} className="sanc-label">
                Scripture Text
              </label>
              <textarea
                id={`plan-day-verse-${idx}`}
                className="sanc-textarea"
                placeholder="Paste the complete scripture verse..."
                value={day.verseText || ""}
                onChange={(e) => onChangeDayField(idx, "verseText", e.target.value)}
                required
                rows={2}
              />
            </div>

            <div className="sanc-field">
              <label htmlFor={`plan-day-reflection-${idx}`} className="sanc-label">
                Daily Reflection
              </label>
              <textarea
                id={`plan-day-reflection-${idx}`}
                className="sanc-textarea"
                placeholder="Write a heartfelt devotional reflection for this day..."
                value={day.reflection || ""}
                onChange={(e) => onChangeDayField(idx, "reflection", e.target.value)}
                required
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="sanc-admin-form-footer">
        <span style={{ fontSize: "1.28rem", color: "var(--sanc-muted)", fontWeight: 600 }}>
          {days.length} {days.length === 1 ? "day" : "days"} configured &bull; Cover &amp; scripture ready
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="sanc-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="sanc-btn-primary"
          >
            <i className="ri-check-line" aria-hidden="true"></i>
            {busy
              ? "Saving..."
              : editingPlanId
                ? "Update Devotional Plan"
                : "Publish Devotional Plan"}
          </button>
        </div>
      </div>
    </form>
  );
}
