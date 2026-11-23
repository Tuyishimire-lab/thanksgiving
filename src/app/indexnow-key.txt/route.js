import { getIndexNowKey } from "@/lib/indexNow";

export async function GET() {
  const key = getIndexNowKey();
  if (!key) {
    return new Response("Not configured", { status: 404 });
  }

  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
