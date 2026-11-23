import { getUploadedMedia } from "@/lib/mediaStorage";

async function serveMedia(context, includeBody) {
  try {
    const { id } = await context.params;
    const media = await getUploadedMedia(id);

    if (!media) {
      return new Response(includeBody ? JSON.stringify({ error: "Media not found." }) : null, {
        status: 404,
        headers: includeBody ? { "Content-Type": "application/json" } : {},
      });
    }

    return new Response(includeBody ? media.buffer : null, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(media.buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("Media serve error:", error);
    return new Response(includeBody ? JSON.stringify({ error: "Failed to load media." }) : null, {
      status: 500,
      headers: includeBody ? { "Content-Type": "application/json" } : {},
    });
  }
}

export async function GET(_request, context) {
  return serveMedia(context, true);
}

export async function HEAD(_request, context) {
  return serveMedia(context, false);
}
