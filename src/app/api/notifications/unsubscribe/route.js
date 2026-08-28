import { getDb } from "@/data/db";
import { getMe } from "@/app/actions/authActions";

export async function POST(request) {
  try {
    const { endpoint } = await request.json();
    if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 });

    const db = await getDb();
    
    // Verify ownership: only allow unsubscribe if the requesting user owns this subscription
    const currentUser = await getMe();
    const existing = await db.execute({
      sql: "SELECT user_id FROM push_subscriptions WHERE endpoint = ?",
      args: [endpoint]
    });
    
    if (existing.rows.length > 0) {
      const subUserId = existing.rows[0].user_id;
      // If the subscription belongs to a logged-in user, verify it matches
      if (subUserId && (!currentUser || currentUser.id !== subUserId)) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

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
