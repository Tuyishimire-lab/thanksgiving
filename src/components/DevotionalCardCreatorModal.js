"use client";

import { useState, useRef } from "react";

const BG_PRESETS = [
  { name: "Gold Watercolor", value: "url(/assets/images/card_bgs/gold_watercolor.png)", type: "image", src: "/assets/images/card_bgs/gold_watercolor.png" },
  { name: "Autumn Leaves", value: "url(/assets/images/card_bgs/autumn_leaves.png)", type: "image", src: "/assets/images/card_bgs/autumn_leaves.png" },
  { name: "Moody Forest", value: "url(/assets/images/card_bgs/moody_forest.png)", type: "image", src: "/assets/images/card_bgs/moody_forest.png" },
  { name: "Marble Gold", value: "url(/assets/images/card_bgs/marble_gold.png)", type: "image", src: "/assets/images/card_bgs/marble_gold.png" },
  { name: "Deep Slate", value: "#131417", type: "solid", colors: ["#131417"] },
  { name: "Sunset", value: "linear-gradient(45deg, #ff5e62, #ff9966)", type: "gradient", colors: ["#ff5e62", "#ff9966"] },
  { name: "Ocean", value: "linear-gradient(45deg, #12bcfe, #00f2fe)", type: "gradient", colors: ["#12bcfe", "#00f2fe"] },
  { name: "Lavender", value: "linear-gradient(45deg, #a767e5, #c893f9)", type: "gradient", colors: ["#a767e5", "#c893f9"] }
];

export default function DevotionalCardCreatorModal({ planTitle, category, dayObj, onClose }) {
  const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0]);
  const [fontSize, setFontSize] = useState(16); // base px in preview
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontStyle, setFontStyle] = useState("Modern"); // "Modern", "Classic", "Typewriter", "Handwritten"
  const [overlayOpacity, setOverlayOpacity] = useState(0.35); // background dimmer overlay
  const [fileFormat, setFileFormat] = useState("image/jpeg");
  
  const canvasRef = useRef(null);

  const { day, title: dayTitle, reflection } = dayObj;

  const aspectRatio = "9:16";

  // Resolve font-family stack
  const getFontFamily = (style) => {
    switch (style) {
      case "Classic":
        return `'Playfair Display', Georgia, serif`;
      case "Typewriter":
        return `'Courier New', Courier, monospace`;
      case "Handwritten":
        return `'Caveat', cursive, 'Brush Script MT', sans-serif`;
      case "Modern":
      default:
        return `'Poppins', 'Segoe UI', Roboto, sans-serif`;
    }
  };

  // Helper to wrap text into lines of words for canvas rendering (essential for spacing justification)
  const wrapTextJustified = (ctx, text, maxW, font) => {
    ctx.font = font;
    const paragraphs = text.split("\n");
    const allLines = []; // array of { words: string[], isLastLineOfParagraph: boolean }

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
        const testWidth = currentWidth + (currentLineWords.length > 0 ? spaceWidth : 0) + wordWidth;

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
  };

  // Real-time calculation of optimal scale factor to ensure the card fits perfectly inside canvas boundaries
  const getOptimalScale = () => {
    if (typeof document === "undefined") return 1.0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 1.0;

    const canvasWidth = 1080;
    const canvasHeight = 1920;
    const marginX = canvasWidth * 0.08;
    const maxTextWidth = canvasWidth - marginX * 2;
    const fontStack = getFontFamily(fontStyle);

    let currentScale = 1.0;
    let layoutFits = false;

    while (currentScale > 0.4 && !layoutFits) {
      const scaledFontSize = Math.round(fontSize * currentScale * 2.16);
      const headerSize = Math.round(8 * 2.16 * currentScale);
      const planTitleSize = Math.round(11 * 2.16 * currentScale);
      const dayTitleSize = Math.round(10 * 2.16 * currentScale);
      const teachingSize = Math.round(scaledFontSize * 0.95);

      const teachingLines = wrapTextJustified(ctx, reflection, maxTextWidth, `${teachingSize}px ${fontStack}`);
      
      const planTitleHeight = planTitleSize * 1.35;
      const dayTitleHeight = dayTitleSize * 1.3;
      const teachingHeight = teachingLines.length * teachingSize * 1.45;

      const totalNeededHeight = 
        60 + 
        headerSize * 1.5 + 
        planTitleHeight + 15 +
        dayTitleHeight + 35 +
        teachingHeight + 60;

      if (totalNeededHeight <= canvasHeight - 100) {
        layoutFits = true;
      } else {
        currentScale -= 0.05; // shrink
      }
    }
    return currentScale;
  };

  const optimalScale = getOptimalScale();

  const renderCanvas = (canvas) => {
    return new Promise((resolve) => {
      const ctx = canvas.getContext("2d");

      const canvasWidth = 1080;
      const canvasHeight = 1920;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const drawContentAndResolve = () => {
        const marginX = canvasWidth * 0.08;
        const maxTextWidth = canvasWidth - marginX * 2;

        const fontStack = getFontFamily(fontStyle);
        const scaledFontSize = Math.round(fontSize * optimalScale * 2.16);

        // Title and body font sizes based on optimal calculated scale
        const headerSize = Math.round(8 * 2.16 * optimalScale);
        const planTitleSize = Math.round(11 * 2.16 * optimalScale);
        const dayTitleSize = Math.round(10 * 2.16 * optimalScale);
        const teachingSize = Math.round(scaledFontSize * 0.95);
        const watermarkSize = Math.round(9 * 2.16 * optimalScale);

        const teachingLines = wrapTextJustified(ctx, reflection, maxTextWidth, `${teachingSize}px ${fontStack}`);

        const planTitleHeight = planTitleSize * 1.35;
        const dayTitleHeight = dayTitleSize * 1.3;
        const teachingHeight = teachingLines.length * teachingSize * 1.45;

        const totalNeededHeight = 
          60 + 
          headerSize * 1.5 + 
          planTitleHeight + 15 +
          dayTitleHeight + 35 +
          teachingHeight + 60;

        let startY = (canvasHeight - totalNeededHeight) / 2;
        if (startY < 45) startY = 45;

        ctx.fillStyle = textColor;

        // 1. Draw Category (Centered)
        ctx.font = `600 ${headerSize}px ${fontStack}`;
        ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)";
        ctx.textAlign = "center";
        ctx.fillText(`${category.toUpperCase()} DEVOTIONAL`, canvasWidth / 2, startY);
        startY += headerSize * 1.6;

        // 2. Draw Plan Title (Centered, truncated to single sentence/line)
        ctx.font = `bold ${planTitleSize}px ${fontStack}`;
        ctx.fillStyle = textColor;
        let planTitleTxt = planTitle;
        if (ctx.measureText(planTitleTxt).width > maxTextWidth) {
          while (planTitleTxt.length > 5 && ctx.measureText(planTitleTxt + "...").width > maxTextWidth) {
            planTitleTxt = planTitleTxt.substring(0, planTitleTxt.length - 1);
          }
          planTitleTxt += "...";
        }
        ctx.fillText(planTitleTxt, canvasWidth / 2, startY);
        startY += planTitleHeight + 15;

        // 3. Draw Day Theme (Centered, truncated to single line)
        ctx.font = `600 ${dayTitleSize}px ${fontStack}`;
        ctx.fillStyle = textColor === "#ffffff" ? "#fad648" : "var(--accent-color)";
        let dayTitleTxt = `Day ${day}: ${dayTitle}`;
        if (ctx.measureText(dayTitleTxt).width > maxTextWidth) {
          while (dayTitleTxt.length > 10 && ctx.measureText(dayTitleTxt + "...").width > maxTextWidth) {
            dayTitleTxt = dayTitleTxt.substring(0, dayTitleTxt.length - 1);
          }
          dayTitleTxt += "...";
        }
        ctx.fillText(dayTitleTxt, canvasWidth / 2, startY);
        startY += dayTitleHeight + 35;

        // 4. Draw Reflection Teaching Content (Justified alignment)
        ctx.font = `${teachingSize}px ${fontStack}`;
        ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.85)";

        teachingLines.forEach(line => {
          if (line.words.length === 0) {
            startY += teachingSize * 0.8;
            return;
          }

          if (line.isLastLineOfParagraph || line.words.length <= 1) {
            // Left-aligned standard text for single word lines and last lines
            ctx.textAlign = "left";
            ctx.fillText(line.words.join(" "), marginX, startY);
          } else {
            // Justified word layout distribution
            ctx.textAlign = "left";
            const totalWordsWidth = line.words.reduce((sum, w) => sum + ctx.measureText(w).width, 0);
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

        // 5. Watermark branding footer
        const domainName = "www.praisepage.com";
        ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";
        ctx.textAlign = "right";
        ctx.font = `italic 600 ${watermarkSize}px 'Poppins', sans-serif`;
        ctx.fillText(domainName, canvasWidth - Math.round(30 * (canvasWidth / 500)), canvasHeight - Math.round(20 * (canvasWidth / 500)));

        resolve();
      };

      // Draw background themes
      if (selectedBg.type === "solid") {
        ctx.fillStyle = selectedBg.colors[0];
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        if (overlayOpacity > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        drawContentAndResolve();
      } else if (selectedBg.type === "gradient") {
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        const step = 1 / (selectedBg.colors.length - 1);
        selectedBg.colors.forEach((color, idx) => {
          grad.addColorStop(idx * step, color);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        if (overlayOpacity > 0) {
          ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        drawContentAndResolve();
      } else if (selectedBg.type === "image") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = selectedBg.src;
        img.onload = () => {
          const hRatio = canvasWidth / img.width;
          const vRatio = canvasHeight / img.height;
          const ratio = Math.max(hRatio, vRatio);
          const shiftX = (canvasWidth - img.width * ratio) / 2;
          const shiftY = (canvasHeight - img.height * ratio) / 2;
          ctx.drawImage(img, 0, 0, img.width, img.height, shiftX, shiftY, img.width * ratio, img.height * ratio);
          
          if (overlayOpacity > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          }
          drawContentAndResolve();
        };
        img.onerror = () => {
          ctx.fillStyle = "#131417";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          if (overlayOpacity > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          }
          drawContentAndResolve();
        };
      }
    });
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await renderCanvas(canvas);

    try {
      const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
      const url = canvas.toDataURL(fileFormat, fileFormat === "image/jpeg" ? 0.92 : undefined);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `Devotional_Day_${day}_${dayTitle.replace(/\s+/g, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Canvas export failed:", err);
      alert("Failed to export image. Try using a standard browser.");
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await renderCanvas(canvas);

    const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
    const filename = `Devotional_Day_${day}.${ext}`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], filename, { type: fileFormat });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Devotional - Day ${day}`,
            text: `Reflection teaching for Day ${day} of the devotional plan: ${planTitle}`
          });
        } catch (err) {
          if (err.name !== "AbortError") {
            console.error("Native share failed:", err);
          }
        }
      } else {
        const shareText = encodeURIComponent(`Reflection for Devotional: ${planTitle} (Day ${day})`);
        const url = encodeURIComponent(window.location.origin);
        
        const method = prompt(
          "Sharing files directly is not supported in your browser.\nChoose a fallback sharing option:\n1. Twitter / X\n2. Facebook\n3. WhatsApp\n(Type 1, 2, or 3)", 
          "1"
        );
        
        if (method === "1") {
          window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${url}`, "_blank");
        } else if (method === "2") {
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${shareText}`, "_blank");
        } else if (method === "3") {
          window.open(`https://api.whatsapp.com/send?text=${shareText}%20${url}`, "_blank");
        }
      }
    }, fileFormat, fileFormat === "image/jpeg" ? 0.92 : undefined);
  };

  return (
    <div className="drawer-backdrop" onClick={(e) => {
      if (e.target.classList.contains("drawer-backdrop")) {
        onClose();
      }
    }}>
      <div className="drawer-content" style={{ maxWidth: "800px" }}>
        
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--light-color)" }}>
            Create Devotional Card
          </h3>
          <button onClick={onClose} style={{ cursor: "pointer", color: "var(--light-color-alt)", background: "none", border: "none" }}>
            <i className="ri-close-line" style={{ fontSize: "2.4rem" }}></i>
          </button>
        </div>

        {/* Layout Side-by-Side */}
        <div className="image-creator-layout" style={{ marginTop: "1rem" }}>
          
          {/* Card Preview Panel (Fixed at 270x480 Story ratio) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
            <div
              style={{
                width: "270px",
                height: "480px",
                background: selectedBg.value,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "12px",
                padding: "3.5rem 2rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                color: textColor,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Dark Overlay inside HTML preview */}
              {overlayOpacity > 0 && (
                <div 
                  style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    width: "100%", 
                    height: "100%", 
                    background: `rgba(0, 0, 0, ${overlayOpacity})`, 
                    zIndex: 1 
                  }} 
                />
              )}

              {/* Card Contents Wrapper */}
              <div style={{ zIndex: 2, display: "flex", flexDirection: "column", gap: "0.8rem", height: "100%", justifyContent: "center", overflow: "hidden" }}>
                
                {/* 1. Header category */}
                <div style={{ 
                  fontSize: `${9 * optimalScale}px`, 
                  fontWeight: "700", 
                  opacity: 0.6, 
                  letterSpacing: "1px",
                  color: textColor === "#ffffff" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {category.toUpperCase()} DEVOTIONAL
                </div>

                {/* 2. Devotional Plan Title */}
                <div style={{ 
                  fontSize: `${13 * optimalScale}px`, 
                  fontWeight: "700",
                  lineHeight: "1.2",
                  fontFamily: getFontFamily(fontStyle),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {planTitle}
                </div>

                {/* 3. Day detail */}
                <div style={{ 
                  fontSize: `${11 * optimalScale}px`, 
                  fontWeight: "600",
                  color: textColor === "#ffffff" ? "#fad648" : "var(--accent-color)",
                  fontFamily: getFontFamily(fontStyle),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  Day {day}: {dayTitle}
                </div>

                {/* 4. Teaching Reflection Paragraph (Strictly Justified, No scrolling overflow) */}
                <div style={{ 
                  fontSize: `${(fontSize - 2) * optimalScale}px`, 
                  lineHeight: "1.45",
                  opacity: 0.95,
                  fontFamily: getFontFamily(fontStyle),
                  textAlign: "justify",
                  marginTop: "1rem",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  overflowY: "hidden",
                  whiteSpace: "pre-line"
                }}>
                  {reflection}
                </div>

              </div>

              {/* Watermark in HTML preview */}
              <span
                style={{
                  position: "absolute",
                  bottom: "1rem",
                  right: "1.2rem",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  fontStyle: "italic",
                  opacity: 0.45,
                  zIndex: 2
                }}
              >
                www.praisepage.com
              </span>
            </div>
            
            <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
              Card Preview (Story 9:16 ratio)
            </span>
          </div>

          {/* Customization Options Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.8rem" }}>

            {/* Background Style Preset Selectors */}
            <div>
              <span style={{ display: "block", fontSize: "1.1rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "0.8rem", textTransform: "uppercase" }}>
                Card Theme Background
              </span>
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                {BG_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedBg(preset)}
                    title={preset.name}
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      background: preset.value,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: selectedBg.name === preset.name ? "3px solid var(--light-color)" : "1px solid rgba(255,255,255,0.15)",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Typography Selector */}
            <div>
              <span style={{ display: "block", fontSize: "1.1rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "0.8rem", textTransform: "uppercase" }}>
                Typography Font Style
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                {["Modern", "Classic", "Typewriter", "Handwritten"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setFontStyle(style)}
                    style={{
                      padding: "0.8rem",
                      borderRadius: "6px",
                      background: fontStyle === style ? "var(--transparent-light-color)" : "transparent",
                      border: `1px solid ${fontStyle === style ? "var(--light-color)" : "var(--transparent-light-color)"}`,
                      color: "var(--light-color)",
                      cursor: "pointer",
                      fontWeight: fontStyle === style ? "600" : "400",
                      fontSize: "1.2rem",
                      fontFamily: getFontFamily(style)
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color Switcher */}
            <div>
              <span style={{ display: "block", fontSize: "1.1rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "0.8rem", textTransform: "uppercase" }}>
                Text Color
              </span>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", height: "2.8rem" }}>
                {["#ffffff", "#131417"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    style={{
                      width: "2.8rem",
                      height: "2.8rem",
                      borderRadius: "50%",
                      background: color,
                      border: textColor === color ? "2.5px solid var(--accent-color)" : "1px solid var(--transparent-light-color)",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Sliders for Contrast Overlay & Base Font Size */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <span style={{ display: "block", fontSize: "1.1rem", color: "var(--light-color-alt)", marginBottom: "0.5rem", fontWeight: "600" }}>
                  OVERLAY ({Math.round(overlayOpacity * 100)}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-color)", cursor: "pointer" }}
                />
              </div>

              <div>
                <span style={{ display: "block", fontSize: "1.1rem", color: "var(--light-color-alt)", marginBottom: "0.5rem", fontWeight: "600" }}>
                  FONT SIZE ({fontSize}px)
                </span>
                <input
                  type="range"
                  min="12"
                  max="22"
                  step="1"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-color)", cursor: "pointer" }}
                />
              </div>
            </div>

            {/* Export Actions */}
            <div style={{ display: "flex", gap: "1.2rem", marginTop: "1.8rem" }}>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  background: "var(--accent-color)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "30px",
                  padding: "1.2rem",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem"
                }}
              >
                <i className="ri-download-2-line" style={{ fontSize: "1.6rem" }}></i>
                Download Image
              </button>

              <button
                onClick={handleShare}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "2px solid var(--light-color)",
                  color: "var(--light-color)",
                  borderRadius: "30px",
                  padding: "1.2rem",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem"
                }}
              >
                <i className="ri-share-forward-line" style={{ fontSize: "1.6rem" }}></i>
                Share Card
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Invisible High-Res Canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
