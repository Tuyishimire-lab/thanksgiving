"use server";

import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import webpush from "web-push";
import { getDb } from "@/data/db";
import {
  getDefaultTestimonyCover,
  isSafeTestimonyCoverUrl,
} from "@/data/testimonyCovers";
import { deleteUploadedMediaByUrl } from "@/lib/mediaStorage";
import { pingIndexNow } from "@/lib/indexNow";
import { getMe } from "./authActions";
import { revalidatePath, revalidateTag } from "next/cache";

function safeRevalidatePath(targetPath) {
  try {
    revalidatePath(targetPath);
  } catch (err) {
    if (err?.message?.includes("static generation store missing")) return;
    throw err;
  }
}

function safeRevalidateTag(tag) {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (err) {
    if (err?.message?.includes("static generation store missing")) return;
    throw err;
  }
}

function revalidatePublicContentPaths(extraPaths = [], indexNowPaths = []) {
  for (const target of extraPaths) {
    if (target) safeRevalidatePath(target);
  }
  safeRevalidatePath("/llms.txt");
  safeRevalidatePath("/llms-full.txt");
  safeRevalidatePath("/sitemap.xml");
  safeRevalidatePath("/rss.xml");
  if (indexNowPaths.length > 0) {
    void pingIndexNow(indexNowPaths);
  }
}

function logAdminAction(message) {
  try {
    const logPath = path.join(process.cwd(), "admin_actions.log");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    console.error("Failed to write to admin log:", err);
  }
}

async function recordAuditLog(db, admin, action, targetType, targetId, details) {
  try {
    await db.execute({
      sql: `INSERT INTO admin_audit_logs (id, admin_id, admin_email, action, target_type, target_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `audit_${crypto.randomUUID()}`,
        admin?.id || null,
        admin?.email || "admin",
        action,
        targetType || null,
        targetId != null && targetId !== "" ? String(targetId) : null,
        String(details || "").slice(0, 300),
        new Date().toISOString(),
      ],
    });
  } catch (err) {
    console.error("Failed to record admin audit log:", err);
  }
}

async function verifyAdmin() {
  const user = await getMe();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return user;
}

/**
 * Parse the ADMIN_EMAILS environment variable into a normalized list.
 * Shared helper to eliminate duplication across auth flows.
 */
export async function getAdminEmailList() {
  return (process.env.ADMIN_EMAILS || "admin@praisepage.com")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function toSafeIsoTimestamp(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function computePushBreakdown(rows) {
  let total = 0;
  let verseOfDay = 0;
  let devotionalReminder = 0;
  let gratitudeJournal = 0;
  let scriptureQuiz = 0;

  for (const r of rows) {
    total++;
    if (Number(r.verse_of_day ?? 1) === 1) verseOfDay++;
    if (Number(r.devotional_reminder ?? 1) === 1) devotionalReminder++;
    if (Number(r.gratitude_journal ?? 1) === 1) gratitudeJournal++;
    if (Number(r.scripture_quiz ?? 1) === 1) scriptureQuiz++;
  }

  return { total, verseOfDay, devotionalReminder, gratitudeJournal, scriptureQuiz };
}

function getVapidConfig() {
  const email = process.env.VAPID_EMAIL?.trim() || "";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  return {
    configured: Boolean(email && publicKey && privateKey),
    email,
    publicKey,
    privateKey,
  };
}

function parseCompletedDaysCount(raw) {
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (typeof parsed === "number") return parsed;
    return 0;
  } catch {
    return 0;
  }
}

const PUSH_PREFS_JOIN_SQL = `
  SELECT ps.endpoint,
         COALESCE(np.verse_of_day, 1) AS verse_of_day,
         COALESCE(np.devotional_reminder, 1) AS devotional_reminder,
         COALESCE(np.gratitude_journal, 1) AS gratitude_journal,
         COALESCE(np.scripture_quiz, 1) AS scripture_quiz
  FROM push_subscriptions ps
  LEFT JOIN notification_preferences np ON np.endpoint = ps.endpoint
`;

/**
 * Fetch consolidated dashboard metrics, aggregates, and activity streams
 */
export async function getAdminStats() {
  try {
    await verifyAdmin();
    const db = await getDb();

    const todayStr = new Date().toDateString();
    const nowIso = new Date().toISOString();

    const [
      totalUsersRes,
      activeTodayRes,
      recentUsersRes,
      testimoniesRes,
      commentsRes,
      prayersRes,
      answeredPrayersRes,
      encouragementsRes,
      journalRes,
      totalSessionsRes,
      expiredSessionsRes,
      plansProgressRes,
      savedPlansRes,
      pushPrefsRes,
      userActRes,
      testListRes,
      commentListRes,
      prayerListRes,
    ] = await db.batch(
      [
        "SELECT COUNT(*) as count FROM users",
        { sql: "SELECT COUNT(*) as count FROM users WHERE last_active = ?", args: [todayStr] },
        "SELECT last_active FROM users WHERE last_active IS NOT NULL",
        "SELECT COUNT(*) as count FROM testimonies",
        "SELECT COUNT(*) as count FROM comments",
        "SELECT COUNT(*) as count FROM prayers",
        "SELECT COUNT(*) as count FROM prayers WHERE status = 'answered'",
        "SELECT COUNT(*) as count FROM prayer_encouragements",
        "SELECT COUNT(*) as count FROM gratitude_journal",
        "SELECT COUNT(*) as count FROM sessions",
        { sql: "SELECT COUNT(*) as count FROM sessions WHERE expires_at < ?", args: [nowIso] },
        "SELECT plan_id, is_completed FROM plans_progress",
        "SELECT plan_id FROM saved_plans",
        PUSH_PREFS_JOIN_SQL,
        "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 15",
        "SELECT id, author_name, title, created_at FROM testimonies ORDER BY created_at DESC LIMIT 15",
        "SELECT id, author_name, content, created_at FROM comments ORDER BY created_at DESC LIMIT 15",
        "SELECT id, author_name, title, created_at, is_anonymous FROM prayers ORDER BY created_at DESC LIMIT 15",
      ],
      "read"
    );

    const totalUsers = Number(totalUsersRes.rows[0]?.count ?? 0);
    const activeToday = Number(activeTodayRes.rows[0]?.count ?? 0);

    const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let activeThisWeek = 0;
    recentUsersRes.rows.forEach(u => {
      if (u.last_active === todayStr) {
        activeThisWeek++;
      } else if (u.last_active) {
        const lastActiveTime = Date.parse(u.last_active);
        if (!isNaN(lastActiveTime) && lastActiveTime >= oneWeekAgoMs) {
          activeThisWeek++;
        }
      }
    });

    const totalTestimonies = Number(testimoniesRes.rows[0]?.count ?? 0);
    const totalComments = Number(commentsRes.rows[0]?.count ?? 0);
    const totalPrayers = Number(prayersRes.rows[0]?.count ?? 0);
    const answeredPrayers = Number(answeredPrayersRes.rows[0]?.count ?? 0);
    const activePrayers = Math.max(0, totalPrayers - answeredPrayers);
    const totalPrayerEncouragements = Number(encouragementsRes.rows[0]?.count ?? 0);
    const journalEntries = Number(journalRes.rows[0]?.count ?? 0);
    const totalSessions = Number(totalSessionsRes.rows[0]?.count ?? 0);
    const expiredSessions = Number(expiredSessionsRes.rows[0]?.count ?? 0);

    const planAnalytics = {};
    let activePlans = 0;
    let completedPlans = 0;

    for (const row of plansProgressRes.rows) {
      const planId = row.plan_id;
      if (!planId) continue;
      if (!planAnalytics[planId]) {
        planAnalytics[planId] = { enrolled: 0, completed: 0, saved: 0 };
      }
      planAnalytics[planId].enrolled++;
      if (Number(row.is_completed ?? 0) === 1) {
        planAnalytics[planId].completed++;
        completedPlans++;
      } else {
        activePlans++;
      }
    }

    for (const row of savedPlansRes.rows) {
      const planId = row.plan_id;
      if (!planId) continue;
      if (!planAnalytics[planId]) {
        planAnalytics[planId] = { enrolled: 0, completed: 0, saved: 0 };
      }
      planAnalytics[planId].saved++;
    }

    const topPlans = Object.entries(planAnalytics)
      .filter(([, counts]) => counts.enrolled > 0)
      .sort((a, b) => b[1].enrolled - a[1].enrolled || b[1].completed - a[1].completed)
      .slice(0, 5)
      .map(([planId, counts]) => ({
        planId,
        enrolled: counts.enrolled,
        completed: counts.completed,
      }));

    const pushBreakdown = computePushBreakdown(pushPrefsRes.rows);
    const pushSubscribers = pushBreakdown.total;

    // Compile Activity Stream
    const userActivities = userActRes.rows.map(u => ({
      id: `reg_${u.id}`,
      type: "user_registered",
      user: u.name,
      email: u.email,
      details: "registered a new account",
      timestamp: toSafeIsoTimestamp(u.created_at),
    }));

    const testimonyActivities = testListRes.rows.map(t => ({
      id: `test_${t.id}`,
      type: "testimony_created",
      user: t.author_name,
      details: `shared a testimony: "${t.title}"`,
      timestamp: t.created_at && (t.created_at.includes("-") || t.created_at.includes(":"))
        ? toSafeIsoTimestamp(t.created_at)
        : new Date().toISOString(),
    }));

    const commentActivities = commentListRes.rows.map(c => ({
      id: `comm_${c.id}`,
      type: "comment_added",
      user: c.author_name,
      details: `commented: "${c.content.length > 50 ? c.content.substring(0, 50) + "..." : c.content}"`,
      timestamp: c.created_at && (c.created_at.includes("-") || c.created_at.includes(":"))
        ? toSafeIsoTimestamp(c.created_at)
        : new Date().toISOString(),
    }));

    const prayerActivities = prayerListRes.rows.map(p => ({
      id: `pray_${p.id}`,
      type: "prayer_requested",
      user: p.is_anonymous ? "Anonymous" : p.author_name,
      details: `requested prayer: "${p.title}"`,
      timestamp: p.created_at && (p.created_at.includes("-") || p.created_at.includes(":"))
        ? toSafeIsoTimestamp(p.created_at)
        : new Date().toISOString(),
    }));

    const activityStream = [
      ...userActivities,
      ...testimonyActivities,
      ...commentActivities,
      ...prayerActivities,
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    return {
      success: true,
      stats: {
        totalUsers,
        activeToday,
        activeThisWeek,
        totalTestimonies,
        totalComments,
        totalPrayers,
        activePrayers,
        answeredPrayers,
        totalPrayerEncouragements,
        pushSubscribers,
        expiredSessions,
        totalSessions,
        journalEntries,
        activePlans,
        completedPlans,
      },
      activityStream,
      topPlans,
      pushBreakdown,
      planAnalytics,
    };
  } catch (error) {
    console.error("Error loading admin stats:", error);
    return { error: error.message };
  }
}

/**
 * Fetch all registered users
 */
export async function getAdminUsers() {
  try {
    await verifyAdmin();
    const db = await getDb();
    const res = await db.execute(
      "SELECT id, name, email, streak_count, streak_freezes_count, last_active, created_at, role FROM users ORDER BY created_at DESC"
    );
    const plainUsers = res.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      streak_count: r.streak_count,
      streak_freezes_count: Number(r.streak_freezes_count ?? 1),
      last_active: r.last_active,
      created_at: r.created_at,
      role: r.role || "user",
    }));
    return { success: true, users: plainUsers };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetch granular activity & profile breakdown for a single user
 */
export async function getAdminUserDetails(userId) {
  try {
    await verifyAdmin();
    if (!userId) return { error: "User ID is required." };

    const db = await getDb();
    const [
      userRes,
      notesRes,
      highlightsRes,
      journalRes,
      testimoniesRes,
      commentsRes,
      prayersRes,
      savedRes,
      badgesRes,
      plansRes,
    ] = await db.batch(
      [
        {
          sql: "SELECT id, name, email, role, streak_count, streak_freezes_count, last_active, created_at FROM users WHERE id = ?",
          args: [userId],
        },
        { sql: "SELECT COUNT(*) as count FROM notes WHERE user_id = ?", args: [userId] },
        { sql: "SELECT COUNT(*) as count FROM highlights WHERE user_id = ?", args: [userId] },
        { sql: "SELECT COUNT(*) as count FROM gratitude_journal WHERE user_id = ?", args: [userId] },
        { sql: "SELECT COUNT(*) as count FROM testimonies WHERE user_id = ?", args: [userId] },
        { sql: "SELECT COUNT(*) as count FROM comments WHERE user_id = ?", args: [userId] },
        { sql: "SELECT COUNT(*) as count FROM prayers WHERE user_id = ?", args: [userId] },
        { sql: "SELECT COUNT(*) as count FROM saved_plans WHERE user_id = ?", args: [userId] },
        { sql: "SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ? ORDER BY unlocked_at DESC", args: [userId] },
        {
          sql: "SELECT plan_id, completed_days, is_completed, start_date, last_completed_date FROM plans_progress WHERE user_id = ? ORDER BY start_date DESC",
          args: [userId],
        },
      ],
      "read"
    );

    const row = userRes.rows[0];
    if (!row) {
      return { error: "User not found." };
    }

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role || "user",
      streak_count: Number(row.streak_count ?? 0),
      streak_freezes_count: Number(row.streak_freezes_count ?? 1),
      last_active: row.last_active || null,
      created_at: row.created_at || null,
    };

    const plans = plansRes.rows.map(r => ({
      planId: r.plan_id,
      completedDaysCount: parseCompletedDaysCount(r.completed_days),
      isCompleted: Number(r.is_completed ?? 0) === 1,
      startDate: r.start_date || null,
      lastCompletedDate: r.last_completed_date || null,
    }));

    let activePlans = 0;
    let completedPlans = 0;
    for (const p of plans) {
      if (p.isCompleted) completedPlans++;
      else activePlans++;
    }

    const badges = badgesRes.rows.map(r => ({
      badgeId: r.badge_id,
      unlockedAt: r.unlocked_at || null,
    }));

    return {
      success: true,
      user,
      counts: {
        notes: Number(notesRes.rows[0]?.count ?? 0),
        highlights: Number(highlightsRes.rows[0]?.count ?? 0),
        journal: Number(journalRes.rows[0]?.count ?? 0),
        testimonies: Number(testimoniesRes.rows[0]?.count ?? 0),
        comments: Number(commentsRes.rows[0]?.count ?? 0),
        prayers: Number(prayersRes.rows[0]?.count ?? 0),
        activePlans,
        completedPlans,
        savedPlans: Number(savedRes.rows[0]?.count ?? 0),
      },
      badges,
      plans,
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Grant additional streak freezes (clamped 1..5) to a user
 */
export async function grantUserStreakFreeze(userId, amount = 1) {
  try {
    const admin = await verifyAdmin();
    if (!userId) return { error: "User ID is required." };

    const parsed = Math.trunc(Number(amount));
    const safeAmount = Number.isFinite(parsed) ? Math.min(5, Math.max(1, parsed)) : 1;

    const db = await getDb();
    const res = await db.execute({
      sql: "UPDATE users SET streak_freezes_count = COALESCE(streak_freezes_count, 1) + ? WHERE id = ?",
      args: [safeAmount, userId],
    });
    if (!res.rowsAffected) {
      return { error: "User not found." };
    }

    const updatedRes = await db.execute({
      sql: "SELECT streak_freezes_count FROM users WHERE id = ?",
      args: [userId],
    });
    const newFreezes = Number(updatedRes.rows[0]?.streak_freezes_count ?? 1);

    await recordAuditLog(
      db,
      admin,
      "grant_streak_freeze",
      "user",
      userId,
      `Granted +${safeAmount} streak freeze(s); total is now ${newFreezes}`
    );
    logAdminAction(`grantUserStreakFreeze by ${admin.email} for ${userId}: +${safeAmount} -> ${newFreezes}`);

    safeRevalidatePath("/admin");
    return { success: true, newFreezes };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetch all testimonies/feed posts
 */
export async function getAdminTestimonies() {
  try {
    await verifyAdmin();
    const db = await getDb();
    const res = await db.execute(`
      SELECT t.id, t.title, t.author_name, t.tag, t.image, t.created_at, t.excerpt, t.content,
             (SELECT COUNT(*) FROM likes WHERE testimony_id = t.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE testimony_id = t.id) as comments_count
      FROM testimonies t
      ORDER BY t.created_at DESC
    `);
    const plainTestimonies = res.rows.map(r => ({
      id: r.id,
      title: r.title,
      author_name: r.author_name,
      tag: r.tag || "Gratitude",
      image: r.image || getDefaultTestimonyCover(r.tag || "Gratitude"),
      created_at: r.created_at,
      excerpt: r.excerpt,
      content: r.content,
      likes_count: r.likes_count,
      comments_count: r.comments_count,
    }));
    return { success: true, testimonies: plainTestimonies };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Update a testimony's title, category tag, and optional cover image
 */
export async function updateTestimonyMeta(testimonyId, title, tag, image = undefined) {
  try {
    const admin = await verifyAdmin();
    if (!testimonyId) return { error: "Testimony ID is required." };

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanTag = typeof tag === "string" ? tag.trim() : "";

    if (!cleanTitle || cleanTitle.length > 160) {
      return { error: "Title is required and must be 160 characters or fewer." };
    }
    if (!cleanTag || cleanTag.length > 40) {
      return { error: "Tag is required and must be 40 characters or fewer." };
    }

    const db = await getDb();
    const existingRes = await db.execute({
      sql: "SELECT image FROM testimonies WHERE id = ?",
      args: [testimonyId],
    });
    if (!existingRes.rows[0]) {
      return { error: "Testimony not found." };
    }

    const oldImage = existingRes.rows[0].image || "";
    let nextImage = oldImage || getDefaultTestimonyCover(cleanTag);

    if (image !== undefined) {
      if (typeof image !== "string") {
        return { error: "Invalid cover image URL." };
      }
      const trimmedImage = image.trim();
      if (trimmedImage === "") {
        nextImage = getDefaultTestimonyCover(cleanTag);
      } else {
        if (!isSafeTestimonyCoverUrl(trimmedImage)) {
          return { error: "Invalid cover image URL." };
        }
        nextImage = trimmedImage;
      }

      await db.execute({
        sql: "UPDATE testimonies SET title = ?, tag = ?, image = ? WHERE id = ?",
        args: [cleanTitle, cleanTag, nextImage, testimonyId],
      });

      if (oldImage && oldImage !== nextImage) {
        await deleteUploadedMediaByUrl(db, oldImage);
      }
    } else {
      await db.execute({
        sql: "UPDATE testimonies SET title = ?, tag = ? WHERE id = ?",
        args: [cleanTitle, cleanTag, testimonyId],
      });
    }

    await recordAuditLog(
      db,
      admin,
      "update_testimony_meta",
      "testimony",
      testimonyId,
      `Updated testimony title="${cleanTitle}" tag="${cleanTag}"${image !== undefined ? ` image="${nextImage}"` : ""}`
    );
    logAdminAction(`updateTestimonyMeta by ${admin.email} on ${testimonyId}: "${cleanTitle}" [${cleanTag}]`);

    safeRevalidateTag("public-testimonies");
    safeRevalidatePath("/");
    safeRevalidatePath("/feed");
    safeRevalidatePath("/admin");
    revalidatePublicContentPaths([`/posts/${testimonyId}`], [
      `/posts/${testimonyId}`,
      "/feed",
      "/sitemap.xml",
      "/rss.xml",
    ]);
    return { success: true, title: cleanTitle, tag: cleanTag, image: nextImage };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetch all comments
 */
export async function getAdminComments() {
  try {
    await verifyAdmin();
    const db = await getDb();
    const res = await db.execute(`
      SELECT c.id, c.content, c.author_name, c.created_at, c.testimony_id, t.title as testimony_title
      FROM comments c
      LEFT JOIN testimonies t ON c.testimony_id = t.id
      ORDER BY c.created_at DESC
    `);
    const plainComments = res.rows.map(r => ({
      id: r.id,
      content: r.content,
      author_name: r.author_name,
      created_at: r.created_at,
      testimony_id: r.testimony_id,
      testimony_title: r.testimony_title,
    }));
    return { success: true, comments: plainComments };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetch all prayer requests
 */
export async function getAdminPrayers() {
  try {
    await verifyAdmin();
    const db = await getDb();
    const res = await db.execute(
      "SELECT id, author_name, title, content, is_anonymous, status, created_at FROM prayers ORDER BY created_at DESC"
    );
    const plainPrayers = res.rows.map(r => ({
      id: r.id,
      author_name: r.author_name,
      title: r.title,
      content: r.content,
      is_anonymous: r.is_anonymous,
      status: r.status,
      created_at: r.created_at,
    }));
    return { success: true, prayers: plainPrayers };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Toggle a prayer request between "active" and "answered"
 */
export async function togglePrayerStatus(prayerId, currentStatus) {
  try {
    const admin = await verifyAdmin();
    if (!prayerId) return { error: "Prayer ID is required." };

    const newStatus = currentStatus === "answered" ? "active" : "answered";
    const db = await getDb();
    const res = await db.execute({
      sql: "UPDATE prayers SET status = ? WHERE id = ?",
      args: [newStatus, prayerId],
    });
    if (!res.rowsAffected) {
      return { error: "Prayer request not found." };
    }

    await recordAuditLog(
      db,
      admin,
      "toggle_prayer_status",
      "prayer",
      prayerId,
      `Set prayer status to "${newStatus}"`
    );
    logAdminAction(`togglePrayerStatus by ${admin.email} on ${prayerId}: ${newStatus}`);

    safeRevalidateTag("community-stats");
    safeRevalidateTag("answered-prayers");
    safeRevalidatePath("/prayers");
    safeRevalidatePath("/admin");
    return { success: true, newStatus };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Fetch all prayer encouragements with parent prayer titles
 */
export async function getAdminPrayerEncouragements() {
  try {
    await verifyAdmin();
    const db = await getDb();
    const res = await db.execute(`
      SELECT pe.id, pe.prayer_id, pe.author_name, pe.content, pe.created_at, p.title AS prayer_title
      FROM prayer_encouragements pe
      LEFT JOIN prayers p ON pe.prayer_id = p.id
      ORDER BY pe.created_at DESC
    `);
    const encouragements = res.rows.map(r => ({
      id: r.id,
      prayer_id: r.prayer_id,
      author_name: r.author_name,
      content: r.content,
      created_at: r.created_at,
      prayer_title: r.prayer_title || null,
    }));
    return { success: true, encouragements };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Delete a prayer encouragement message
 */
export async function deletePrayerEncouragement(encouragementId) {
  try {
    const admin = await verifyAdmin();
    if (!encouragementId) return { error: "Encouragement ID is required." };

    const db = await getDb();
    const res = await db.execute({
      sql: "DELETE FROM prayer_encouragements WHERE id = ?",
      args: [encouragementId],
    });

    await recordAuditLog(
      db,
      admin,
      "delete_prayer_encouragement",
      "prayer_encouragement",
      encouragementId,
      `Deleted prayer encouragement (${res.rowsAffected ?? 0} row)`
    );
    logAdminAction(`deletePrayerEncouragement by ${admin.email}: ${encouragementId}`);

    safeRevalidateTag("answered-prayers");
    safeRevalidatePath("/prayers");
    safeRevalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Delete a user and cascade their relations
 */
export async function deleteUser(userId) {
  try {
    logAdminAction(`deleteUser requested for userId: ${userId}`);
    const admin = await verifyAdmin();

    // Server-side self-deletion guard
    if (userId === admin.id) {
      return { error: "You cannot delete your own admin account." };
    }

    logAdminAction(`deleteUser: verifyAdmin passed. Admin: ${admin.email}`);
    const db = await getDb();
    const dbRes = await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [userId],
    });
    logAdminAction(`deleteUser execute completed. Rows affected: ${dbRes.rowsAffected}`);

    await recordAuditLog(
      db,
      admin,
      "delete_user",
      "user",
      userId,
      `Deleted user account (${dbRes.rowsAffected ?? 0} row)`
    );

    safeRevalidateTag("community-stats");
    safeRevalidateTag("answered-prayers");
    safeRevalidateTag("public-testimonies");
    safeRevalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logAdminAction(`deleteUser error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Change a user's role (promote/demote)
 */
export async function toggleUserRole(userId, currentRole) {
  try {
    logAdminAction(`toggleUserRole requested for userId: ${userId}, currentRole: ${currentRole}`);
    const admin = await verifyAdmin();

    // Server-side self-demotion guard
    if (userId === admin.id) {
      return { error: "You cannot change your own admin role." };
    }

    logAdminAction(`toggleUserRole: verifyAdmin passed. Admin: ${admin.email}`);
    const newRole = currentRole === "admin" ? "user" : "admin";
    const db = await getDb();
    const dbRes = await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [newRole, userId],
    });
    logAdminAction(`toggleUserRole execute completed. Rows affected: ${dbRes.rowsAffected}`);

    await recordAuditLog(
      db,
      admin,
      "toggle_user_role",
      "user",
      userId,
      `Changed role from "${currentRole || "user"}" to "${newRole}"`
    );

    safeRevalidatePath("/admin");
    return { success: true, newRole };
  } catch (error) {
    logAdminAction(`toggleUserRole error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Delete a testimony post
 */
export async function deleteTestimony(testimonyId) {
  try {
    logAdminAction(`deleteTestimony requested for testimonyId: ${testimonyId}`);
    const admin = await verifyAdmin();
    logAdminAction(`deleteTestimony: verifyAdmin passed. Admin: ${admin.email}`);
    const db = await getDb();
    const existingRes = await db.execute({
      sql: "SELECT image FROM testimonies WHERE id = ?",
      args: [testimonyId],
    });
    const existingImage = existingRes.rows[0]?.image || "";

    const dbRes = await db.execute({
      sql: "DELETE FROM testimonies WHERE id = ?",
      args: [testimonyId],
    });
    logAdminAction(`deleteTestimony execute completed. Rows affected: ${dbRes.rowsAffected}`);

    if (existingImage) {
      await deleteUploadedMediaByUrl(db, existingImage);
    }

    await recordAuditLog(
      db,
      admin,
      "delete_testimony",
      "testimony",
      testimonyId,
      `Deleted testimony (${dbRes.rowsAffected ?? 0} row)`
    );

    safeRevalidateTag("public-testimonies");
    safeRevalidatePath("/");
    safeRevalidatePath("/feed");
    safeRevalidatePath("/admin");
    revalidatePublicContentPaths([`/posts/${testimonyId}`], ["/feed", "/sitemap.xml", "/rss.xml"]);
    return { success: true };
  } catch (error) {
    logAdminAction(`deleteTestimony error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId) {
  try {
    logAdminAction(`deleteComment requested for commentId: ${commentId}`);
    const admin = await verifyAdmin();
    logAdminAction(`deleteComment: verifyAdmin passed. Admin: ${admin.email}`);
    const db = await getDb();
    const dbRes = await db.execute({
      sql: "DELETE FROM comments WHERE id = ?",
      args: [commentId],
    });
    logAdminAction(`deleteComment execute completed. Rows affected: ${dbRes.rowsAffected}`);

    await recordAuditLog(
      db,
      admin,
      "delete_comment",
      "comment",
      commentId,
      `Deleted comment (${dbRes.rowsAffected ?? 0} row)`
    );

    safeRevalidateTag("public-testimonies");
    safeRevalidatePath("/feed");
    safeRevalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logAdminAction(`deleteComment error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Delete a prayer request
 */
export async function deletePrayer(prayerId) {
  try {
    logAdminAction(`deletePrayer requested for prayerId: ${prayerId}`);
    const admin = await verifyAdmin();
    logAdminAction(`deletePrayer: verifyAdmin passed. Admin: ${admin.email}`);
    const db = await getDb();
    const dbRes = await db.execute({
      sql: "DELETE FROM prayers WHERE id = ?",
      args: [prayerId],
    });
    logAdminAction(`deletePrayer execute completed. Rows affected: ${dbRes.rowsAffected}`);

    await recordAuditLog(
      db,
      admin,
      "delete_prayer",
      "prayer",
      prayerId,
      `Deleted prayer request (${dbRes.rowsAffected ?? 0} row)`
    );

    safeRevalidateTag("community-stats");
    safeRevalidateTag("answered-prayers");
    safeRevalidatePath("/prayers");
    safeRevalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logAdminAction(`deletePrayer error: ${error.message}`);
    return { error: error.message };
  }
}

export async function createCustomDevotional(title, category, days, image) {
  try {
    logAdminAction(`createCustomDevotional requested for title: ${title}`);
    const admin = await verifyAdmin();
    if (!title?.trim() || !category?.trim() || !Array.isArray(days) || days.length === 0) {
      return { error: "Title, category, and at least one day are required." };
    }
    const db = await getDb();

    // Generate a clean url-friendly ID
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "") || "plan";
    const id = `custom_${slug}_${Date.now()}`;

    await db.execute({
      sql: "INSERT INTO custom_devotionals (id, title, category, days, image) VALUES (?, ?, ?, ?, ?)",
      args: [id, title.trim(), category.trim(), JSON.stringify(days), image || ""],
    });
    logAdminAction(`createCustomDevotional complete. New ID: ${id}`);

    await recordAuditLog(
      db,
      admin,
      "create_custom_devotional",
      "devotional",
      id,
      `Created "${title.trim()}" (${category.trim()}, ${days.length} days)`
    );

    safeRevalidateTag("custom-devotionals");
    safeRevalidatePath("/plans");
    safeRevalidatePath(`/plans/${id}`);
    safeRevalidatePath("/admin");
    revalidatePublicContentPaths(
      [`/plans/${id}`, "/topics"],
      [`/plans/${id}`, "/plans", "/topics", "/sitemap.xml", "/rss.xml"]
    );
    return { success: true, id };
  } catch (error) {
    logAdminAction(`createCustomDevotional error: ${error.message}`);
    return { error: error.message };
  }
}

export async function updateCustomDevotional(id, title, category, days, image) {
  try {
    logAdminAction(`updateCustomDevotional requested for id: ${id}, title: ${title}`);
    const admin = await verifyAdmin();
    if (!id || !title?.trim() || !category?.trim() || !Array.isArray(days) || days.length === 0) {
      return { error: "Plan ID, title, category, and at least one day are required." };
    }
    const db = await getDb();

    await db.execute({
      sql: `INSERT INTO custom_devotionals (id, title, category, days, image)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              category = excluded.category,
              days = excluded.days,
              image = excluded.image`,
      args: [id, title.trim(), category.trim(), JSON.stringify(days), image || ""],
    });
    logAdminAction(`updateCustomDevotional complete. ID: ${id}`);

    await recordAuditLog(
      db,
      admin,
      "update_custom_devotional",
      "devotional",
      id,
      `Updated "${title.trim()}" (${category.trim()}, ${days.length} days)`
    );

    safeRevalidateTag("custom-devotionals");
    safeRevalidatePath("/plans");
    safeRevalidatePath(`/plans/${id}`);
    safeRevalidatePath("/admin");
    revalidatePublicContentPaths(
      [`/plans/${id}`, "/topics"],
      [`/plans/${id}`, "/plans", "/topics", "/sitemap.xml", "/rss.xml"]
    );
    return { success: true };
  } catch (error) {
    logAdminAction(`updateCustomDevotional error: ${error.message}`);
    return { error: error.message };
  }
}

export async function deleteCustomDevotional(id) {
  try {
    logAdminAction(`deleteCustomDevotional requested for id: ${id}`);
    const admin = await verifyAdmin();
    const db = await getDb();

    const dbRes = await db.execute({
      sql: "DELETE FROM custom_devotionals WHERE id = ?",
      args: [id],
    });
    logAdminAction(`deleteCustomDevotional complete. Rows affected: ${dbRes.rowsAffected}`);

    // Also cascade delete user progress on this custom plan
    await db.execute({
      sql: "DELETE FROM plans_progress WHERE plan_id = ?",
      args: [id],
    });
    await db.execute({
      sql: "DELETE FROM plan_reflections WHERE plan_id = ?",
      args: [id],
    });
    await db.execute({
      sql: "DELETE FROM saved_plans WHERE plan_id = ?",
      args: [id],
    });

    await recordAuditLog(
      db,
      admin,
      "delete_custom_devotional",
      "devotional",
      id,
      `Deleted custom devotional (${dbRes.rowsAffected ?? 0} row)`
    );

    safeRevalidateTag("custom-devotionals");
    safeRevalidatePath("/plans");
    safeRevalidatePath(`/plans/${id}`);
    safeRevalidatePath("/admin");
    revalidatePublicContentPaths(
      [`/plans/${id}`, "/topics"],
      ["/plans", "/topics", "/sitemap.xml", "/rss.xml"]
    );
    return { success: true };
  } catch (error) {
    logAdminAction(`deleteCustomDevotional error: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Fetch audit logs, push subscriber stats, and session health metrics
 */
export async function getAdminSystemData() {
  try {
    await verifyAdmin();
    const db = await getDb();
    const nowIso = new Date().toISOString();

    const [auditRes, pushPrefsRes, totalSessionsRes, expiredSessionsRes] = await db.batch(
      [
        "SELECT id, admin_id, admin_email, action, target_type, target_id, details, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 40",
        PUSH_PREFS_JOIN_SQL,
        "SELECT COUNT(*) as count FROM sessions",
        { sql: "SELECT COUNT(*) as count FROM sessions WHERE expires_at < ?", args: [nowIso] },
      ],
      "read"
    );

    const auditLogs = auditRes.rows.map(r => ({
      id: r.id,
      admin_id: r.admin_id || null,
      admin_email: r.admin_email,
      action: r.action,
      target_type: r.target_type || null,
      target_id: r.target_id || null,
      details: r.details || "",
      created_at: r.created_at,
    }));

    const pushBreakdown = computePushBreakdown(pushPrefsRes.rows);
    const vapidConfigured = getVapidConfig().configured;

    return {
      success: true,
      auditLogs,
      pushStats: {
        ...pushBreakdown,
        vapidConfigured,
      },
      sessionStats: {
        total: Number(totalSessionsRes.rows[0]?.count ?? 0),
        expired: Number(expiredSessionsRes.rows[0]?.count ?? 0),
      },
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Purge expired session tokens from the sessions table
 */
export async function purgeExpiredSessions() {
  try {
    const admin = await verifyAdmin();
    const db = await getDb();
    const nowIso = new Date().toISOString();

    const res = await db.execute({
      sql: "DELETE FROM sessions WHERE expires_at < ?",
      args: [nowIso],
    });
    const purgedCount = Number(res.rowsAffected ?? 0);

    await recordAuditLog(
      db,
      admin,
      "purge_expired_sessions",
      "sessions",
      "expired",
      `Purged ${purgedCount} expired session(s)`
    );
    logAdminAction(`purgeExpiredSessions by ${admin.email}: ${purgedCount} removed`);

    safeRevalidatePath("/admin");
    return { success: true, purgedCount };
  } catch (error) {
    return { error: error.message };
  }
}

const AUDIENCE_SUBSCRIPTION_QUERIES = {
  all: "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps",
  verse_of_day:
    "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps LEFT JOIN notification_preferences np ON np.endpoint = ps.endpoint WHERE COALESCE(np.verse_of_day, 1) = 1",
  devotional_reminder:
    "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps LEFT JOIN notification_preferences np ON np.endpoint = ps.endpoint WHERE COALESCE(np.devotional_reminder, 1) = 1",
  gratitude_journal:
    "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps LEFT JOIN notification_preferences np ON np.endpoint = ps.endpoint WHERE COALESCE(np.gratitude_journal, 1) = 1",
  scripture_quiz:
    "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps LEFT JOIN notification_preferences np ON np.endpoint = ps.endpoint WHERE COALESCE(np.scripture_quiz, 1) = 1",
};

/**
 * Send a targeted push notification broadcast to subscribers
 */
export async function sendAdminPushBroadcast({ title, body, url = "/", audience = "all" } = {}) {
  try {
    const admin = await verifyAdmin();

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanBody = typeof body === "string" ? body.trim() : "";
    if (!cleanTitle || cleanTitle.length > 80) {
      return { error: "Notification title must be between 1 and 80 characters." };
    }
    if (!cleanBody || cleanBody.length > 200) {
      return { error: "Notification body must be between 1 and 200 characters." };
    }

    const rawUrl = typeof url === "string" ? url.trim() : "/";
    const safeUrl = rawUrl.startsWith("/") && !rawUrl.startsWith("//") ? rawUrl : "/";

    const vapid = getVapidConfig();
    if (!vapid.configured) {
      return { error: "Push notifications are not configured (missing VAPID keys)." };
    }
    webpush.setVapidDetails(vapid.email, vapid.publicKey, vapid.privateKey);

    const safeAudience =
      audience === "self" || Object.hasOwn(AUDIENCE_SUBSCRIPTION_QUERIES, audience)
        ? audience
        : "all";

    const db = await getDb();
    const subsRes =
      safeAudience === "self"
        ? await db.execute({
            sql: "SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps WHERE ps.user_id = ?",
            args: [admin.id],
          })
        : await db.execute(AUDIENCE_SUBSCRIPTION_QUERIES[safeAudience]);

    const subs = subsRes.rows;
    const total = subs.length;
    const payload = JSON.stringify({
      title: cleanTitle,
      body: cleanBody,
      url: safeUrl,
      tag: "admin-broadcast",
    });

    let sent = 0;
    let failed = 0;
    let cleaned = 0;
    const staleEndpoints = [];

    const CHUNK_SIZE = 10;
    for (let i = 0; i < subs.length; i += CHUNK_SIZE) {
      const chunk = subs.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map(sub =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
        )
      );

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failed++;
          const statusCode = result.reason?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.push(chunk[idx].endpoint);
          }
        }
      });
    }

    for (const endpoint of staleEndpoints) {
      await db.batch([
        { sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [endpoint] },
        { sql: "DELETE FROM notification_preferences WHERE endpoint = ?", args: [endpoint] },
      ]);
      cleaned++;
    }

    await recordAuditLog(
      db,
      admin,
      "send_push_broadcast",
      "push",
      safeAudience,
      `"${cleanTitle}" (${safeUrl}) -> ${sent}/${total} sent, ${failed} failed, ${cleaned} cleaned`
    );
    logAdminAction(
      `sendAdminPushBroadcast by ${admin.email} [${safeAudience}]: "${cleanTitle}" -> ${sent}/${total} sent`
    );

    safeRevalidatePath("/admin");
    return { success: true, sent, failed, cleaned, total };
  } catch (error) {
    return { error: error.message };
  }
}
