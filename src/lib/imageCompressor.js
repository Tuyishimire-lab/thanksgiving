export const MAX_RAW_IMAGE_BYTES = 8 * 1024 * 1024;
export const TARGET_COMPRESSED_BYTES = 180 * 1024;

const MAX_HARD_BYTES = 195 * 1024;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 900;
const ALLOWED_INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function decodeImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          if (typeof bitmap.close === "function") {
            bitmap.close();
          }
        },
      };
    } catch {
      // Fall back to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode the selected image."));
      el.src = objectUrl;
    });

    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => {
        URL.revokeObjectURL(objectUrl);
      },
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function encodeCanvasUnderTarget(source, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas image processing is unavailable in this browser.");
  }

  ctx.fillStyle = "#151820";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  let smallest = null;
  const candidates = [
    ...([0.82, 0.72, 0.6, 0.48].map((q) => ({ mime: "image/webp", quality: q }))),
    ...([0.8, 0.68, 0.56, 0.45].map((q) => ({ mime: "image/jpeg", quality: q }))),
  ];

  for (const { mime, quality } of candidates) {
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob || blob.type !== mime) continue;
    if (!smallest || blob.size < smallest.size) {
      smallest = blob;
    }
    if (blob.size <= TARGET_COMPRESSED_BYTES) {
      return blob;
    }
  }

  return smallest;
}

export async function compressCoverImageFile(file) {
  if (!file || typeof file !== "object") {
    throw new Error("Please select an image file.");
  }
  if (!ALLOWED_INPUT_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are supported.");
  }
  if (file.size <= 0) {
    throw new Error("The selected image file is empty.");
  }
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error("Image must be 8 MB or smaller before optimization.");
  }

  const decoded = await decodeImageSource(file);
  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("Image dimensions could not be determined.");
    }

    const scale = Math.min(1, MAX_WIDTH / decoded.width, MAX_HEIGHT / decoded.height);
    let targetW = Math.max(1, Math.round(decoded.width * scale));
    let targetH = Math.max(1, Math.round(decoded.height * scale));

    let blob = await encodeCanvasUnderTarget(decoded.source, targetW, targetH);

    if (!blob || blob.size > TARGET_COMPRESSED_BYTES) {
      targetW = Math.max(1, Math.round(targetW * 0.8));
      targetH = Math.max(1, Math.round(targetH * 0.8));
      const downscaledBlob = await encodeCanvasUnderTarget(decoded.source, targetW, targetH);
      if (downscaledBlob && (!blob || downscaledBlob.size < blob.size)) {
        blob = downscaledBlob;
      }
    }

    if (!blob || blob.size > MAX_HARD_BYTES) {
      throw new Error(
        "Image could not be compressed under 195 KB. Please choose a simpler or smaller photo."
      );
    }

    return {
      blob,
      mimeType: blob.type || "image/jpeg",
      sizeBytes: blob.size,
      width: targetW,
      height: targetH,
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    decoded.cleanup();
  }
}
