import webpush from "web-push";
import crypto from "node:crypto";
import { getDb } from "@/data/db";
import { getVerseOfTheDay } from "@/data/verses";
import { devotionals } from "@/data/devotionals";

function ensureVapidConfigured() {
  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!email || !publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  return true;
}

function verifyBearerToken(authHeader, secret) {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── Notification payloads ────────────────────────────────────────────────────

function getVerseOfDay() {
  const verse = getVerseOfTheDay(new Date());
  return {
    title: "🌅 Verse of the Day",
    body: `"${verse.verse.substring(0, 100)}${verse.verse.length > 100 ? "…" : ""}" — ${verse.tag}`,
    tag: "verse-of-day",
  };
}

function getDevotionalPayload(planTitle) {
  return {
    title: "📖 Continue Your Devotional",
    body: planTitle
      ? `Pick up where you left off in "${planTitle}" — your daily reading awaits.`
      : "You have an active reading plan. Continue your journey today!",
    tag: "devotional-reminder",
  };
}

function getJournalPayload() {
  const prompts = [
    "What are 3 things you're grateful for today?",
    "How did you see God's hand at work this week?",
    "Write a short prayer of thanksgiving.",
    "What scripture gave you strength today?",
    "Name someone you're grateful for and why.",
  ];
  const today = new Date();
  const prompt = prompts[today.getDay() % prompts.length];
  return {
    title: "✍️ Daily Gratitude Journal",
    body: prompt,
    tag: "gratitude-journal",
  };
}

function getQuizPayload() {
  return {
    title: "🧩 Daily Scripture Quiz",
    body: "Can you answer today's Bible trivia challenge? Tap to find out!",
    tag: "scripture-quiz",
    actions: [{ action: "open", title: "Take the Quiz" }],
  };
}

// ─── Send a single notification (handles expired subscriptions) ───────────────

async function sendNotification(db, sub, payload) {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    // 404 / 410 = subscription expired / revoked → clean up
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log("[cron] Removing stale subscription:", sub.endpoint.substring(0, 60));
      await db.execute({
        sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
        args: [sub.endpoint],
      });
      await db.execute({
        sql: "DELETE FROM notification_preferences WHERE endpoint = ?",
        args: [sub.endpoint],
      });
    } else {
      console.error("[cron] Push error:", err.message);
    }
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request) {
  // Secure the endpoint — only Vercel Cron or callers with the secret can trigger it
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !verifyBearerToken(authHeader, cronSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ensureVapidConfigured()) {
    return Response.json({ error: "Push notifications are not configured." }, { status: 500 });
  }

  try {
    const db = await getDb();

    // ─── Housekeeping: purge expired sessions ───────────────────────────────
    try {
      const now = new Date().toISOString();
      const purged = await db.execute({
        sql: "DELETE FROM sessions WHERE expires_at < ?",
        args: [now]
      });
      if (purged.rowsAffected > 0) {
        console.log(`[cron] Purged ${purged.rowsAffected} expired sessions.`);
      }
    } catch (cleanupErr) {
      console.error("[cron] Session cleanup error (non-fatal):", cleanupErr.message);
    }

    // Fetch all subscriptions joined with their preferences
    const { rows: subs } = await db.execute(`
      SELECT ps.endpoint, ps.p256dh, ps.auth, ps.user_id,
             COALESCE(np.verse_of_day, 1)        AS verse_of_day,
             COALESCE(np.devotional_reminder, 1) AS devotional_reminder,
             COALESCE(np.gratitude_journal, 1)   AS gratitude_journal,
             COALESCE(np.scripture_quiz, 1)      AS scripture_quiz
      FROM push_subscriptions ps
      LEFT JOIN notification_preferences np ON np.endpoint = ps.endpoint
    `);

    if (subs.length === 0) {
      return Response.json({ sent: 0, message: "No subscribers" });
    }

    // Build lookup: user_id → active plan title (for devotional reminders)
    const userIdsWithPlans = [...new Set(
      subs.filter(s => s.user_id && s.devotional_reminder).map(s => s.user_id)
    )];

    const planTitles = {};
    if (userIdsWithPlans.length > 0) {
      const placeholders = userIdsWithPlans.map(() => "?").join(", ");
      const { rows: plans } = await db.execute({
        sql: `SELECT pp.user_id, pp.plan_id, cd.title AS custom_title
              FROM plans_progress pp
              LEFT JOIN custom_devotionals cd ON cd.id = pp.plan_id
              WHERE pp.user_id IN (${placeholders}) AND pp.is_completed = 0`,
        args: userIdsWithPlans,
      });
      plans.forEach(p => {
        if (!planTitles[p.user_id]) {
          planTitles[p.user_id] = p.custom_title || devotionals[p.plan_id]?.title || p.plan_id;
        }
      });
    }

    // Prepare the 4 payloads
    const versePayload      = getVerseOfDay();
    const journalPayload    = getJournalPayload();
    const quizPayload       = getQuizPayload();

    let sent = 0;

    for (const sub of subs) {
      // 1. Verse of the day — everyone who opted in
      if (sub.verse_of_day) {
        const ok = await sendNotification(db, sub, versePayload);
        if (ok) sent++;
      }

      // 2. Devotional reminder — only users with an active plan
      if (sub.devotional_reminder && sub.user_id && planTitles[sub.user_id]) {
        const ok = await sendNotification(db, sub, getDevotionalPayload(planTitles[sub.user_id]));
        if (ok) sent++;
      }

      // 3. Gratitude journal — everyone who opted in
      if (sub.gratitude_journal) {
        const ok = await sendNotification(db, sub, journalPayload);
        if (ok) sent++;
      }

      // 4. Scripture quiz — everyone who opted in
      if (sub.scripture_quiz) {
        const ok = await sendNotification(db, sub, quizPayload);
        if (ok) sent++;
      }
    }

    console.log(`[cron/notifications] Sent ${sent} notifications to ${subs.length} subscribers.`);
    return Response.json({ success: true, sent, subscribers: subs.length });
  } catch (error) {
    console.error("[cron/notifications] Fatal error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
