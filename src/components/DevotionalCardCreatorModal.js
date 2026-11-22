"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  CARD_BG_PRESETS,
  CARD_INK_COLORS,
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

const STAR_FIELD = Array.from({ length: 64 }, (_, idx) => {
  const s1 = Math.sin((idx + 1) * 12.9898) * 43758.5453;
  const s2 = Math.sin((idx + 1) * 78.233) * 24634.6345;
  const s3 = Math.sin((idx + 1) * 45.164) * 19283.4712;
  return {
    x: s1 - Math.floor(s1),
    y: (s2 - Math.floor(s2)) * 0.88,
    r: 0.8 + (s3 - Math.floor(s3)) * 1.8,
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

function wrapTextJustified(ctx, text, maxW, font) {
  ctx.font = font;
  const paragraphs = String(text || "").split("\n");
  const allLines = [];

  paragraphs.forEach((para) => {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || (words.length === 1 && words[0] === "")) {
      allLines.push({ words: [], isLastLineOfParagraph: true });
      return;
    }

    let currentLineWords = [];
    let currentWidth = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = ctx.measureText(word).width;
      const spaceWidth = ctx.measureText(" ").width;
      const testWidth =
        currentWidth + (currentLineWords.length > 0 ? spaceWidth : 0) + wordWidth;

      if (testWidth > maxW && currentLineWords.length > 0) {
        allLines.push({ words: currentLineWords, isLastLineOfParagraph: false });
        currentLineWords = [word];
        currentWidth = wordWidth;
      } else {
        currentLineWords.push(word);
        currentWidth = testWidth;
      }
    }
    if (currentLineWords.length > 0) {
      allLines.push({ words: currentLineWords, isLastLineOfParagraph: true });
    }
  });

  return allLines;
}

function fitLineToWidth(ctx, text, maxW, ellipsis = "...") {
  let out = String(text || "");
  if (ctx.measureText(out).width <= maxW) return out;
  while (out.length > 5 && ctx.measureText(out + ellipsis).width > maxW) {
    out = out.slice(0, -1);
  }
  return `${out}${ellipsis}`;
}

async function renderDevotionalCard(canvas, config, isCancelled = () => false) {
  if (!canvas || isCancelled()) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const selectedFamily = resolveCanvasFont(config.fontStyle);
  const modernFamily = resolveCanvasFont("Modern");
  if (document.fonts) {
    if (typeof document.fonts.load === "function") {
      await Promise.allSettled([
        document.fonts.load(`400 48px ${selectedFamily}`),
        document.fonts.load(`600 48px ${modernFamily}`),
      ]);
      if (isCancelled()) return;
    }
    try {
      await document.fonts.ready;
      if (isCancelled()) return;
    } catch {
      // Proceed cleanly with loaded fonts
    }
  }

  const canvasWidth = 1080;
  const canvasHeight = 1920;
  const bg = config.selectedBg || CARD_BG_PRESETS[0];

  let loadedBgImage = null;
  if (bg.type === "image") {
    loadedBgImage = await loadCanvasImage(bg.src);
    if (isCancelled()) return;
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 1. Background
  if (bg.type === "image" && loadedBgImage) {
    const hRatio = canvasWidth / loadedBgImage.width;
    const vRatio = canvasHeight / loadedBgImage.height;
    const ratio = Math.max(hRatio, vRatio);
    const shiftX = (canvasWidth - loadedBgImage.width * ratio) / 2;
    const shiftY = (canvasHeight - loadedBgImage.height * ratio) / 2;
    ctx.drawImage(
      loadedBgImage,
      0,
      0,
      loadedBgImage.width,
      loadedBgImage.height,
      shiftX,
      shiftY,
      loadedBgImage.width * ratio,
      loadedBgImage.height * ratio
    );
  } else if (bg.type === "solid" && Array.isArray(bg.colors) && bg.colors[0]) {
    ctx.fillStyle = bg.colors[0];
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    const angleRad = (((bg.angle ?? 145) - 90) * Math.PI) / 180;
    const dx = Math.cos(angleRad) * (canvasWidth / 2);
    const dy = Math.sin(angleRad) * (canvasHeight / 2);
    const grad = ctx.createLinearGradient(
      canvasWidth / 2 - dx,
      canvasHeight / 2 - dy,
      canvasWidth / 2 + dx,
      canvasHeight / 2 + dy
    );
    const palette =
      Array.isArray(bg.colors) && bg.colors.length > 0
        ? bg.colors
        : ["#151820", "#1d2b44"];
    if (palette.length === 1) {
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(1, palette[0]);
    } else {
      const step = 1 / (palette.length - 1);
      palette.forEach((color, idx) => {
        grad.addColorStop(idx * step, color);
      });
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (bg.glow) {
      const gx = bg.glow.x * canvasWidth;
      const gy = bg.glow.y * canvasHeight;
      const gr = bg.glow.r * Math.max(canvasWidth, canvasHeight);
      const radial = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      radial.addColorStop(0, bg.glow.color);
      radial.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    if (bg.stars) {
      const scalar = Math.min(canvasWidth, canvasHeight) / 400;
      for (const s of STAR_FIELD) {
        ctx.fillStyle = s.gold
          ? `rgba(240, 207, 123, ${s.alpha})`
          : `rgba(255, 255, 255, ${s.alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(s.x * canvasWidth, s.y * canvasHeight, s.r * scalar * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Contrast dimmer overlay
  if (config.overlayOpacity > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${config.overlayOpacity})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 3. Optional radial vignette
  if (config.showVignette) {
    const vig = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      canvasWidth * 0.28,
      canvasWidth / 2,
      canvasHeight / 2,
      Math.max(canvasWidth, canvasHeight) * 0.78
    );
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(1, "rgba(0, 0, 0, 0.36)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 4. Optional film grain
  if (config.showGrain) {
    const grainCanvas = getGrainPatternCanvas();
    if (grainCanvas) {
      const pattern = ctx.createPattern(grainCanvas, "repeat");
      if (pattern) {
        ctx.save();
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      }
    }
  }

  // 5. Compute optimal typography scale
  const marginX = canvasWidth * 0.085;
  const maxTextWidth = canvasWidth - marginX * 2;
  const fontStack = selectedFamily;

  let optimalScale = 1.0;
  while (optimalScale > 0.4) {
    const scaledFontSize = Math.round(config.fontSize * optimalScale * 4);
    const headerSize = Math.round(8 * 4 * optimalScale);
    const planTitleSize = Math.round(11 * 4 * optimalScale);
    const dayTitleSize = Math.round(10 * 4 * optimalScale);
    const teachingSize = Math.round(scaledFontSize * 0.95);

    const lines = wrapTextJustified(
      ctx,
      config.reflection,
      maxTextWidth,
      `${teachingSize}px ${fontStack}`
    );
    const totalNeeded =
      60 +
      headerSize * 1.5 +
      planTitleSize * 1.35 +
      15 +
      dayTitleSize * 1.3 +
      35 +
      lines.length * teachingSize * 1.45 +
      90;

    if (totalNeeded <= canvasHeight - 160) break;
    optimalScale -= 0.05;
  }

  const scaledFontSize = Math.round(config.fontSize * optimalScale * 4);
  const headerSize = Math.round(8 * 4 * optimalScale);
  const planTitleSize = Math.round(11 * 4 * optimalScale);
  const dayTitleSize = Math.round(10 * 4 * optimalScale);
  const teachingSize = Math.round(scaledFontSize * 0.95);
  const watermarkSize = Math.round(24);

  const teachingLines = wrapTextJustified(
    ctx,
    config.reflection,
    maxTextWidth,
    `${teachingSize}px ${fontStack}`
  );
  const planTitleHeight = planTitleSize * 1.35;
  const dayTitleHeight = dayTitleSize * 1.3;
  const teachingHeight = teachingLines.length * teachingSize * 1.45;
  const totalNeededHeight =
    60 +
    headerSize * 1.5 +
    planTitleHeight +
    15 +
    dayTitleHeight +
    35 +
    teachingHeight +
    60;

  let startY = (canvasHeight - totalNeededHeight) / 2;
  if (startY < 75) startY = 75;

  const lightInk = isLightInkColor(config.textColor);

  ctx.save();
  if (bg.type === "image" && lightInk) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.52)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;
  }

  // Category header
  ctx.font = `600 ${headerSize}px ${modernFamily}`;
  ctx.fillStyle = lightInk ? "rgba(255, 255, 255, 0.72)" : "rgba(24, 27, 34, 0.65)";
  ctx.textAlign = "center";
  ctx.fillText(
    `${String(config.category || "Daily").toUpperCase()} DEVOTIONAL`,
    canvasWidth / 2,
    startY
  );
  startY += headerSize * 1.6;

  // Plan title
  ctx.font = `700 ${planTitleSize}px ${fontStack}`;
  ctx.fillStyle = config.textColor;
  ctx.fillText(fitLineToWidth(ctx, config.planTitle, maxTextWidth), canvasWidth / 2, startY);
  startY += planTitleHeight + 15;

  // Day subtitle
  ctx.font = `600 ${dayTitleSize}px ${modernFamily}`;
  ctx.fillStyle = lightInk ? "#f0cf7b" : "#237a3b";
  ctx.fillText(
    fitLineToWidth(ctx, `Day ${config.day}: ${config.dayTitle}`, maxTextWidth),
    canvasWidth / 2,
    startY
  );
  startY += dayTitleHeight + 40;

  // Justified reflection paragraphs
  ctx.font = `${teachingSize}px ${fontStack}`;
  ctx.fillStyle = lightInk ? "rgba(255, 255, 255, 0.92)" : "rgba(24, 27, 34, 0.88)";

  teachingLines.forEach((line) => {
    if (line.words.length === 0) {
      startY += teachingSize * 0.8;
      return;
    }

    if (line.isLastLineOfParagraph || line.words.length <= 1) {
      ctx.textAlign = "left";
      ctx.fillText(line.words.join(" "), marginX, startY);
    } else {
      ctx.textAlign = "left";
      const totalWordsWidth = line.words.reduce(
        (sum, w) => sum + ctx.measureText(w).width,
        0
      );
      const remainingSpace = maxTextWidth - totalWordsWidth;
      const gapWidth = remainingSpace / (line.words.length - 1);
      let curX = marginX;

      line.words.forEach((word) => {
        ctx.fillText(word, curX, startY);
        curX += ctx.measureText(word).width + gapWidth;
      });
    }
    startY += teachingSize * 1.45;
  });
  ctx.restore();

  // Brand footer watermark
  if (config.showWatermark) {
    ctx.fillStyle = lightInk ? "rgba(255, 255, 255, 0.45)" : "rgba(24, 27, 34, 0.45)";
    ctx.textAlign = "right";
    ctx.font = `italic 600 ${watermarkSize}px ${modernFamily}`;
    ctx.fillText(config.brandHost, canvasWidth - 60, canvasHeight - 48);
  }
}

export default function DevotionalCardCreatorModal({
  planTitle,
  category,
  dayObj,
  onClose,
}) {
  const [selectedBg, setSelectedBg] = useState(CARD_BG_PRESETS[0]);
  const [bgCategory, setBgCategory] = useState("all");
  const [customUploadBg, setCustomUploadBg] = useState(null);
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState(CARD_BG_PRESETS[0].defaultTextColor);
  const [fontStyle, setFontStyle] = useState("Modern");
  const [overlayOpacity, setOverlayOpacity] = useState(
    CARD_BG_PRESETS[0].defaultOverlay
  );
  const [showVignette, setShowVignette] = useState(true);
  const [showGrain, setShowGrain] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [fileFormat, setFileFormat] = useState("image/jpeg");
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [toast, setToast] = useState(null);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const customUrlRef = useRef(null);
  const toastTimerRef = useRef(null);

  const brandHost = useSyncExternalStore(
    emptySubscribe,
    getHostSnapshot,
    getHostServerSnapshot
  );

  const day = dayObj?.day ?? 1;
  const dayTitle = dayObj?.title || "";
  const reflection = dayObj?.reflection || "";

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

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
    planTitle,
    category,
    day,
    dayTitle,
    reflection,
    selectedBg,
    fontStyle,
    fontSize,
    textColor,
    overlayOpacity,
    showVignette,
    showGrain,
    showWatermark,
    brandHost,
  };

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderDevotionalCard(
      canvas,
      {
        planTitle,
        category,
        day,
        dayTitle,
        reflection,
        selectedBg,
        fontStyle,
        fontSize,
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
    planTitle,
    category,
    day,
    dayTitle,
    reflection,
    selectedBg,
    fontStyle,
    fontSize,
    textColor,
    overlayOpacity,
    showVignette,
    showGrain,
    showWatermark,
    brandHost,
  ]);

  const handleSelectBg = (preset) => {
    setSelectedBg(preset);
    setTextColor(preset.defaultTextColor || "#ffffff");
    setOverlayOpacity(preset.defaultOverlay ?? 0.25);
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      await renderDevotionalCard(canvas, renderConfig);
      const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
      const quality = fileFormat === "image/jpeg" ? 0.92 : undefined;
      const url = canvas.toDataURL(fileFormat, quality);
      const slug = String(dayTitle || "Reflection").replace(/\s+/g, "_");

      const a = document.createElement("a");
      a.href = url;
      a.download = `Devotional_Day_${day}_${slug}.${ext}`;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (
      typeof ClipboardItem === "undefined" ||
      !navigator.clipboard?.write
    ) {
      showToast("error", "Image copy isn\u2019t supported here \u2014 try Download.");
      return;
    }

    try {
      await renderDevotionalCard(canvas, renderConfig);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      await renderDevotionalCard(canvas, renderConfig);
      const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
      const quality = fileFormat === "image/jpeg" ? 0.92 : undefined;
      const filename = `Devotional_Day_${day}.${ext}`;

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, fileFormat, quality)
      );
      if (blob) {
        const file = new File([blob], filename, { type: fileFormat });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Devotional - Day ${day}`,
              text: `Reflection teaching for Day ${day} of the devotional plan: ${planTitle}`,
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

  if (typeof document === "undefined") return null;

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
    `Reflection for Devotional: ${planTitle} (Day ${day}) via ${brandHost}`
  );
  const shareUrl = encodeURIComponent(`https://${brandHost}`);

  const modalContent = (
    <div
      className="study-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Create Devotional Card"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="study-modal-dialog wide">
        <div className="study-modal-header">
          <div className="study-modal-title-group">
            <span className="study-modal-eyebrow">
              Day {day} &bull; {category} Devotional
            </span>
            <h3 className="study-modal-title">Create Devotional Card</h3>
          </div>

          <button
            type="button"
            className="study-modal-close"
            onClick={onClose}
            aria-label="Close devotional card creator"
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <div className="study-creator-wrap">
          <div className="vc-studio">
            {/* Left: Sticky WYSIWYG Live 9:16 Canvas Preview */}
            <div className="vc-preview-col">
              <div className="vc-canvas-frame">
                <canvas
                  ref={canvasRef}
                  width={1080}
                  height={1920}
                  style={{ aspectRatio: "9 / 16" }}
                  className="vc-canvas-preview"
                  aria-label={`Live preview of Day ${day} devotional card`}
                />
              </div>
              <span className="vc-preview-meta">
                Story (9:16) &bull; 1080 &times; 1920 px
              </span>
            </div>

            {/* Right: Studio Controls */}
            <div className="vc-controls-col">
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
                        onClick={() => handleSelectBg(preset)}
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

              {/* Font Size & Format */}
              <div className="vc-inline-grid">
                <div className="vc-group">
                  <div className="vc-group-head">
                    <span className="vc-label">Text Size</span>
                    <span className="vc-value-badge">{fontSize}px</span>
                  </div>
                  <div className="vc-slider-row">
                    <input
                      type="range"
                      min="12"
                      max="22"
                      step="1"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number.parseInt(e.target.value, 10))}
                      className="vc-range"
                      aria-label="Reflection font size"
                    />
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
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
