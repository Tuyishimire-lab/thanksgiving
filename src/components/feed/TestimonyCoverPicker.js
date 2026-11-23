"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  TESTIMONY_COVER_PRESETS,
  getThemeCovers,
  getDefaultTestimonyCover,
  shouldBypassNextImageOpt,
} from "@/data/testimonyCovers";
import { compressCoverImageFile } from "@/lib/imageCompressor";

export default function TestimonyCoverPicker({
  tag = "Gratitude",
  title = "",
  selectedCover = "",
  pendingUpload = null,
  uploadError = "",
  disabled = false,
  onSelectStock,
  onUploadReady,
  onClearUpload,
  onUploadError,
}) {
  const [mode, setMode] = useState(() => (pendingUpload ? "upload" : "stock"));
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const themeMatches = getThemeCovers(tag);
  const visiblePresets = showAllPresets ? TESTIMONY_COVER_PRESETS : themeMatches;
  const defaultCover = getDefaultTestimonyCover(tag);
  const previewSrc = pendingUpload?.previewUrl || selectedCover || defaultCover;
  const isCustomPreview =
    Boolean(pendingUpload?.previewUrl) ||
    (Boolean(selectedCover) &&
      !TESTIMONY_COVER_PRESETS.some((p) => p.url === selectedCover));

  const processFile = async (file) => {
    if (!file || disabled || compressing) return;
    setCompressing(true);
    onUploadError?.("");
    try {
      const compressed = await compressCoverImageFile(file);
      onUploadReady?.(compressed);
    } catch (err) {
      onUploadError?.(err?.message || "Could not process selected photo.");
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const openFileDialog = () => {
    if (disabled || compressing) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="sanc-cover-picker">
      {/* Live Cover Preview */}
      <div className="sanc-cover-preview">
        <Image
          src={previewSrc}
          alt={title.trim() || `${tag} testimony cover preview`}
          fill
          sizes="(max-width: 640px) 100vw, 560px"
          unoptimized={shouldBypassNextImageOpt(previewSrc)}
        />
        <div className="sanc-cover-preview-overlay">
          <div style={{ minWidth: 0, flex: "1 1 20rem" }}>
            <span className="sanc-badge gold" style={{ marginBottom: "0.45rem" }}>
              #{tag}
            </span>
            <div
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1.45rem",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title.trim() || "Your testimony cover"}
            </div>
          </div>
          <span className="sanc-badge emerald">
            {isCustomPreview ? "Custom Photo" : "Theme Stock"}
          </span>
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.8rem",
        }}
      >
        <div className="sanc-segmented" role="tablist" aria-label="Testimony cover source">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "stock"}
            disabled={disabled}
            onClick={() => setMode("stock")}
            className={`sanc-seg-btn${mode === "stock" ? " active" : ""}`}
          >
            <i className="ri-image-2-line" aria-hidden="true"></i>
            Theme Stock
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "upload"}
            disabled={disabled}
            onClick={() => setMode("upload")}
            className={`sanc-seg-btn${mode === "upload" ? " active" : ""}`}
          >
            <i className="ri-upload-cloud-2-line" aria-hidden="true"></i>
            Upload Photo
          </button>
        </div>

        {mode === "stock" && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowAllPresets((prev) => !prev)}
            className="sanc-btn-ghost sanc-btn-sm"
          >
            {showAllPresets
              ? `Matching #${tag} (${themeMatches.length})`
              : `Browse All (${TESTIMONY_COVER_PRESETS.length})`}
          </button>
        )}
      </div>

      {mode === "stock" ? (
        <div className="sanc-cover-grid">
          {visiblePresets.map((preset) => {
            const activeStockUrl = !pendingUpload ? selectedCover || defaultCover : "";
            const isSelected = activeStockUrl === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectStock?.(preset.url)}
                className={`sanc-cover-option${isSelected ? " selected" : ""}`}
                aria-pressed={isSelected}
              >
                <div className="sanc-cover-thumb">
                  <Image
                    src={preset.url}
                    alt={preset.label}
                    fill
                    sizes="180px"
                    unoptimized={shouldBypassNextImageOpt(preset.url)}
                  />
                </div>
                <span className="sanc-cover-thumb-label">{preset.label}</span>
                {preset.kind === "texture" && (
                  <span style={{ fontSize: "1.02rem", color: "var(--sanc-gold)" }}>
                    Texture
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="sanc-stack" style={{ gap: "1rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={disabled || compressing}
            style={{ display: "none" }}
            aria-label="Choose custom cover photo"
          />

          <div
            role="button"
            tabIndex={disabled || compressing ? -1 : 0}
            aria-disabled={disabled || compressing}
            className={`sanc-cover-dropzone${isDragging ? " dragging" : ""}`}
            onClick={openFileDialog}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFileDialog();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled && !compressing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <i
              className={
                compressing ? "ri-loader-4-line sanc-spin" : "ri-image-add-line"
              }
              aria-hidden="true"
            ></i>
            <strong style={{ color: "var(--sanc-text)", fontSize: "1.34rem" }}>
              {compressing
                ? "Optimizing your photo..."
                : "Drop a photo here or click to choose"}
            </strong>
            <span>
              JPEG, PNG, or WebP up to 8 MB &bull; Auto-resized &amp; EXIF-stripped
            </span>
          </div>

          {pendingUpload && (
            <div className="sanc-cover-upload-meta">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <i className="ri-shield-check-line" aria-hidden="true"></i>
                Optimized to {Math.max(1, Math.round(pendingUpload.sizeBytes / 1024))} KB
                &bull; {pendingUpload.width}&times;{pendingUpload.height} &bull; EXIF removed
              </span>
              <button
                type="button"
                disabled={disabled || compressing}
                onClick={() => onClearUpload?.()}
                className="sanc-btn-ghost sanc-btn-sm"
              >
                Remove Photo
              </button>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="sanc-alert error" role="alert">
          {uploadError}
        </div>
      )}
    </div>
  );
}
