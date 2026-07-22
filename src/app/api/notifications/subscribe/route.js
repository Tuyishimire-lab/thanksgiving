import { getDb } from "@/data/db";
import { getMe } from "@/app/actions/authActions";
import crypto from "node:crypto";

export async function POST(request) {
  try {
    const { subscription, preferences } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    const db = await getDb();
    const currentUser = await getMe();
    const userId = currentUser?.id || null;
    const id = crypto.randomUUID();

    // Upsert the subscription (replace if endpoint already exists)
    await db.execute({
      sql: `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              user_id = excluded.user_id,
              p256dh  = excluded.p256dh,
              auth    = excluded.auth`,
      args: [id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
    });

    // Upsert preferences
    const prefs = preferences || {};
    await db.execute({
      sql: `INSERT INTO notification_preferences (endpoint, verse_of_day, devotional_reminder, gratitude_journal, scripture_quiz)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              verse_of_day        = excluded.verse_of_day,
              devotional_reminder = excluded.devotional_reminder,
              gratitude_journal   = excluded.gratitude_journal,
              scripture_quiz      = excluded.scripture_quiz`,
      args: [
        subscription.endpoint,
        prefs.verse_of_day        !== false ? 1 : 0,
        prefs.devotional_reminder !== false ? 1 : 0,
        prefs.gratitude_journal   !== false ? 1 : 0,
        prefs.scripture_quiz      !== false ? 1 : 0,
      ],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[subscribe] Error:", error);
    return Response.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
