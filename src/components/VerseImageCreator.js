"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  CARD_BG_PRESETS,
  CARD_INK_COLORS,
  CARD_FRAMES,
  CARD_ASPECT_RATIOS,
  CARD_FONTS,
} from "@/data/cardPresets";

const emptySubscribe = () => () => {};
const getHostServerSnapshot = () => "praisepage.com";

function normalizeBrandHost(host) {
  if (!host || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host)) {
    return "praisepage.com";
  }
  return host;
}

function getHostSnapshot() {
  return normalizeBrandHost(window.location.host);
}

const imagePromiseCache = new Map();
let cachedGrainCanvas = null;

// Deterministic starry field for Starry Night preset
const STAR_FIELD = Array.from({ length: 72 }, (_, idx) => {
  const s1 = Math.sin((idx + 1) * 12.9898) * 43758.5453;
  const s2 = Math.sin((idx + 1) * 78.233) * 24634.6345;
  const s3 = Math.sin((idx + 1) * 45.164) * 19283.4712;
  return {
    x: s1 - Math.floor(s1),
    y: (s2 - Math.floor(s2)) * 0.88,
    r: 0.7 + (s3 - Math.floor(s3)) * 1.9,
    alpha: 0.25 + ((idx * 17) % 10) * 0.06,
    gold: idx % 4 === 0,
  };
});

function loadCanvasImage(src) {
  if (!src) return Promise.resolve(null);
  if (imagePromiseCache.has(src)) {
    return imagePromiseCache.get(src);
  }
  const promise = new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  if (!src.startsWith("blob:")) {
    imagePromiseCache.set(src, promise);
  }
  return promise;
}

function getGrainPatternCanvas() {
  if (cachedGrainCanvas || typeof document === "undefined") {
    return cachedGrainCanvas;
  }
  const size = 160;
  const grain = document.createElement("canvas");
  grain.width = size;
  grain.height = size;
  const gCtx = grain.getContext("2d");
  if (!gCtx) return null;

  const imgData = gCtx.createImageData(size, size);
  const data = imgData.data;
  let seed = 1337;
  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = (seed >>> 24) & 0xff;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 12;
  }
  gCtx.putImageData(imgData, 0, 0);
  cachedGrainCanvas = grain;
  return cachedGrainCanvas;
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || "#ffffff").replace("#", "");
  if (clean.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLightInkColor(hex) {
  const clean = String(hex || "").toLowerCase();
  return clean === "#ffffff" || clean === "#f7eedd" || clean === "#f0cf7b";
}

function resolveCanvasFont(fontId) {
  const fontObj = CARD_FONTS.find((f) => f.id === fontId) || CARD_FONTS[0];
  if (typeof window !== "undefined" && fontObj.cssVar) {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue(fontObj.cssVar)
      .trim();
    if (val) return val;
  }
  return fontObj.fallback;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapVerseLines(ctx, text, maxWidth) {
  const paragraphs = String(text || "").split(/\n+/);
  const lines = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let current = "";
    for (let i = 0; i < words.length; i++) {
      const candidate = current ? `${current} ${words[i]}` : words[i];
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = words[i];
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}

async function renderVerseCard(canvas, config, isCancelled = () => false) {
  if (!canvas || isCancelled()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const activeFont = resolveCanvasFont(config.fontStyle);
  const modernFont = resolveCanvasFont("Modern");
  const fontWeight = config.fontStyle === "Book" ? 500 : 600;
  const italicPrefix = config.isItalic ? "italic " : "";

  if (typeof document !== "undefined" && document.fonts) {
    if (typeof document.fonts.load === "function") {
      await Promise.allSettled([
        document.fonts.load(`${italicPrefix}${fontWeight} 48px ${activeFont}`),
        document.fonts.load(`600 32px ${modernFont}`),
      ]);
      if (isCancelled()) return;
    }
    if (document.fonts.ready) {
      await document.fonts.ready;
      if (isCancelled()) return;
    }
  }

  const ratioObj =
    CARD_ASPECT_RATIOS.find((r) => r.id === config.aspectRatio) ||
    CARD_ASPECT_RATIOS[0];
  const width = ratioObj.width;
  const height = ratioObj.height;
  const bg = config.selectedBg;

  let loadedBgImage = null;
  if (bg.type === "image" && bg.src) {
    loadedBgImage = await loadCanvasImage(bg.src);
    if (isCancelled()) return;
  }

  canvas.width = width;
  canvas.height = height;

  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const scalar = minDim / 400;

  // 1. Background fill (image or rich-gradient)
  if (bg.type === "image" && bg.src) {
    if (loadedBgImage) {
      const scale = Math.max(width / loadedBgImage.width, height / loadedBgImage.height);
      const drawW = loadedBgImage.width * scale;
      const drawH = loadedBgImage.height * scale;
      const shiftX = (width - drawW) / 2;
      const shiftY = (height - drawH) / 2;
      ctx.drawImage(
        loadedBgImage,
        0,
        0,
        loadedBgImage.width,
        loadedBgImage.height,
        shiftX,
        shiftY,
        drawW,
        drawH
      );
    } else {
      ctx.fillStyle = "#151820";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    const angleRad = (((bg.angle ?? 145) - 90) * Math.PI) / 180;
    const dx = Math.cos(angleRad) * (width / 2);
    const dy = Math.sin(angleRad) * (height / 2);
    const grad = ctx.createLinearGradient(
      width / 2 - dx,
      height / 2 - dy,
      width / 2 + dx,
      height / 2 + dy
    );
    const palette = Array.isArray(bg.colors) && bg.colors.length > 0 ? bg.colors : ["#151820", "#1d2b44"];
    if (palette.length === 1) {
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[0]);
    } else {
      const step = 1 / (palette.length - 1);
      palette.forEach((c, idx) => grad.addColorStop(idx * step, c));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (bg.glow) {
      const gx = bg.glow.x * width;
      const gy = bg.glow.y * height;
      const gr = bg.glow.r * maxDim;
      const radial = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      radial.addColorStop(0, bg.glow.color);
      radial.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }

    if (bg.stars) {
      for (const s of STAR_FIELD) {
        const sx = s.x * width;
        const sy = s.y * height;
        ctx.fillStyle = s.gold
          ? `rgba(240, 207, 123, ${s.alpha})`
          : `rgba(255, 255, 255, ${s.alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * (scalar * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Overlay dimmer
  if (config.overlayOpacity > 0) {
    ctx.fillStyle = bg.isLight
      ? `rgba(28, 22, 16, ${config.overlayOpacity})`
      : `rgba(6, 8, 12, ${config.overlayOpacity})`;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Soft vignette
  if (config.showVignette) {
    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      minDim * 0.28,
      width / 2,
      height / 2,
      maxDim * 0.78
    );
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(1, bg.isLight ? "rgba(32, 24, 16, 0.16)" : "rgba(0, 0, 0, 0.44)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  // 4. Subtle paper/film grain
  if (config.showGrain) {
    const grainCanvas = getGrainPatternCanvas();
    if (grainCanvas) {
      const pattern = ctx.createPattern(grainCanvas, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  const lightInk = isLightInkColor(config.textColor);
  const accentColor = lightInk ? "#e8c56b" : "#9a6d12";
  const frameInset = Math.round(minDim * 0.055);
  const innerPadX = config.frame === "glass" ? Math.round(width * 0.13) : Math.round(width * 0.11);
  const maxTextWidth = width - innerPadX * 2;
  const formattedQuote =
    config.frame === "editorial"
      ? String(config.verseText || "").trim()
      : `\u201C${String(config.verseText || "").trim()}\u201D`;

  const bottomSafeMargin =
    config.frame === "framed"
      ? frameInset + Math.round(28 * scalar)
      : Math.round(36 * scalar);
  const topSafeMargin =
    config.frame === "framed"
      ? frameInset + Math.round(26 * scalar)
      : Math.round(34 * scalar);
  const availableHeight = height - topSafeMargin - bottomSafeMargin;

  // 5. Auto-fit typography calculation
  let fitScale = 1.0;
  let lines = [];
  let renderFontSize = Math.round(config.fontSize * scalar);
  let lineHeight = renderFontSize * 1.48;
  let tagSize = Math.round(13.5 * scalar);
  let crestHeight = 0;
  let dividerGap = 0;

  while (fitScale >= 0.42) {
    renderFontSize = Math.round(config.fontSize * scalar * fitScale);
    lineHeight = renderFontSize * 1.48;
    tagSize = Math.max(Math.round(11 * scalar), Math.round(13.5 * scalar * Math.max(0.76, fitScale)));
    crestHeight = config.frame === "editorial" ? Math.round(40 * scalar * fitScale) : 0;
    dividerGap =
      config.frame === "classic"
        ? Math.round(28 * scalar * Math.max(0.75, fitScale))
        : Math.round(20 * scalar * Math.max(0.75, fitScale));

    ctx.font = `${italicPrefix}${fontWeight} ${renderFontSize}px ${activeFont}`;
    lines = wrapVerseLines(ctx, formattedQuote, maxTextWidth);

    const needed = crestHeight + lines.length * lineHeight + dividerGap + tagSize * 1.4;
    if (needed <= availableHeight) {
      break;
    }
    fitScale -= 0.04;
  }

  const contentHeight = crestHeight + lines.length * lineHeight + dividerGap + tagSize * 1.2;
  const blockTopY = topSafeMargin + (availableHeight - contentHeight) / 2;

  // 6. Frame containers (glass panel / framed border)
  if (config.frame === "glass") {
    const panelPadX = Math.round(26 * scalar);
    const panelPadY = Math.round(28 * scalar);
    const panelX = innerPadX - panelPadX;
    const panelW = maxTextWidth + panelPadX * 2;
    const panelY = Math.max(frameInset, blockTopY - panelPadY);
    const panelH = Math.min(
      height - frameInset * 2,
      contentHeight + panelPadY * 2
    );

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = Math.round(24 * scalar);
    ctx.shadowOffsetY = Math.round(8 * scalar);
    drawRoundedRectPath(ctx, panelX, panelY, panelW, panelH, Math.round(14 * scalar));
    ctx.fillStyle = lightInk
      ? "rgba(12, 15, 22, 0.58)"
      : "rgba(255, 252, 245, 0.78)";
    ctx.fill();
    ctx.restore();

    drawRoundedRectPath(ctx, panelX, panelY, panelW, panelH, Math.round(14 * scalar));
    ctx.strokeStyle = lightInk
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(59, 45, 34, 0.18)";
    ctx.lineWidth = Math.max(1.5, Math.round(scalar * 0.7));
    ctx.stroke();
  } else if (config.frame === "framed") {
    const inset = frameInset;
    const rectW = width - inset * 2;
    const rectH = height - inset * 2;
    ctx.strokeStyle = hexToRgba(config.textColor, 0.24);
    ctx.lineWidth = Math.max(1.5, Math.round(scalar * 0.65));
    ctx.strokeRect(inset, inset, rectW, rectH);

    // Subtle corner ticks
    const tick = Math.round(14 * scalar);
    ctx.strokeStyle = hexToRgba(accentColor, 0.78);
    ctx.lineWidth = Math.max(2, Math.round(scalar * 0.9));
    ctx.beginPath();
    // Top-left
    ctx.moveTo(inset, inset + tick);
    ctx.lineTo(inset, inset);
    ctx.lineTo(inset + tick, inset);
    // Top-right
    ctx.moveTo(inset + rectW - tick, inset);
    ctx.lineTo(inset + rectW, inset);
    ctx.lineTo(inset + rectW, inset + tick);
    // Bottom-left
    ctx.moveTo(inset, inset + rectH - tick);
    ctx.lineTo(inset, inset + rectH);
    ctx.lineTo(inset + tick, inset + rectH);
    // Bottom-right
    ctx.moveTo(inset + rectW - tick, inset + rectH);
    ctx.lineTo(inset + rectW, inset + rectH);
    ctx.lineTo(inset + rectW, inset + rectH - tick);
    ctx.stroke();
  }

  // 7. Editorial opening quote crest
  const textX =
    config.alignment === "center"
      ? width / 2
      : config.alignment === "left"
        ? innerPadX
        : width - innerPadX;

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = config.alignment;

  if (config.frame === "editorial") {
    const crestSize = Math.round(52 * scalar * fitScale);
    ctx.font = `700 ${crestSize}px ${resolveCanvasFont("Classic")}`;
    ctx.fillStyle = hexToRgba(accentColor, 0.45);
    ctx.fillText("\u201C", textX, blockTopY + crestSize * 0.65);
  }

  // 8. Verse lines
  ctx.save();
  if (bg.type === "image" && lightInk) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.52)";
    ctx.shadowBlur = Math.round(10 * scalar);
    ctx.shadowOffsetY = Math.round(2 * scalar);
  } else if (!bg.isLight && lightInk) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = Math.round(6 * scalar);
    ctx.shadowOffsetY = Math.round(1.5 * scalar);
  }
  ctx.fillStyle = config.textColor;
  ctx.font = `${italicPrefix}${fontWeight} ${renderFontSize}px ${activeFont}`;

  let curY = blockTopY + crestHeight + renderFontSize * 0.92;
  for (const lineStr of lines) {
    ctx.fillText(lineStr, textX, curY);
    curY += lineHeight;
  }
  ctx.restore();

  // 9. Classic divider line + Scripture reference
  const refBlockY = blockTopY + crestHeight + lines.length * lineHeight + dividerGap * 0.35;
  if (config.frame === "classic") {
    const ruleW = Math.round(56 * scalar);
    const ruleX =
      config.alignment === "center"
        ? width / 2 - ruleW / 2
        : config.alignment === "left"
          ? innerPadX
          : width - innerPadX - ruleW;
    ctx.fillStyle = hexToRgba(accentColor, 0.78);
    ctx.fillRect(ruleX, refBlockY - dividerGap * 0.18, ruleW, Math.max(2, Math.round(scalar * 0.75)));
  }

  ctx.fillStyle = hexToRgba(config.textColor, 0.86);
  ctx.textAlign = config.alignment;
  ctx.font = `600 ${tagSize}px ${resolveCanvasFont("Modern")}`;
  const citationLabel = `\u2014 ${String(config.verseTag || "").toUpperCase()}`;
  ctx.fillText(citationLabel, textX, refBlockY + tagSize * 0.95);

  // 10. Optional brand mark
  if (config.showWatermark) {
    const markSize = Math.round(10 * scalar);
    const markInsetX = config.frame === "framed" ? frameInset + Math.round(16 * scalar) : Math.round(28 * scalar);
    const markInsetY = config.frame === "framed" ? frameInset + Math.round(14 * scalar) : Math.round(22 * scalar);
    ctx.fillStyle = hexToRgba(config.textColor, 0.45);
    ctx.textAlign = "right";
    ctx.font = `italic 600 ${markSize}px ${resolveCanvasFont("Modern")}`;
    ctx.fillText(config.brandHost, width - markInsetX, height - markInsetY);
  }
}

export default function VerseImageCreator({
  verseText,
  verseTag,
  onClose,
  embedded = false,
}) {
  const [selectedBg, setSelectedBg] = useState(CARD_BG_PRESETS[0]);
  const [bgCategory, setBgCategory] = useState("all");
  const [customUploadBg, setCustomUploadBg] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [frame, setFrame] = useState("classic");
  const [fontStyle, setFontStyle] = useState("Classic");
  const [isItalic, setIsItalic] = useState(true);
  const [fontSize, setFontSize] = useState(21);
  const [alignment, setAlignment] = useState("center");
  const [textColor, setTextColor] = useState(CARD_BG_PRESETS[0].defaultTextColor);
  const [overlayOpacity, setOverlayOpacity] = useState(CARD_BG_PRESETS[0].defaultOverlay);
  const [showVignette, setShowVignette] = useState(true);
  const [showGrain, setShowGrain] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [fileFormat, setFileFormat] = useState("image/jpeg");
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [toast, setToast] = useState(null);

  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const customUrlRef = useRef(null);
  const toastTimerRef = useRef(null);

  const brandHost = useSyncExternalStore(
    emptySubscribe,
    getHostSnapshot,
    getHostServerSnapshot
  );

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (customUrlRef.current) {
        URL.revokeObjectURL(customUrlRef.current);
        customUrlRef.current = null;
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const renderConfig = {
    verseText,
    verseTag,
    selectedBg,
    aspectRatio,
    frame,
    fontStyle,
    isItalic,
    fontSize,
    alignment,
    textColor,
    overlayOpacity,
    showVignette,
    showGrain,
    showWatermark,
    brandHost,
  };

  useEffect(() => {
    let cancelled = false;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    renderVerseCard(
      canvas,
      {
        verseText,
        verseTag,
        selectedBg,
        aspectRatio,
        frame,
        fontStyle,
        isItalic,
        fontSize,
        alignment,
        textColor,
        overlayOpacity,
        showVignette,
        showGrain,
        showWatermark,
        brandHost,
      },
      () => cancelled
    );
    return () => {
      cancelled = true;
    };
  }, [
    verseText,
    verseTag,
    selectedBg,
    aspectRatio,
    frame,
    fontStyle,
    isItalic,
    fontSize,
    alignment,
    textColor,
    overlayOpacity,
    showVignette,
    showGrain,
    showWatermark,
    brandHost,
  ]);

  const handleSelectPreset = (preset) => {
    setSelectedBg(preset);
    setTextColor(preset.defaultTextColor);
    setOverlayOpacity(preset.defaultOverlay);
  };

  const handleUploadPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select an image file.");
      return;
    }

    if (customUrlRef.current) {
      URL.revokeObjectURL(customUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    customUrlRef.current = objectUrl;

    const customPreset = {
      id: "custom-upload",
      name: "Your Photo",
      category: "textures",
      type: "image",
      src: objectUrl,
      colors: ["#151820", "#1d2b44"],
      defaultTextColor: "#ffffff",
      defaultOverlay: 0.28,
      previewBg: `url("${objectUrl}")`,
    };
    setCustomUploadBg(customPreset);
    setSelectedBg(customPreset);
    setTextColor("#ffffff");
    setOverlayOpacity(0.28);
    e.target.value = "";
  };

  const handleDownload = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    try {
      await renderVerseCard(canvas, renderConfig);
      const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
      const quality = fileFormat === "image/jpeg" ? 0.92 : undefined;
      const url = canvas.toDataURL(fileFormat, quality);
      const slug = String(verseTag || "Verse").replace(/[^a-zA-Z0-9]+/g, "_");

      const a = document.createElement("a");
      a.href = url;
      a.download = `PraisePage_${slug}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("ok", `Saved ${ext.toUpperCase()}!`);
    } catch (err) {
      console.error("Canvas export failed:", err);
      showToast("error", "Could not export image in this browser.");
    }
  };

  const handleCopyImage = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    if (
      typeof ClipboardItem === "undefined" ||
      !navigator.clipboard?.write
    ) {
      showToast("error", "Image copy isn\u2019t supported here \u2014 try Download.");
      return;
    }

    try {
      await renderVerseCard(canvas, renderConfig);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to encode PNG");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showToast("ok", "Image copied to clipboard!");
    } catch (err) {
      console.error("Clipboard image copy failed:", err);
      showToast("error", "Could not copy image \u2014 try Download instead.");
    }
  };

  const handleShare = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    try {
      await renderVerseCard(canvas, renderConfig);
      const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
      const quality = fileFormat === "image/jpeg" ? 0.92 : undefined;
      const filename = `PraisePage_Verse_${String(verseTag || "Verse").replace(/\s+/g, "_")}.${ext}`;

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, fileFormat, quality)
      );
      if (blob) {
        const file = new File([blob], filename, { type: fileFormat });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Daily Word of PraisePage",
              text: `"${verseText}" - ${verseTag}`,
            });
            showToast("ok", "Shared card!");
            return;
          } catch (err) {
            if (err?.name === "AbortError") return;
          }
        }
      }
    } catch (err) {
      console.error("Native share check failed:", err);
    }

    setShowSharePopover((prev) => !prev);
  };

  const ratioInfo =
    CARD_ASPECT_RATIOS.find((r) => r.id === aspectRatio) ||
    CARD_ASPECT_RATIOS[0];
  const activeInk =
    CARD_INK_COLORS.find((ink) => ink.hex.toLowerCase() === textColor.toLowerCase()) ||
    null;

  const allPresets = customUploadBg
    ? [customUploadBg, ...CARD_BG_PRESETS]
    : CARD_BG_PRESETS;
  const visiblePresets =
    bgCategory === "all"
      ? allPresets
      : allPresets.filter((p) => p.category === bgCategory);

  const shareText = encodeURIComponent(
    `"${verseText}" \u2014 ${verseTag} via ${brandHost}`
  );
  const shareUrl = encodeURIComponent(`https://${brandHost}`);

  return (
    <div>
      {!embedded && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.6rem",
          }}
        >
          <h3 style={{ fontSize: "1.9rem", fontWeight: 700, margin: 0 }}>
            Shareable Verse Card
          </h3>
          {onClose && (
            <button
              type="button"
              className="study-modal-close"
              onClick={onClose}
              aria-label="Close card creator"
            >
              <i className="ri-close-line" aria-hidden="true"></i>
            </button>
          )}
        </div>
      )}

      <div className="vc-studio">
        {/* Left: Sticky WYSIWYG Live Canvas Preview */}
        <div className="vc-preview-col">
          <div className="vc-canvas-frame">
            <canvas
              ref={previewCanvasRef}
              width={ratioInfo.width}
              height={ratioInfo.height}
              style={{ aspectRatio: `${ratioInfo.width} / ${ratioInfo.height}` }}
              className="vc-canvas-preview"
              aria-label={`Live preview of ${verseTag} scripture card`}
            />
          </div>
          <span className="vc-preview-meta">
            {ratioInfo.label} ({ratioInfo.short}) &bull; {ratioInfo.width} &times; {ratioInfo.height} px
          </span>
        </div>

        {/* Right: Studio Controls */}
        <div className="vc-controls-col">
          {/* Aspect Ratio */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Aspect Ratio</span>
              <span className="vc-value-badge">{ratioInfo.short}</span>
            </div>
            <div className="vc-ratio-grid">
              {CARD_ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={`vc-chip${aspectRatio === r.id ? " active" : ""}`}
                >
                  <i className={r.icon} aria-hidden="true"></i>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Gallery + Photo Upload */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Backdrop</span>
              <div className="vc-bg-tabs">
                {[
                  { id: "all", label: "All" },
                  { id: "sanctuary", label: "Sanctuary" },
                  { id: "textures", label: "Textures" },
                  { id: "minimal", label: "Minimal" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBgCategory(tab.id)}
                    className={`vc-bg-tab${bgCategory === tab.id ? " active" : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="vc-bg-grid">
              {visiblePresets.map((preset) => {
                const isSelected = selectedBg.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    title={preset.name}
                    className={`vc-bg-swatch${isSelected ? " active" : ""}`}
                    style={{
                      backgroundImage: preset.previewBg,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {isSelected && (
                      <span className="vc-bg-swatch-check">
                        <i className="ri-check-line" aria-hidden="true"></i>
                      </span>
                    )}
                    <span className="vc-bg-swatch-label">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="vc-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="ri-upload-cloud-2-line" aria-hidden="true"></i>
              <span>Upload Custom Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              style={{ display: "none" }}
              aria-label="Upload custom card background photo"
            />
          </div>

          {/* Editorial Frame */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Frame Style</span>
            </div>
            <div className="vc-frame-grid">
              {CARD_FRAMES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrame(f.id)}
                  className={`vc-chip${frame === f.id ? " active" : ""}`}
                  title={f.desc}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mood & Overlay Adjustments */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Overlay Dimmer</span>
              <span className="vc-value-badge">{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <div className="vc-slider-row">
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number.parseFloat(e.target.value))}
                className="vc-range"
                aria-label="Background overlay dimmer"
              />
            </div>
            <div className="vc-toggle-row">
              <button
                type="button"
                onClick={() => setShowVignette((v) => !v)}
                className={`vc-toggle-pill${showVignette ? " active" : ""}`}
                aria-pressed={showVignette}
              >
                <i className={showVignette ? "ri-check-line" : "ri-add-line"} aria-hidden="true"></i>
                Vignette
              </button>
              <button
                type="button"
                onClick={() => setShowGrain((v) => !v)}
                className={`vc-toggle-pill${showGrain ? " active" : ""}`}
                aria-pressed={showGrain}
              >
                <i className={showGrain ? "ri-check-line" : "ri-add-line"} aria-hidden="true"></i>
                Film Grain
              </button>
              <button
                type="button"
                onClick={() => setShowWatermark((v) => !v)}
                className={`vc-toggle-pill${showWatermark ? " active" : ""}`}
                aria-pressed={showWatermark}
              >
                <i className={showWatermark ? "ri-check-line" : "ri-add-line"} aria-hidden="true"></i>
                Show Brand Mark
              </button>
            </div>
          </div>

          {/* Typography */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Typography</span>
              <button
                type="button"
                onClick={() => setIsItalic((v) => !v)}
                className={`vc-toggle-pill${isItalic ? " active" : ""}`}
                aria-pressed={isItalic}
              >
                <i className={isItalic ? "ri-check-line" : "ri-add-line"} aria-hidden="true"></i>
                Italic
              </button>
            </div>
            <div className="vc-font-grid">
              {CARD_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontStyle(f.id)}
                  className={`vc-chip${fontStyle === f.id ? " active" : ""}`}
                  style={{ fontFamily: f.cssVar ? `var(${f.cssVar}), ${f.fallback}` : f.fallback }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Text Size</span>
              <span className="vc-value-badge">{fontSize}px</span>
            </div>
            <div className="vc-slider-row">
              <input
                type="range"
                min="14"
                max="32"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number.parseInt(e.target.value, 10))}
                className="vc-range"
                aria-label="Verse font size"
              />
            </div>
          </div>

          {/* Ink Color */}
          <div className="vc-group">
            <div className="vc-group-head">
              <span className="vc-label">Ink Color</span>
              <span className="vc-value-badge">{activeInk?.name || "Custom"}</span>
            </div>
            <div className="vc-ink-row">
              {CARD_INK_COLORS.map((ink) => {
                const isSelected = textColor === ink.hex;
                const checkColor = isLightInkColor(ink.hex) ? "#181b22" : "#ffffff";
                return (
                  <button
                    key={ink.id}
                    type="button"
                    onClick={() => setTextColor(ink.hex)}
                    title={ink.name}
                    aria-label={`Ink color: ${ink.name}`}
                    aria-pressed={isSelected}
                    className={`vc-ink-dot${isSelected ? " active" : ""}`}
                    style={{ backgroundColor: ink.hex, color: checkColor }}
                  >
                    {isSelected && <i className="ri-check-line" aria-hidden="true"></i>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alignment & Format */}
          <div className="vc-inline-grid">
            <div className="vc-group">
              <span className="vc-label">Alignment</span>
              <div className="vc-pill-row">
                {["left", "center", "right"].map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setAlignment(align)}
                    className={`vc-chip${alignment === align ? " active" : ""}`}
                    aria-label={`Align ${align}`}
                  >
                    <i className={`ri-align-${align}`} aria-hidden="true"></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="vc-group">
              <span className="vc-label">Format</span>
              <div className="vc-pill-row">
                {[
                  { id: "image/jpeg", label: "JPG" },
                  { id: "image/png", label: "PNG" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFileFormat(fmt.id)}
                    className={`vc-chip${fileFormat === fmt.id ? " active" : ""}`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Export & Share Bar */}
          <div className="vc-group">
            <div className="vc-export-bar">
              <button
                type="button"
                onClick={handleDownload}
                className="study-btn-primary"
              >
                <i className="ri-download-2-line" aria-hidden="true"></i>
                Download {fileFormat === "image/jpeg" ? "JPG" : "PNG"}
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="study-btn-secondary"
              >
                <i className="ri-file-copy-line" aria-hidden="true"></i>
                Copy Image
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="study-btn-secondary"
                aria-expanded={showSharePopover}
              >
                <i className="ri-share-forward-line" aria-hidden="true"></i>
                Share
              </button>
            </div>

            {toast && (
              <div
                className={`vc-toast${toast.type === "error" ? " error" : ""}`}
                role={toast.type === "error" ? "alert" : "status"}
              >
                <i
                  className={
                    toast.type === "ok"
                      ? "ri-checkbox-circle-line"
                      : "ri-error-warning-line"
                  }
                  aria-hidden="true"
                ></i>
                {toast.message}
              </div>
            )}

            {showSharePopover && (
              <div className="vc-share-popover">
                <a
                  href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vc-share-link"
                >
                  <i className="ri-whatsapp-line" aria-hidden="true"></i>
                  WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vc-share-link"
                >
                  <i className="ri-twitter-line" aria-hidden="true"></i>
                  X / Twitter
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vc-share-link"
                >
                  <i className="ri-facebook-circle-line" aria-hidden="true"></i>
                  Facebook
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
