"use client";

import { useState, useRef, useEffect } from "react";

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

export default function VerseImageCreator({ verseText, verseTag, onClose }) {
  const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0]);
  const [fontSize, setFontSize] = useState(20); // px in preview
  const [alignment, setAlignment] = useState("center");
  const [textColor, setTextColor] = useState("#ffffff");
  const canvasRef = useRef(null);

  const [fileFormat, setFileFormat] = useState("image/jpeg"); // image/jpeg or image/png

  const renderCanvas = (canvas, size) => {
    return new Promise((resolve) => {
      const ctx = canvas.getContext("2d");
      canvas.width = size;
      canvas.height = size;

      const drawTextAndResolve = () => {
        // Settings for text drawing
        ctx.fillStyle = textColor;
        ctx.textAlign = alignment;
        const fontScalar = size / 400; // Scalar relative to preview area
        const renderFontSize = Math.round(fontSize * fontScalar);
        ctx.font = `italic 600 ${renderFontSize}px 'Poppins', 'Segoe UI', Roboto, sans-serif`;

        const padding = 80;
        const maxTextWidth = size - padding * 2;
        const textX = alignment === "center" ? size / 2 : alignment === "left" ? padding : size - padding;
        let textY = size / 2.2; // Start around middle-upper

        // Word wrapping algorithm
        const words = `"${verseText}"`.split(" ");
        let line = "";
        const lines = [];
        const lineHeight = renderFontSize * 1.35;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxTextWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Adjust textY so the block of text is perfectly centered vertically
        const totalTextHeight = lines.length * lineHeight;
        textY = (size - totalTextHeight) / 2;

        // Draw the verse lines
        lines.forEach((lineStr) => {
          ctx.fillText(lineStr.trim(), textX, textY);
          textY += lineHeight;
        });

        // Draw the tag reference
        ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.75)";
        ctx.textAlign = "center";
        ctx.font = `600 ${Math.round(18 * fontScalar)}px 'Poppins', 'Segoe UI', Roboto, sans-serif`;
        ctx.fillText(verseTag.toUpperCase(), size / 2, size - 80);

        // Draw the website watermark branding at the bottom-right corner
        ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.3)";
        ctx.textAlign = "right";
        ctx.font = `italic 600 ${Math.round(12 * fontScalar)}px 'Poppins', sans-serif`;
        ctx.fillText("thanksgivings.com", size - 40, size - 30);

        resolve();
      };

      // Draw background
      if (selectedBg.type === "solid") {
        ctx.fillStyle = selectedBg.colors[0];
        ctx.fillRect(0, 0, size, size);
        drawTextAndResolve();
      } else if (selectedBg.type === "gradient") {
        // Create Gradient
        const grad = ctx.createLinearGradient(0, 0, size, size);
        const step = 1 / (selectedBg.colors.length - 1);
        selectedBg.colors.forEach((color, idx) => {
          grad.addColorStop(idx * step, color);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        drawTextAndResolve();
      } else if (selectedBg.type === "image") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = selectedBg.src;
        img.onload = () => {
          // Draw image to fill the canvas (cover)
          const hRatio = canvas.width / img.width;
          const vRatio = canvas.height / img.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShift_x = (canvas.width - img.width * ratio) / 2;
          const centerShift_y = (canvas.height - img.height * ratio) / 2;
          ctx.drawImage(img, 0, 0, img.width, img.height,
                             centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
          drawTextAndResolve();
        };
        img.onerror = () => {
          // Fallback to slate solid if image fails to load
          ctx.fillStyle = "#131417";
          ctx.fillRect(0, 0, size, size);
          drawTextAndResolve();
        };
      }
    });
  };

  const downloadImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 800; // High-res 1:1 image
    await renderCanvas(canvas, size);

    // Download the canvas
    try {
      const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
      const url = canvas.toDataURL(fileFormat, fileFormat === "image/jpeg" ? 0.92 : undefined);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `ThanksGivings_Verse_${verseTag.replace(/\s+/g, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Canvas export failed:", err);
      alert("Failed to export image. Try using a standard browser.");
    }
  };

  const shareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 800;
    await renderCanvas(canvas, size);

    const ext = fileFormat === "image/jpeg" ? "jpg" : "png";
    const filename = `ThanksGivings_Verse_${verseTag.replace(/\s+/g, "_")}.${ext}`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], filename, { type: fileFormat });
      
      // Attempt to use native mobile Web Share API
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Daily Word of Thanksgiving",
            text: `"${verseText}" - ${verseTag}`
          });
        } catch (err) {
          // User cancellation is normal, don't trigger alert for it
          if (err.name !== "AbortError") {
            console.error("Native share failed:", err);
          }
        }
      } else {
        // Fallback for desktop browsers: prompt sharing link options
        const shareText = encodeURIComponent(`"${verseText}" - ${verseTag} via thanksgivings.com`);
        const url = encodeURIComponent(window.location.origin);
        
        // Show share panel options
        const method = prompt(
          "Native sharing is not supported by your browser.\nChoose a fallback sharing options:\n1. Twitter / X\n2. Facebook\n3. WhatsApp\n(Type 1, 2, or 3)", 
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
    <div style={{ paddingBlock: "2rem" }}>
      <h3 style={{ fontSize: "2rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Shareable Verse Card</span>
        <button onClick={onClose} style={{ cursor: "pointer", fontSize: "1.4rem", color: "var(--light-color-alt)" }}>
          <i className="ri-close-line" style={{ fontSize: "2rem" }}></i>
        </button>
      </h3>

      <div className="image-creator-layout">
        {/* Preview Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
          <div
            style={{
              width: "300px",
              height: "300px",
              background: selectedBg.value,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: "12px",
              padding: "3rem 2rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: alignment === "center" ? "center" : alignment === "left" ? "flex-start" : "flex-end",
              color: textColor,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              textAlign: alignment,
              position: "relative",
              overflow: "hidden"
            }}
          >
            <p
              style={{
                fontSize: `${fontSize}px`,
                fontStyle: "italic",
                fontWeight: "600",
                lineHeight: "1.4",
                marginBottom: "3rem",
                width: "100%",
                wordBreak: "break-word"
              }}
            >
              "{verseText}"
            </p>
            <span
              style={{
                position: "absolute",
                bottom: "3.5rem",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "1.2rem",
                fontWeight: "700",
                letterSpacing: "1px",
                opacity: 0.85,
                textTransform: "uppercase",
                width: "100%",
                textAlign: "center"
              }}
            >
              {verseTag}
            </span>
            {/* Watermark in Preview */}
            <span
              style={{
                position: "absolute",
                bottom: "1.2rem",
                right: "1.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                fontStyle: "italic",
                opacity: 0.4
              }}
            >
              thanksgivings.com
            </span>
          </div>
          <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>Preview (square 1:1 aspect ratio)</span>
        </div>

        {/* Customization Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Background Presets */}
          <div>
            <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
              BACKGROUND STYLE
            </span>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {BG_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedBg(preset)}
                  title={preset.name}
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "50%",
                    background: preset.value,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: selectedBg.name === preset.name ? "3px solid var(--light-color)" : "2px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                    transition: "transform 0.2s"
                  }}
                  onMouseOver={(e) => (e.target.style.transform = "scale(1.1)")}
                  onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                />
              ))}
            </div>
          </div>

          {/* Font Size Adjust */}
          <div>
            <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
              FONT SIZE ({fontSize}px)
            </span>
            <input
              type="range"
              min="16"
              max="32"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              style={{
                width: "100%",
                accentColor: "var(--accent-color)",
                cursor: "pointer"
              }}
            />
          </div>

          {/* Alignment Selector */}
          <div>
            <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
              ALIGNMENT
            </span>
            <div style={{ display: "flex", gap: "1rem" }}>
              {["left", "center", "right"].map((align) => (
                <button
                  key={align}
                  onClick={() => setAlignment(align)}
                  style={{
                    flex: 1,
                    padding: "0.8rem",
                    borderRadius: "6px",
                    background: alignment === align ? "var(--transparent-light-color)" : "transparent",
                    border: `1px solid ${alignment === align ? "var(--light-color)" : "var(--transparent-light-color)"}`,
                    color: "var(--light-color)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontWeight: alignment === align ? "600" : "400"
                  }}
                >
                  <i className={`ri-align-${align}`} style={{ fontSize: "1.6rem", marginRight: "0.5rem" }}></i>
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Format and Text Color selection side-by-side */}
          <div style={{ display: "flex", gap: "2rem" }}>
            {/* Format Selection */}
            <div style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
                FORMAT
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[
                  { id: "image/jpeg", label: "JPG" },
                  { id: "image/png", label: "PNG" }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setFileFormat(fmt.id)}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "6px",
                      background: fileFormat === fmt.id ? "var(--transparent-light-color)" : "transparent",
                      border: `1px solid ${fileFormat === fmt.id ? "var(--light-color)" : "var(--transparent-light-color)"}`,
                      fontSize: "1.2rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color Switcher */}
            <div style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color-alt)", marginBottom: "1rem" }}>
                TEXT COLOR
              </span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", height: "3.2rem" }}>
                {["#ffffff", "#131417"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      background: color,
                      border: textColor === color ? "3px solid var(--accent-color)" : "1px solid var(--transparent-light-color)",
                      cursor: "pointer",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.15)"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger Row */}
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem" }}>
            <button
              onClick={downloadImage}
              style={{
                flex: 1,
                background: "var(--accent-color)",
                color: "#fff",
                border: "none",
                borderRadius: "30px",
                padding: "1.2rem",
                fontSize: "1.4rem",
                fontWeight: "700",
                cursor: "pointer",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.8rem"
              }}
            >
              <i className="ri-download-2-line" style={{ fontSize: "1.8rem" }}></i>
              Save {fileFormat === "image/jpeg" ? "JPG" : "PNG"}
            </button>

            <button
              onClick={shareImage}
              style={{
                flex: 1,
                background: "transparent",
                border: "2px solid var(--light-color)",
                color: "var(--light-color)",
                borderRadius: "30px",
                padding: "1.2rem",
                fontSize: "1.4rem",
                fontWeight: "700",
                cursor: "pointer",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.8rem"
              }}
            >
              <i className="ri-share-forward-line" style={{ fontSize: "1.8rem" }}></i>
              Share Card
            </button>
          </div>
        </div>
      </div>

      {/* Hidden high-res rendering canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
