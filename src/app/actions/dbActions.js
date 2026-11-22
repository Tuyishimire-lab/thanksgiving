"use server";

import { getDb } from "@/data/db";
import { unstable_cache, revalidateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { parseContentBlocks } from "@/data/utils";
import { getMe, updateStreakAction } from "./authActions";
import crypto from "node:crypto";

// ================= SHARED HELPERS & CACHE WRAPPERS =================

function safeRevalidateTag(tag) {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (err) {
    if (err?.message?.includes("static generation store missing")) return;
    throw err;
  }
}

async function runWithOptionalCache(cachedFn, fallbackFn) {
  try {
    return await cachedFn();
  } catch (err) {
    if (err?.message?.includes("incrementalCache missing")) {
      return await fallbackFn();
    }
    throw err;
  }
}

async function getCurrentUserId() {
  const user = await getMe();
  return user ? user.id : null;
}

async function getAuthenticatedUser() {
  const user = await getMe();
  if (!user) return null;
  return { user_id: user.id, name: user.name, email: user.email };
}

function formatDateLabel(rawDate) {
  const parsedDate =
    rawDate && (String(rawDate).includes("-") || String(rawDate).includes(":"))
      ? new Date(rawDate)
      : null;
  return parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : rawDate;
}

function parseProgressRows(rows) {
  const progress = {};
  for (const r of rows) {
    let completedDays = [];
    try {
      completedDays = JSON.parse(r.completed_days);
    } catch {
      completedDays = [];
    }
    progress[r.plan_id] = {
      planId: r.plan_id,
      currentDay: r.current_day,
      completedDays,
      isCompleted: r.is_completed === 1,
      startDate: r.start_date,
      lastCompletedDate: r.last_completed_date,
    };
  }
  return progress;
}

function parseNotesRows(rows) {
  const notes = {};
  for (const r of rows) {
    notes[r.verse_id] = { text: r.text, timestamp: r.timestamp };
  }
  return notes;
}

function parseHighlightsRows(rows) {
  const highlights = {};
  for (const r of rows) {
    highlights[r.verse_id] = r.color;
  }
  return highlights;
}

function parseReflectionsRows(rows) {
  const reflections = {};
  for (const r of rows) {
    reflections[`${r.plan_id}_${r.day_number}`] = {
      text: r.text,
      timestamp: r.timestamp,
    };
  }
  return reflections;
}

function formatPublicTestimonyRow(r) {
  let contentParsed;
  try {
    contentParsed = JSON.parse(r.content);
  } catch {
    contentParsed = [{ type: "paragraph", text: r.content }];
  }

  const fallbackText = Array.isArray(contentParsed)
    ? contentParsed
        .map((b) => b.text || (Array.isArray(b.items) ? b.items.join(" ") : ""))
        .join(" ")
        .trim()
    : String(r.content || "");

  return {
    id: r.id,
    user_id: r.user_id,
    author: r.author_name,
    title: r.title,
    content: contentParsed,
    tag: r.tag || "Gratitude",
    date: formatDateLabel(r.created_at),
    readTime: r.read_time,
    image: r.image || "/assets/images/featured/featured-2.jpg",
    excerpt: r.excerpt || fallbackText.substring(0, 100) + "...",
    likesCount: r.likes_count,
    commentsCount: r.comments_count,
    isLikedByUser: false,
  };
}

function formatPrayerRow(r, supportedSet = null) {
  return {
    id: r.id,
    user_id: r.user_id,
    author: r.is_anonymous === 1 ? "Anonymous" : r.author_name,
    title: r.title,
    content: r.content,
    isAnonymous: r.is_anonymous === 1,
    status: r.status,
    date: formatDateLabel(r.created_at),
    supportCount: r.support_count,
    isSupportedByUser: supportedSet ? supportedSet.has(r.id) : false,
    encouragementCount: r.encouragement_count || 0,
  };
}

function parseCustomDevotionalRow(r) {
  let days = [];
  try {
    days = JSON.parse(r.days);
  } catch {
    days = [];
  }
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    days: Array.isArray(days) ? days : [],
    image: r.image || "",
    created_at: r.created_at,
    isCustom: true,
  };
}

// ================= PURE PUBLIC CACHEABLE FETCHERS (NO COOKIES/HEADERS) =================

async function fetchPublicTestimoniesRaw(safeLimit = 0) {
  const db = await getDb();
  let sql = `
    SELECT t.*,
           (SELECT COUNT(*) FROM likes WHERE testimony_id = t.id) as likes_count,
           (SELECT COUNT(*) FROM comments WHERE testimony_id = t.id) as comments_count
    FROM testimonies t
    ORDER BY (CASE WHEN t.id LIKE 'post%' THEN 1 ELSE 0 END) ASC, t.created_at DESC
  `;
  const args = [];
  if (Number.isInteger(safeLimit) && safeLimit > 0) {
    sql += " LIMIT ?";
    args.push(safeLimit);
  }
  const res = args.length > 0 ? await db.execute({ sql, args }) : await db.execute(sql);
  return res.rows.map(formatPublicTestimonyRow);
}

const getCachedPublicTestimonies = unstable_cache(
  fetchPublicTestimoniesRaw,
  ["public-testimonies"],
  { revalidate: 60, tags: ["public-testimonies"] }
);

async function fetchCustomDevotionalsRaw() {
  const db = await getDb();
  const res = await db.execute(
    "SELECT id, title, category, days, image, created_at FROM custom_devotionals ORDER BY created_at DESC"
  );
  return res.rows.map(parseCustomDevotionalRow);
}

const getCachedCustomDevotionals = unstable_cache(
  fetchCustomDevotionalsRaw,
  ["custom-devotionals"],
  { revalidate: 60, tags: ["custom-devotionals"] }
);

async function fetchCustomDevotionalSummariesRaw() {
  const plans = await fetchCustomDevotionalsRaw();
  return plans.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    daysCount: Array.isArray(p.days) ? p.days.length : 0,
    firstDayReflection: Array.isArray(p.days) ? p.days[0]?.reflection || "" : "",
    image: p.image || "",
    created_at: p.created_at,
    isCustom: true,
  }));
}

const getCachedCustomDevotionalSummaries = unstable_cache(
  fetchCustomDevotionalSummariesRaw,
  ["custom-devotional-summaries"],
  { revalidate: 60, tags: ["custom-devotionals"] }
);

async function fetchLatestAnsweredPrayersRaw() {
  const db = await getDb();
  const res = await db.execute(`
    SELECT p.*,
           (SELECT COUNT(*) FROM prayer_support WHERE prayer_id = p.id) as support_count,
           (SELECT COUNT(*) FROM prayer_encouragements WHERE prayer_id = p.id) as encouragement_count
    FROM prayers p
    WHERE p.status = 'answered'
    ORDER BY p.created_at DESC
    LIMIT 3
  `);
  return res.rows.map((r) => ({
    id: r.id,
    author: r.is_anonymous === 1 ? "Anonymous" : r.author_name,
    title: r.title,
    content: r.content,
    date: formatDateLabel(r.created_at),
    supportCount: r.support_count || 0,
    encouragementCount: r.encouragement_count || 0,
  }));
}

const getCachedLatestAnsweredPrayers = unstable_cache(
  fetchLatestAnsweredPrayersRaw,
  ["answered-prayers"],
  { revalidate: 60, tags: ["answered-prayers"] }
);

async function fetchCommunityStatsRaw() {
  const db = await getDb();
  const res = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM prayers WHERE status = 'active') as activePrayers,
      (SELECT COUNT(*) FROM prayer_support) as prayerSupport,
      (SELECT COUNT(*) FROM gratitude_journal) as journalEntries
  `);
  const row = res.rows[0] || {};
  return {
    activePrayers: Number(row.activePrayers || 0),
    prayerSupport: Number(row.prayerSupport || 0),
    journalEntries: Number(row.journalEntries || 0),
  };
}

const getCachedCommunityStats = unstable_cache(
  fetchCommunityStatsRaw,
  ["community-stats"],
  { revalidate: 60, tags: ["community-stats"] }
);

// ================= TESTIMONIES FEED =================

export async function getTestimonies(limit = 0) {
  try {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 0;

    const [currentUserId, publicTestimonies] = await Promise.all([
      getCurrentUserId(),
      runWithOptionalCache(
        () => getCachedPublicTestimonies(safeLimit),
        () => fetchPublicTestimoniesRaw(safeLimit)
      ),
    ]);

    if (!currentUserId) {
      return publicTestimonies;
    }

    const db = await getDb();
    const likesRes = await db.execute({
      sql: "SELECT testimony_id FROM likes WHERE user_id = ?",
      args: [currentUserId],
    });
    const likedSet = new Set(likesRes.rows.map((l) => l.testimony_id));

    return publicTestimonies.map((t) => ({
      ...t,
      isLikedByUser: likedSet.has(t.id),
    }));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching testimonies:", error);
    return [];
  }
}

export async function createTestimony(title, content, tag = "Gratitude") {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: "Please log in to share your testimony." };
    }

    if (!title?.trim() || !content?.trim()) {
      return { error: "Please fill in all fields." };
    }

    const trimmedContent = content.trim();
    const id = `testimony_${crypto.randomUUID()}`;
    const contentBlocks = parseContentBlocks(trimmedContent);
    const excerpt = trimmedContent.substring(0, 120) + (trimmedContent.length > 120 ? "..." : "");
    const dateStr = new Date().toISOString();

    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO testimonies (id, user_id, author_name, title, content, tag, created_at, read_time, image, excerpt)
            VALUES (?, ?, ?, ?, ?, ?, ?, '2 Min read', '/assets/images/featured/featured-2.jpg', ?)`,
      args: [id, user.user_id, user.name, title.trim(), JSON.stringify(contentBlocks), tag, dateStr, excerpt],
    });

    safeRevalidateTag("public-testimonies");
    return { success: true };
  } catch (error) {
    console.error("Error creating testimony:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

// ================= LIKES & COMMENTS =================

export async function toggleLikeTestimony(testimonyId) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { error: "Please log in to like testimonies." };
    }
    if (!testimonyId) {
      return { error: "Invalid testimony." };
    }

    const db = await getDb();

    const existingRes = await db.execute({
      sql: "SELECT 1 FROM likes WHERE user_id = ? AND testimony_id = ?",
      args: [userId, testimonyId],
    });
    const existing = existingRes.rows[0];

    if (existing) {
      await db.execute({
        sql: "DELETE FROM likes WHERE user_id = ? AND testimony_id = ?",
        args: [userId, testimonyId],
      });
      safeRevalidateTag("public-testimonies");
      return { success: true, isLiked: false };
    } else {
      await db.execute({
        sql: "INSERT INTO likes (user_id, testimony_id) VALUES (?, ?)",
        args: [userId, testimonyId],
      });
      safeRevalidateTag("public-testimonies");
      return { success: true, isLiked: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return { error: "Could not register like. Please try again." };
  }
}

export async function getComments(testimonyId) {
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT * FROM comments
            WHERE testimony_id = ?
            ORDER BY created_at ASC`,
      args: [testimonyId],
    });
    const rows = res.rows;

    return rows.map((r) => ({
      id: r.id,
      testimony_id: r.testimony_id,
      user_id: r.user_id,
      author: r.author_name,
      content: r.content,
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
    }));
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

export async function addComment(testimonyId, content) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: "Please log in to write comments." };
    }

    if (!testimonyId) {
      return { error: "Invalid testimony." };
    }

    if (!content || content.trim() === "") {
      return { error: "Comment content cannot be empty." };
    }

    const id = `comment_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO comments (id, testimony_id, user_id, author_name, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, testimonyId, user.user_id, user.name, content.trim(), now],
    });

    safeRevalidateTag("public-testimonies");
    return { success: true };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Could not add comment. Please try again." };
  }
}

// ================= DEVOTIONAL PLANS =================

export async function getDevotionalProgress() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM plans_progress WHERE user_id = ?",
      args: [userId],
    });
    return parseProgressRows(res.rows);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error getting plans progress:", error);
    return {};
  }
}

export async function updateDevotionalProgress(planId, completedDays, isCompleted, currentDay, lastCompletedDate) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "User not logged in." };

    const completedDaysStr = JSON.stringify(completedDays);
    const isCompletedInt = isCompleted ? 1 : 0;
    const todayStr = new Date().toLocaleDateString();

    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO plans_progress (user_id, plan_id, completed_days, is_completed, current_day, start_date, last_completed_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, plan_id) DO UPDATE SET
              completed_days = excluded.completed_days,
              is_completed = excluded.is_completed,
              current_day = excluded.current_day,
              last_completed_date = excluded.last_completed_date`,
      args: [userId, planId, completedDaysStr, isCompletedInt, currentDay, todayStr, lastCompletedDate || null],
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating plan progress:", error);
    return { error: "Could not save plan progress." };
  }
}

export async function getSavedPlans() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT plan_id FROM saved_plans WHERE user_id = ?",
      args: [userId],
    });
    return res.rows.map((r) => r.plan_id);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error getting saved plans:", error);
    return [];
  }
}

export async function toggleSavedPlan(planId) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "Please log in to save plans." };

    const db = await getDb();
    const existingRes = await db.execute({
      sql: "SELECT 1 FROM saved_plans WHERE user_id = ? AND plan_id = ?",
      args: [userId, planId],
    });
    const existing = existingRes.rows[0];

    if (existing) {
      await db.execute({
        sql: "DELETE FROM saved_plans WHERE user_id = ? AND plan_id = ?",
        args: [userId, planId],
      });
      return { success: true, saved: false };
    } else {
      await db.execute({
        sql: "INSERT INTO saved_plans (user_id, plan_id) VALUES (?, ?)",
        args: [userId, planId],
      });
      return { success: true, saved: true };
    }
  } catch (error) {
    console.error("Error toggling saved plan:", error);
    return { error: "Could not save plan." };
  }
}

export async function getPlanReflections() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM plan_reflections WHERE user_id = ?",
      args: [userId],
    });
    return parseReflectionsRows(res.rows);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error getting reflections:", error);
    return {};
  }
}

export async function savePlanReflection(planId, dayNumber, text) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "User not logged in." };

    const timestamp = new Date().toLocaleDateString();
    const db = await getDb();

    if (!text || text.trim() === "") {
      await db.execute({
        sql: "DELETE FROM plan_reflections WHERE user_id = ? AND plan_id = ? AND day_number = ?",
        args: [userId, planId, dayNumber],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO plan_reflections (user_id, plan_id, day_number, text, timestamp)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id, plan_id, day_number) DO UPDATE SET
                text = excluded.text,
                timestamp = excluded.timestamp`,
        args: [userId, planId, dayNumber, text.trim(), timestamp],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving reflection:", error);
    return { error: "Could not save reflection." };
  }
}

// ================= NOTES & HIGHLIGHTS =================

export async function getNotebookData() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { notes: {}, highlights: {}, reflections: {} };

    const db = await getDb();
    const [notesRes, highlightsRes, reflectionsRes] = await db.batch(
      [
        { sql: "SELECT * FROM notes WHERE user_id = ?", args: [userId] },
        { sql: "SELECT * FROM highlights WHERE user_id = ?", args: [userId] },
        { sql: "SELECT * FROM plan_reflections WHERE user_id = ?", args: [userId] },
      ],
      "read"
    );

    return {
      notes: parseNotesRows(notesRes.rows),
      highlights: parseHighlightsRows(highlightsRes.rows),
      reflections: parseReflectionsRows(reflectionsRes.rows),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching notebook data:", error);
    return { notes: {}, highlights: {}, reflections: {} };
  }
}

export async function saveNote(verseId, text) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "User not logged in." };

    const timestamp = new Date().toLocaleDateString();
    const db = await getDb();

    if (!text || text.trim() === "") {
      await db.execute({
        sql: "DELETE FROM notes WHERE user_id = ? AND verse_id = ?",
        args: [userId, verseId],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO notes (user_id, verse_id, text, timestamp)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, verse_id) DO UPDATE SET
                text = excluded.text,
                timestamp = excluded.timestamp`,
        args: [userId, verseId, text.trim(), timestamp],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving note:", error);
    return { error: "Could not save note." };
  }
}

export async function toggleHighlight(verseId, color) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "User not logged in." };

    const db = await getDb();
    const existingRes = await db.execute({
      sql: "SELECT color FROM highlights WHERE user_id = ? AND verse_id = ?",
      args: [userId, verseId],
    });
    const existing = existingRes.rows[0];

    if (!color || (existing && existing.color === color)) {
      if (existing) {
        await db.execute({
          sql: "DELETE FROM highlights WHERE user_id = ? AND verse_id = ?",
          args: [userId, verseId],
        });
      }
      return { success: true, color: null };
    } else {
      await db.execute({
        sql: `INSERT INTO highlights (user_id, verse_id, color)
              VALUES (?, ?, ?)
              ON CONFLICT(user_id, verse_id) DO UPDATE SET color = excluded.color`,
        args: [userId, verseId, color],
      });
      return { success: true, color };
    }
  } catch (error) {
    console.error("Error toggling highlight:", error);
    return { error: "Could not toggle highlight." };
  }
}

// ================= BULK SYNC FROM LOCAL STORAGE =================

export async function syncLocalData(localData) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "User not logged in." };
    if (!localData || typeof localData !== "object") return { error: "Invalid data payload." };

    const todayStr = new Date().toLocaleDateString();
    const db = await getDb();
    let syncedTestimony = false;
    let syncedJournal = false;

    // 1. Sync Bookmarks/Saved Plans
    if (Array.isArray(localData.savedPlans)) {
      for (const planId of localData.savedPlans) {
        if (!planId) continue;
        await db.execute({
          sql: "INSERT OR IGNORE INTO saved_plans (user_id, plan_id) VALUES (?, ?)",
          args: [userId, planId],
        });
      }
    }

    // 2. Sync Plans Progress
    if (localData.plansProgress && typeof localData.plansProgress === "object") {
      for (const [planId, prog] of Object.entries(localData.plansProgress)) {
        if (!prog) continue;
        const completedDaysStr = JSON.stringify(prog.completedDays || []);
        const isCompletedInt = prog.isCompleted ? 1 : 0;

        await db.execute({
          sql: `INSERT INTO plans_progress (user_id, plan_id, completed_days, is_completed, current_day, start_date)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, plan_id) DO UPDATE SET
                  completed_days = excluded.completed_days,
                  is_completed = excluded.is_completed,
                  current_day = excluded.current_day`,
          args: [userId, planId, completedDaysStr, isCompletedInt, prog.currentDay || 1, prog.startDate || todayStr],
        });
      }
    }

    // 3. Sync Reflections (planId itself may contain underscores, so split on last "_")
    if (localData.reflections && typeof localData.reflections === "object") {
      for (const [key, ref] of Object.entries(localData.reflections)) {
        if (!ref || !ref.text) continue;
        const lastUnderscore = key.lastIndexOf("_");
        if (lastUnderscore <= 0) continue;
        const planId = key.slice(0, lastUnderscore);
        const dayNumber = parseInt(key.slice(lastUnderscore + 1), 10);
        if (isNaN(dayNumber)) continue;

        await db.execute({
          sql: `INSERT INTO plan_reflections (user_id, plan_id, day_number, text, timestamp)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, plan_id, day_number) DO UPDATE SET text = excluded.text`,
          args: [userId, planId, dayNumber, ref.text, ref.timestamp || todayStr],
        });
      }
    }

    // 4. Sync Bible Highlights
    if (localData.highlights && typeof localData.highlights === "object") {
      for (const [verseId, color] of Object.entries(localData.highlights)) {
        if (!color) continue;
        await db.execute({
          sql: `INSERT INTO highlights (user_id, verse_id, color)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, verse_id) DO UPDATE SET color = excluded.color`,
          args: [userId, verseId, color],
        });
      }
    }

    // 5. Sync Bible Notes
    if (localData.notes && typeof localData.notes === "object") {
      for (const [verseId, note] of Object.entries(localData.notes)) {
        if (!note || !note.text) continue;
        await db.execute({
          sql: `INSERT INTO notes (user_id, verse_id, text, timestamp)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, verse_id) DO UPDATE SET text = excluded.text`,
          args: [userId, verseId, note.text, note.timestamp || todayStr],
        });
      }
    }

    // 6. Sync local testimonies as database testimonies
    if (Array.isArray(localData.localTestimonies)) {
      const user = await getAuthenticatedUser();
      const authorName = user ? user.name : "Grateful Heart";

      for (const t of localData.localTestimonies) {
        if (!t || !t.title || !t.content) continue;
        const rawId = t.id ? String(t.id) : crypto.randomUUID();
        const id = rawId.startsWith("local_") ? rawId : `local_${rawId}`;

        const existingRes = await db.execute({
          sql: "SELECT 1 FROM testimonies WHERE id = ?",
          args: [id],
        });
        if (!existingRes.rows[0]) {
          const contentBlocks = Array.isArray(t.content)
            ? t.content
            : [{ type: "paragraph", text: typeof t.content === "string" ? t.content : "" }];
          const contentText = contentBlocks
            .map((c) => c.text || (Array.isArray(c.items) ? c.items.join(" ") : ""))
            .join(" ")
            .trim();
          const excerpt = contentText.substring(0, 120) + (contentText.length > 120 ? "..." : "");

          await db.execute({
            sql: `INSERT INTO testimonies (id, user_id, author_name, title, content, tag, created_at, read_time, image, excerpt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, '2 Min read', '/assets/images/featured/featured-2.jpg', ?)`,
            args: [
              id,
              userId,
              authorName,
              t.title,
              JSON.stringify(contentBlocks),
              t.tag || "Gratitude",
              t.date || new Date().toISOString(),
              excerpt,
            ],
          });
          syncedTestimony = true;
        }
      }
    }

    // 7. Sync local gratitude journal entries
    if (Array.isArray(localData.journalEntries)) {
      for (const entry of localData.journalEntries) {
        if (!entry || !entry.text) continue;
        const rawEntryId = entry.id ? String(entry.id) : crypto.randomUUID();
        const entryId = rawEntryId.startsWith("journal_") ? rawEntryId : `journal_${rawEntryId}`;

        const existing = await db.execute({
          sql: "SELECT 1 FROM gratitude_journal WHERE id = ?",
          args: [entryId],
        });
        if (!existing.rows[0]) {
          await db.execute({
            sql: "INSERT INTO gratitude_journal (id, user_id, prompt, entry_text, created_at) VALUES (?, ?, ?, ?, ?)",
            args: [
              entryId,
              userId,
              entry.prompt || "Gratitude Reflection",
              entry.text,
              entry.created_at || new Date().toISOString(),
            ],
          });
          syncedJournal = true;
        }
      }
    }

    // 8. Sync local unlocked badges
    if (Array.isArray(localData.unlockedBadges)) {
      for (const badge of localData.unlockedBadges) {
        if (!badge || !badge.badgeId) continue;
        await db.execute({
          sql: "INSERT OR IGNORE INTO user_badges (user_id, badge_id, unlocked_at) VALUES (?, ?, ?)",
          args: [userId, badge.badgeId, badge.unlockedAt || todayStr],
        });
      }
    }

    // Run safe badge checks at the end of sync
    await checkAndUnlockBadges(userId);

    if (syncedTestimony) safeRevalidateTag("public-testimonies");
    if (syncedJournal) safeRevalidateTag("community-stats");

    return { success: true };
  } catch (error) {
    console.error("Error syncing local data:", error);
    return { error: "Something went wrong during data synchronization." };
  }
}

// ================= CONSOLIDATED DASHBOARD LOADERS =================

export async function getHomepageData() {
  try {
    const [user, publicTestimonies] = await Promise.all([
      getMe(),
      runWithOptionalCache(
        () => getCachedPublicTestimonies(4),
        () => fetchPublicTestimoniesRaw(4)
      ),
    ]);

    if (!user) {
      return {
        user: null,
        streak: null,
        progress: {},
        highlights: {},
        testimonies: publicTestimonies.slice(0, 4),
        badges: [],
      };
    }

    const db = await getDb();
    const todayStr = new Date().toDateString();
    const needsStreakUpdate = user.last_active !== todayStr;

    const [[progressRes, highlightsRes, likesRes], streakData] = await Promise.all([
      db.batch(
        [
          {
            sql: "SELECT plan_id, completed_days, is_completed, current_day, start_date, last_completed_date FROM plans_progress WHERE user_id = ?",
            args: [user.id],
          },
          {
            sql: "SELECT verse_id, color FROM highlights WHERE user_id = ?",
            args: [user.id],
          },
          {
            sql: "SELECT testimony_id FROM likes WHERE user_id = ?",
            args: [user.id],
          },
        ],
        "read"
      ),
      needsStreakUpdate ? updateStreakAction() : Promise.resolve(null),
    ]);

    const likedSet = new Set(likesRes.rows.map((l) => l.testimony_id));
    const testimonies = publicTestimonies.slice(0, 4).map((t) => ({
      ...t,
      isLikedByUser: likedSet.has(t.id),
    }));

    return {
      user,
      streak: {
        count: streakData ? streakData.streak_count : user.streak_count,
        lastActive: streakData ? streakData.last_active : user.last_active,
        freezes: streakData ? streakData.streak_freezes_count : user.streak_freezes_count,
      },
      progress: parseProgressRows(progressRes.rows),
      highlights: parseHighlightsRows(highlightsRes.rows),
      testimonies,
      badges: [],
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching homepage data:", error);
    return {
      user: null,
      streak: null,
      progress: {},
      highlights: {},
      testimonies: [],
      badges: [],
    };
  }
}

export async function getProfileData() {
  try {
    const user = await getMe();
    if (!user) {
      return { user: null };
    }

    const db = await getDb();
    const [notesRes, highlightsRes, reflectionsRes, progressRes, savedRes, journalRes, badgesRes] =
      await db.batch(
        [
          { sql: "SELECT verse_id, text, timestamp FROM notes WHERE user_id = ?", args: [user.id] },
          { sql: "SELECT verse_id, color FROM highlights WHERE user_id = ?", args: [user.id] },
          {
            sql: "SELECT plan_id, day_number, text, timestamp FROM plan_reflections WHERE user_id = ?",
            args: [user.id],
          },
          {
            sql: "SELECT plan_id, completed_days, is_completed, current_day, start_date, last_completed_date FROM plans_progress WHERE user_id = ?",
            args: [user.id],
          },
          { sql: "SELECT plan_id FROM saved_plans WHERE user_id = ?", args: [user.id] },
          {
            sql: "SELECT id, prompt, entry_text, created_at FROM gratitude_journal WHERE user_id = ? ORDER BY created_at DESC",
            args: [user.id],
          },
          { sql: "SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?", args: [user.id] },
        ],
        "read"
      );

    const reflections = parseReflectionsRows(reflectionsRes.rows);
    const notebook = {
      notes: parseNotesRows(notesRes.rows),
      highlights: parseHighlightsRows(highlightsRes.rows),
      reflections,
    };

    const journalEntries = journalRes.rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      text: r.entry_text,
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      created_at: r.created_at,
    }));

    const badges = badgesRes.rows.map((r) => ({
      badgeId: r.badge_id,
      unlockedAt: r.unlocked_at,
    }));

    return {
      user,
      notebook,
      progress: parseProgressRows(progressRes.rows),
      savedPlans: savedRes.rows.map((r) => r.plan_id),
      reflections,
      journalEntries,
      badges,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching profile data:", error);
    return { user: null };
  }
}

export async function getPlansDashboardData() {
  try {
    const user = await getMe();
    if (!user) {
      return { user: null, progress: {}, savedPlans: [] };
    }

    const db = await getDb();
    const [progressRes, savedRes] = await db.batch(
      [
        {
          sql: "SELECT plan_id, completed_days, is_completed, current_day, start_date, last_completed_date FROM plans_progress WHERE user_id = ?",
          args: [user.id],
        },
        { sql: "SELECT plan_id FROM saved_plans WHERE user_id = ?", args: [user.id] },
      ],
      "read"
    );

    return {
      user,
      progress: parseProgressRows(progressRes.rows),
      savedPlans: savedRes.rows.map((r) => r.plan_id),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching plans dashboard data:", error);
    return { user: null, progress: {}, savedPlans: [] };
  }
}

export async function getPlanPlayerData(planId) {
  try {
    const [user, customRes] = await Promise.all([getMe(), getCustomDevotionals()]);
    const customPlan =
      customRes.success && planId
        ? customRes.plans.find((p) => p.id === planId) || null
        : null;

    if (!user || !planId) {
      return {
        user: user || null,
        customPlan,
        progress: null,
        reflections: {},
        highlights: {},
      };
    }

    const db = await getDb();
    const [progressRes, reflectionsRes, highlightsRes] = await db.batch(
      [
        {
          sql: "SELECT plan_id, completed_days, is_completed, current_day, start_date, last_completed_date FROM plans_progress WHERE user_id = ? AND plan_id = ?",
          args: [user.id, planId],
        },
        {
          sql: "SELECT plan_id, day_number, text, timestamp FROM plan_reflections WHERE user_id = ? AND plan_id = ?",
          args: [user.id, planId],
        },
        {
          sql: "SELECT verse_id, color FROM highlights WHERE user_id = ?",
          args: [user.id],
        },
      ],
      "read"
    );

    const progressMap = parseProgressRows(progressRes.rows);
    return {
      user,
      customPlan,
      progress: progressMap[planId] || null,
      reflections: parseReflectionsRows(reflectionsRes.rows),
      highlights: parseHighlightsRows(highlightsRes.rows),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching plan player data:", error);
    return {
      user: null,
      customPlan: null,
      progress: null,
      reflections: {},
      highlights: {},
    };
  }
}

// ================= NEW JOURNAL & GRATITUDE ACTIONS =================

export async function getJournalEntries() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT * FROM gratitude_journal WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });
    return res.rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      text: r.entry_text,
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      created_at: r.created_at,
    }));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching journal entries:", error);
    return [];
  }
}

export async function saveJournalEntry(prompt, text) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "User not logged in." };

    if (!text || text.trim() === "") {
      return { error: "Journal entry content cannot be empty." };
    }

    const id = `journal_${crypto.randomUUID()}`;
    const dateStr = new Date().toISOString();
    const safePrompt = (prompt || "Gratitude Reflection").trim();
    const db = await getDb();

    await db.execute({
      sql: "INSERT INTO gratitude_journal (id, user_id, prompt, entry_text, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, userId, safePrompt, text.trim(), dateStr],
    });

    await checkAndUnlockBadges(userId);
    safeRevalidateTag("community-stats");

    return { success: true };
  } catch (error) {
    console.error("Error saving journal entry:", error);
    return { error: "Could not save journal entry. Please try again." };
  }
}

// ================= PRAYER BOARD ACTIONS =================

export async function getPrayers(status = null, limit = 12, offset = 0) {
  try {
    const currentUserId = await getCurrentUserId();
    const db = await getDb();

    let sql = `
      SELECT p.*,
             (SELECT COUNT(*) FROM prayer_support WHERE prayer_id = p.id) as support_count,
             (SELECT COUNT(*) FROM prayer_encouragements WHERE prayer_id = p.id) as encouragement_count
      FROM prayers p
    `;
    const args = [];

    if (status) {
      sql += " WHERE p.status = ? ";
      args.push(status);
    }

    sql += " ORDER BY p.created_at DESC LIMIT ? OFFSET ? ";
    args.push(limit, offset);

    const [res, supportRes] = await Promise.all([
      db.execute({ sql, args }),
      currentUserId
        ? db.execute({
            sql: "SELECT prayer_id FROM prayer_support WHERE user_id = ?",
            args: [currentUserId],
          })
        : Promise.resolve({ rows: [] }),
    ]);

    const supportedSet = new Set(supportRes.rows.map((s) => s.prayer_id));
    return res.rows.map((r) => formatPrayerRow(r, supportedSet));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching prayers:", error);
    return [];
  }
}

export async function getPrayerCounts() {
  try {
    const db = await getDb();
    const res = await db.execute(`
      SELECT status, COUNT(*) as count FROM prayers GROUP BY status
    `);
    let active = 0;
    let answered = 0;
    res.rows.forEach((r) => {
      if (r.status === "active") active = r.count;
      if (r.status === "answered") answered = r.count;
    });
    return { active, answered };
  } catch (error) {
    console.error("Error fetching prayer counts:", error);
    return { active: 0, answered: 0 };
  }
}

export async function getPrayersPageData(status = "active", limit = 12, offset = 0) {
  try {
    const user = await getMe();
    const db = await getDb();

    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);
    const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 12;
    const safeOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    let prayersSql = `
      SELECT p.*,
             (SELECT COUNT(*) FROM prayer_support WHERE prayer_id = p.id) as support_count,
             (SELECT COUNT(*) FROM prayer_encouragements WHERE prayer_id = p.id) as encouragement_count
      FROM prayers p
    `;
    const prayersArgs = [];
    if (status) {
      prayersSql += " WHERE p.status = ? ";
      prayersArgs.push(status);
    }
    prayersSql += " ORDER BY p.created_at DESC LIMIT ? OFFSET ? ";
    prayersArgs.push(safeLimit, safeOffset);

    const stmts = [
      "SELECT status, COUNT(*) as count FROM prayers GROUP BY status",
      { sql: prayersSql, args: prayersArgs },
    ];
    if (user) {
      stmts.push({
        sql: "SELECT prayer_id FROM prayer_support WHERE user_id = ?",
        args: [user.id],
      });
    }

    const results = await db.batch(stmts, "read");
    const countsRes = results[0];
    const prayersRes = results[1];
    const supportRes = results[2] || { rows: [] };

    let active = 0;
    let answered = 0;
    for (const r of countsRes.rows) {
      if (r.status === "active") active = Number(r.count || 0);
      if (r.status === "answered") answered = Number(r.count || 0);
    }

    const supportedSet = new Set(supportRes.rows.map((s) => s.prayer_id));
    return {
      user: user || null,
      counts: { active, answered },
      prayers: prayersRes.rows.map((r) => formatPrayerRow(r, supportedSet)),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching prayers page data:", error);
    return { user: null, counts: { active: 0, answered: 0 }, prayers: [] };
  }
}

export async function createPrayer(title, content, isAnonymous = false, guestName = "") {
  try {
    if (!title?.trim() || !content?.trim()) return { error: "Please fill in all fields." };

    const user = await getAuthenticatedUser();
    const id = `prayer_${crypto.randomUUID()}`;
    const dateStr = new Date().toISOString();
    const db = await getDb();

    if (user) {
      const isAnonInt = isAnonymous ? 1 : 0;
      await db.execute({
        sql: `INSERT INTO prayers (id, user_id, author_name, title, content, is_anonymous, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
        args: [id, user.user_id, user.name, title.trim(), content.trim(), isAnonInt, dateStr],
      });
      await checkAndUnlockBadges(user.user_id);
    } else {
      const authorName = guestName?.trim() || "Anonymous";
      await db.execute({
        sql: `INSERT INTO prayers (id, user_id, author_name, title, content, is_anonymous, status, created_at)
              VALUES (?, ?, ?, ?, ?, 1, 'active', ?)`,
        args: [id, null, authorName, title.trim(), content.trim(), dateStr],
      });
    }

    safeRevalidateTag("community-stats");
    return { success: true };
  } catch (error) {
    console.error("Error creating prayer:", error);
    return { error: "Could not submit prayer. Please try again." };
  }
}

export async function toggleSupportPrayer(prayerId) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { error: "Please log in to support prayers." };

    const db = await getDb();

    const existingRes = await db.execute({
      sql: "SELECT 1 FROM prayer_support WHERE user_id = ? AND prayer_id = ?",
      args: [userId, prayerId],
    });
    const existing = existingRes.rows[0];

    let isSupported = false;
    if (existing) {
      await db.execute({
        sql: "DELETE FROM prayer_support WHERE user_id = ? AND prayer_id = ?",
        args: [userId, prayerId],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO prayer_support (user_id, prayer_id) VALUES (?, ?)",
        args: [userId, prayerId],
      });
      isSupported = true;
    }

    await checkAndUnlockBadges(userId);
    safeRevalidateTag("community-stats");
    safeRevalidateTag("answered-prayers");

    return { success: true, isSupported };
  } catch (error) {
    console.error("Error toggling prayer support:", error);
    return { error: "Could not register support. Please try again." };
  }
}

export async function markPrayerAsAnswered(prayerId, testimonyTitle, testimonyContent) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { error: "Please log in to update your prayer request." };

    const db = await getDb();

    const prayerRes = await db.execute({
      sql: "SELECT user_id FROM prayers WHERE id = ?",
      args: [prayerId],
    });
    const prayer = prayerRes.rows[0];
    if (!prayer || prayer.user_id !== user.user_id) {
      return { error: "You can only update your own prayer requests." };
    }

    await db.execute({
      sql: "UPDATE prayers SET status = 'answered' WHERE id = ?",
      args: [prayerId],
    });

    if (testimonyTitle?.trim() && testimonyContent?.trim()) {
      await createTestimony(testimonyTitle, testimonyContent, "Answered Prayer");
    }

    await checkAndUnlockBadges(user.user_id);
    safeRevalidateTag("community-stats");
    safeRevalidateTag("answered-prayers");

    return { success: true };
  } catch (error) {
    console.error("Error marking prayer as answered:", error);
    return { error: "Could not update prayer request." };
  }
}

// ================= BADGES / MILESTONES ENGINE =================

export async function getUnlockedBadges() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?",
      args: [userId],
    });
    return res.rows.map((r) => ({
      badgeId: r.badge_id,
      unlockedAt: r.unlocked_at,
    }));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error fetching unlocked badges:", error);
    return [];
  }
}

export async function checkAndUnlockBadges(userId) {
  try {
    if (!userId) return [];

    const db = await getDb();

    const [notesRes, journalRes, progressRes, supportRes, streakRes, existingRes] =
      await db.batch(
        [
          { sql: "SELECT COUNT(*) as count FROM notes WHERE user_id = ?", args: [userId] },
          {
            sql: "SELECT COUNT(*) as count FROM gratitude_journal WHERE user_id = ?",
            args: [userId],
          },
          {
            sql: "SELECT COUNT(*) as count FROM plans_progress WHERE user_id = ? AND is_completed = 1",
            args: [userId],
          },
          {
            sql: "SELECT COUNT(*) as count FROM prayer_support WHERE user_id = ?",
            args: [userId],
          },
          { sql: "SELECT streak_count FROM users WHERE id = ?", args: [userId] },
          { sql: "SELECT badge_id FROM user_badges WHERE user_id = ?", args: [userId] },
        ],
        "read"
      );

    const notesCount = notesRes.rows[0]?.count || 0;
    const journalCount = journalRes.rows[0]?.count || 0;
    const completedPlansCount = progressRes.rows[0]?.count || 0;
    const supportedPrayersCount = supportRes.rows[0]?.count || 0;
    const streakCount = streakRes.rows[0]?.streak_count || 0;

    const unlockedSet = new Set(existingRes.rows.map((r) => r.badge_id));
    const newlyUnlocked = [];
    const dateStr = new Date().toLocaleDateString();

    const tryUnlock = async (badgeId, condition, grantFreeze = false) => {
      if (condition && !unlockedSet.has(badgeId)) {
        const insertRes = await db.execute({
          sql: "INSERT OR IGNORE INTO user_badges (user_id, badge_id, unlocked_at) VALUES (?, ?, ?)",
          args: [userId, badgeId, dateStr],
        });

        if (insertRes.rowsAffected > 0) {
          if (grantFreeze) {
            await db.execute({
              sql: "UPDATE users SET streak_freezes_count = COALESCE(streak_freezes_count, 0) + 1 WHERE id = ?",
              args: [userId],
            });
          }
          unlockedSet.add(badgeId);
          newlyUnlocked.push(badgeId);
        }
      }
    };

    await tryUnlock("first_journal", journalCount >= 1, true);
    await tryUnlock("streak_7", streakCount >= 7, true);
    await tryUnlock("first_note", notesCount >= 1, false);
    await tryUnlock("devotional_complete", completedPlansCount >= 1, false);
    await tryUnlock("prayer_partner", supportedPrayersCount >= 5, false);

    return newlyUnlocked;
  } catch (error) {
    console.error("Error checking and unlocking badges:", error);
    return [];
  }
}

export async function getCustomDevotionals() {
  try {
    const plans = await runWithOptionalCache(
      () => getCachedCustomDevotionals(),
      () => fetchCustomDevotionalsRaw()
    );
    return { success: true, plans };
  } catch (error) {
    console.error("Error fetching custom devotionals:", error);
    return { error: error.message };
  }
}

export async function getCustomDevotionalSummaries() {
  try {
    const plans = await runWithOptionalCache(
      () => getCachedCustomDevotionalSummaries(),
      () => fetchCustomDevotionalSummariesRaw()
    );
    return { success: true, plans };
  } catch (error) {
    console.error("Error fetching custom devotional summaries:", error);
    return { error: error.message };
  }
}

export async function getCustomDevotionalById(id) {
  try {
    if (!id) return { error: "Plan not found." };
    const customRes = await getCustomDevotionals();
    if (!customRes.success) return { error: customRes.error };
    const plan = customRes.plans.find((p) => p.id === id);
    if (!plan) return { error: "Plan not found." };
    return { success: true, plan };
  } catch (error) {
    console.error("Error fetching custom devotional by id:", error);
    return { error: error.message };
  }
}

export async function getPrayerEncouragements(prayerId) {
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT id, prayer_id, user_id, author_name, content, created_at
            FROM prayer_encouragements
            WHERE prayer_id = ?
            ORDER BY created_at ASC`,
      args: [prayerId],
    });

    return res.rows.map((r) => ({
      id: r.id,
      prayerId: r.prayer_id,
      userId: r.user_id,
      authorName: r.author_name,
      content: r.content,
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  } catch (error) {
    console.error("Error fetching prayer encouragements:", error);
    return [];
  }
}

export async function addPrayerEncouragement(prayerId, content, guestName = "") {
  try {
    if (!prayerId) return { error: "Invalid prayer request." };
    if (!content || !content.trim()) return { error: "Encouragement content cannot be empty." };

    const user = await getAuthenticatedUser();
    const id = `enc_${crypto.randomUUID()}`;
    const dateStr = new Date().toISOString();
    const db = await getDb();

    if (user) {
      await db.execute({
        sql: `INSERT INTO prayer_encouragements (id, prayer_id, user_id, author_name, content, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, prayerId, user.user_id, user.name, content.trim(), dateStr],
      });
      await checkAndUnlockBadges(user.user_id);
    } else {
      const authorName = guestName?.trim() || "Anonymous";
      await db.execute({
        sql: `INSERT INTO prayer_encouragements (id, prayer_id, user_id, author_name, content, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, prayerId, null, authorName, content.trim(), dateStr],
      });
    }

    safeRevalidateTag("answered-prayers");
    return { success: true };
  } catch (error) {
    console.error("Error adding prayer encouragement:", error);
    return { error: "Could not add encouragement. Please try again." };
  }
}

export async function getLatestAnsweredPrayers() {
  try {
    return await runWithOptionalCache(
      () => getCachedLatestAnsweredPrayers(),
      () => fetchLatestAnsweredPrayersRaw()
    );
  } catch (error) {
    console.error("Error fetching latest answered prayers:", error);
    return [];
  }
}

export async function getCommunityStats() {
  try {
    return await runWithOptionalCache(
      () => getCachedCommunityStats(),
      () => fetchCommunityStatsRaw()
    );
  } catch (error) {
    console.error("Error fetching community stats:", error);
    return {
      activePrayers: 0,
      prayerSupport: 0,
      journalEntries: 0,
    };
  }
}
