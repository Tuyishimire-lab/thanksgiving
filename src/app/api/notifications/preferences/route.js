import { getDb } from "@/data/db";
import { getMe } from "@/app/actions/authActions";

// GET: fetch preferences for a given endpoint
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  if (!endpoint) return Response.json({ error: "Missing endpoint" }, { status: 400 });

  try {
    const db = await getDb();
    const subRes = await db.execute({
      sql: "SELECT user_id FROM push_subscriptions WHERE endpoint = ?",
      args: [endpoint],
    });
    if (subRes.rows.length > 0 && subRes.rows[0].user_id) {
      const currentUser = await getMe();
      if (!currentUser || currentUser.id !== subRes.rows[0].user_id) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const result = await db.execute({
      sql: "SELECT * FROM notification_preferences WHERE endpoint = ?",
      args: [endpoint],
    });

    if (result.rows.length === 0) {
      // Return defaults
      return Response.json({ verse_of_day: 1, devotional_reminder: 1, gratitude_journal: 1, scripture_quiz: 1 });
    }
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error("[preferences GET] Error:", error);
    return Response.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// POST: update preferences for a given endpoint
export async function POST(request) {
  try {
    const body = await request.json();
    const { endpoint, preferences } = body || {};
    if (!endpoint || typeof endpoint !== "string" || !preferences || typeof preferences !== "object") {
      return Response.json({ error: "Invalid endpoint or preferences" }, { status: 400 });
    }

    const db = await getDb();
    const subRes = await db.execute({
      sql: "SELECT user_id FROM push_subscriptions WHERE endpoint = ?",
      args: [endpoint],
    });
    if (subRes.rows.length === 0) {
      return Response.json({ error: "Subscription not found" }, { status: 404 });
    }
    if (subRes.rows[0].user_id) {
      const currentUser = await getMe();
      if (!currentUser || currentUser.id !== subRes.rows[0].user_id) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    await db.execute({
      sql: `INSERT INTO notification_preferences (endpoint, verse_of_day, devotional_reminder, gratitude_journal, scripture_quiz)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              verse_of_day        = excluded.verse_of_day,
              devotional_reminder = excluded.devotional_reminder,
              gratitude_journal   = excluded.gratitude_journal,
              scripture_quiz      = excluded.scripture_quiz`,
      args: [
        endpoint,
        preferences.verse_of_day        ? 1 : 0,
        preferences.devotional_reminder ? 1 : 0,
        preferences.gratitude_journal   ? 1 : 0,
        preferences.scripture_quiz      ? 1 : 0,
      ],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[preferences POST] Error:", error);
    return Response.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
