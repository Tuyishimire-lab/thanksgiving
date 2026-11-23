import { getMe } from "@/app/actions/authActions";
import { MAX_COVER_BYTES, saveUploadedCover } from "@/lib/mediaStorage";

export async function POST(request) {
  try {
    // Enforce same-origin security for authenticated multipart uploads
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return Response.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        return Response.json({ error: "Invalid request origin." }, { status: 403 });
      }
      if (!host || originHost !== host) {
        return Response.json({ error: "Forbidden: origin host mismatch." }, { status: 403 });
      }
    }

    const user = await getMe();
    if (!user) {
      return Response.json({ error: "Please log in to upload a cover image." }, { status: 401 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Invalid multipart form data." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Image file field \"file\" is required." }, { status: 400 });
    }

    if (typeof file.size === "number") {
      if (file.size <= 0) {
        return Response.json({ error: "Uploaded image file is empty." }, { status: 400 });
      }
      if (file.size > MAX_COVER_BYTES) {
        return Response.json({ error: "Cover image must be 200 KB or smaller." }, { status: 413 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return Response.json({ error: "Uploaded image file is empty." }, { status: 400 });
    }
    if (buffer.length > MAX_COVER_BYTES) {
      return Response.json({ error: "Cover image must be 200 KB or smaller." }, { status: 413 });
    }

    const result = await saveUploadedCover({
      userId: user.id,
      userRole: user.role || "user",
      buffer,
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status || 400 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("Testimony cover upload error:", error);
    return Response.json({ error: "Failed to upload cover image." }, { status: 500 });
  }
}
