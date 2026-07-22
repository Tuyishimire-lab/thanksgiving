import { getDb } from "@/data/db";

export async function POST(request) {
  try {
    const { endpoint } = await request.json();
    if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 });

    const db = await getDb();

    await db.execute({
      sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
      args: [endpoint],
    });
    await db.execute({
      sql: "DELETE FROM notification_preferences WHERE endpoint = ?",
      args: [endpoint],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[unsubscribe] Error:", error);
    return Response.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
