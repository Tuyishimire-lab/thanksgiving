import crypto from "node:crypto";
import { getDb } from "@/data/db";

export const MAX_COVER_BYTES = 200 * 1024;
export const UPLOAD_RATE_LIMIT_PER_HOUR = 10;
export const ADMIN_UPLOAD_RATE_LIMIT_PER_HOUR = 30;

const MEDIA_ID_RE = /^med_[a-f0-9-]{8,64}$/;
const MEDIA_URL_RE = /^\/api\/media\/(med_[a-f0-9-]{8,64})$/;

/**
 * Inspect magic bytes to verify real JPEG, PNG, or WebP payloads.
 */
export function detectImageMimeFromMagicBytes(buffer) {
  if (!buffer || typeof buffer.length !== "number") {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    Buffer.from(buffer).subarray(0, 4).toString("ascii") === "RIFF" &&
    Buffer.from(buffer).subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Extract the media upload ID from an internal /api/media/<id> URL.
 */
export function extractMediaIdFromUrl(url) {
  if (typeof url !== "string") return null;
  const match = MEDIA_URL_RE.exec(url.trim());
  return match ? match[1] : null;
}

/**
 * Validate, rate-limit, and store a verified cover upload in media_uploads.
 */
export async function saveUploadedCover({
  userId,
  userRole = "user",
  buffer,
  db: overrideDb = null,
} = {}) {
  if (!userId || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { error: "A valid non-empty image file is required.", status: 400 };
  }

  if (buffer.length > MAX_COVER_BYTES) {
    return { error: "Cover image must be 200 KB or smaller.", status: 413 };
  }

  const mimeType = detectImageMimeFromMagicBytes(buffer);
  if (!mimeType) {
    return { error: "Only valid JPEG, PNG, or WebP images are allowed.", status: 400 };
  }

  const db = overrideDb || (await getDb());
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const hourlyLimit =
    userRole === "admin" ? ADMIN_UPLOAD_RATE_LIMIT_PER_HOUR : UPLOAD_RATE_LIMIT_PER_HOUR;

  const rateRes = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM media_uploads WHERE user_id = ? AND created_at >= ?",
    args: [userId, oneHourAgoIso],
  });
  if (Number(rateRes.rows[0]?.cnt ?? 0) >= hourlyLimit) {
    return { error: "Upload rate limit reached. Please try again later.", status: 429 };
  }

  const id = `med_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const dataBase64 = buffer.toString("base64");

  await db.execute({
    sql: `INSERT INTO media_uploads (id, user_id, mime_type, size_bytes, data_base64, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, mimeType, buffer.length, dataBase64, createdAt],
  });

  return {
    success: true,
    id,
    url: `/api/media/${id}`,
    mimeType,
    sizeBytes: buffer.length,
  };
}

/**
 * Load binary image bytes and metadata for a stored upload by ID.
 */
export async function getUploadedMedia(id, overrideDb = null) {
  if (typeof id !== "string" || !MEDIA_ID_RE.test(id)) {
    return null;
  }

  const db = overrideDb || (await getDb());
  const res = await db.execute({
    sql: "SELECT mime_type, size_bytes, data_base64 FROM media_uploads WHERE id = ?",
    args: [id],
  });

  const row = res.rows[0];
  if (!row || !row.data_base64) {
    return null;
  }

  const buffer = Buffer.from(row.data_base64, "base64");
  return {
    buffer,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? buffer.length),
  };
}

/**
 * Confirm an uploaded media URL belongs to the authenticated user.
 */
export async function verifyUploadedCoverOwnership(imageUrl, userId, overrideDb = null) {
  const id = extractMediaIdFromUrl(imageUrl);
  if (!id || !userId) return false;

  const db = overrideDb || (await getDb());
  const res = await db.execute({
    sql: "SELECT 1 FROM media_uploads WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return Boolean(res.rows[0]);
}

/**
 * Delete an uploaded media row when no testimony still references its URL.
 */
export async function deleteUploadedMediaByUrl(db, imageUrl) {
  try {
    const id = extractMediaIdFromUrl(imageUrl);
    if (!id || !db) return;

    const refRes = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM testimonies WHERE image = ?",
      args: [imageUrl],
    });
    if (Number(refRes.rows[0]?.cnt ?? 0) === 0) {
      await db.execute({
        sql: "DELETE FROM media_uploads WHERE id = ?",
        args: [id],
      });
    }
  } catch (err) {
    console.error("Failed to clean up uploaded media:", err);
  }
}
