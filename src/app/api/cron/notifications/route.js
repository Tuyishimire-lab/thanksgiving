import webpush from "web-push";
import { getDb } from "@/data/db";
import { verses } from "@/data/verses";

// Configure VAPID credentials
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ─── Notification payloads ────────────────────────────────────────────────────

function getVerseOfDay() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
  const verse = verses[(dayOfYear - 1) % verses.length];
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
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

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
      // Fetch active (non-completed) plans for these users
      const placeholders = userIdsWithPlans.map(() => "?").join(", ");
      const { rows: plans } = await db.execute({
        sql: `SELECT user_id, plan_id FROM plans_progress
              WHERE user_id IN (${placeholders}) AND is_completed = 0`,
        args: userIdsWithPlans,
      });
      // Map user_id → first active plan_id (title will be plan_id for now)
      plans.forEach(p => {
        if (!planTitles[p.user_id]) planTitles[p.user_id] = p.plan_id;
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
