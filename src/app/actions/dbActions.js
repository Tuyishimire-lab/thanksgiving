"use server";

import { getDb } from "@/data/db";
import { cookies } from "next/headers";
import { parseContentBlocks } from "@/data/utils";
import { getMe, updateStreakAction } from "./authActions";

/**
 * Helper to fetch current logged-in user ID
 */
async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const now = new Date().toISOString();
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?",
    args: [token, now]
  });
  const session = res.rows[0];
  return session ? session.user_id : null;
}

/**
 * Get current session user
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const now = new Date().toISOString();
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT s.user_id, u.name, u.email 
          FROM sessions s 
          JOIN users u ON s.user_id = u.id 
          WHERE s.id = ? AND s.expires_at > ?`,
    args: [token, now]
  });
  return res.rows[0] || null;
}

// ================= TESTIMONIES FEED =================

export async function getTestimonies() {
  try {
    const currentUserId = await getCurrentUserId();
    const db = await getDb();

    const res = await db.execute(`
      SELECT t.*, 
             (SELECT COUNT(*) FROM likes WHERE testimony_id = t.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE testimony_id = t.id) as comments_count
      FROM testimonies t
      ORDER BY (CASE WHEN t.id LIKE 'post%' THEN 1 ELSE 0 END) ASC, t.created_at DESC
    `);
    const rows = res.rows;

    // Check which ones the current user liked
    let likedSet = new Set();
    if (currentUserId) {
      const likesRes = await db.execute({
        sql: "SELECT testimony_id FROM likes WHERE user_id = ?",
        args: [currentUserId]
      });
      likesRes.rows.forEach(l => likedSet.add(l.testimony_id));
    }

    return rows.map(r => {
      let contentParsed;
      try {
        contentParsed = JSON.parse(r.content);
      } catch (e) {
        contentParsed = [{ type: "paragraph", text: r.content }];
      }

      return {
        id: r.id,
        user_id: r.user_id,
        author: r.author_name,
        title: r.title,
        content: contentParsed,
        tag: r.tag || "Gratitude",
        date: (r.created_at && (r.created_at.includes("-") || r.created_at.includes(":")))
          ? new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
          : r.created_at,
        readTime: r.read_time,
        image: r.image || "/assets/images/featured/featured-2.jpg",
        excerpt: r.excerpt || (r.content.substring(0, 100) + "..."),
        likesCount: r.likes_count,
        commentsCount: r.comments_count,
        isLikedByUser: likedSet.has(r.id)
      };
    });
  } catch (error) {
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

    if (!title || !content) {
      return { error: "Please fill in all fields." };
    }

    const id = `testimony_${Date.now()}`;
    const contentBlocks = parseContentBlocks(content);
    const excerpt = content.substring(0, 120) + (content.length > 120 ? "..." : "");
    const dateStr = new Date().toISOString();

    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO testimonies (id, user_id, author_name, title, content, tag, created_at, read_time, image, excerpt)
            VALUES (?, ?, ?, ?, ?, ?, ?, '2 Min read', '/assets/images/featured/featured-2.jpg', ?)`,
      args: [id, user.user_id, user.name, title.trim(), JSON.stringify(contentBlocks), tag, dateStr, excerpt]
    });

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

    const db = await getDb();
    
    // Check if like exists
    const existingRes = await db.execute({
      sql: "SELECT 1 FROM likes WHERE user_id = ? AND testimony_id = ?",
      args: [userId, testimonyId]
    });
    const existing = existingRes.rows[0];

    if (existing) {
      await db.execute({
        sql: "DELETE FROM likes WHERE user_id = ? AND testimony_id = ?",
        args: [userId, testimonyId]
      });
      return { success: true, isLiked: false };
    } else {
      await db.execute({
        sql: "INSERT INTO likes (user_id, testimony_id) VALUES (?, ?)",
        args: [userId, testimonyId]
      });
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
      args: [testimonyId]
    });
    const rows = res.rows;

    return rows.map(r => ({
      id: r.id,
      testimony_id: r.testimony_id,
      user_id: r.user_id,
      author: r.author_name,
      content: r.content,
      date: new Date(r.created_at).toLocaleDateString("en-US", { 
        day: "numeric", 
        month: "short", 
        hour: "numeric", 
        minute: "2-digit" 
      })
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

    if (!content || content.trim() === "") {
      return { error: "Comment content cannot be empty." };
    }

    const id = `comment_${Date.now()}`;
    const now = new Date().toISOString();

    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO comments (id, testimony_id, user_id, author_name, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, testimonyId, user.user_id, user.name, content.trim(), now]
    });

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
      args: [userId]
    });
    const rows = res.rows;
    const progress = {};
    
    rows.forEach(r => {
      progress[r.plan_id] = {
        planId: r.plan_id,
        currentDay: r.current_day,
        completedDays: JSON.parse(r.completed_days),
        isCompleted: r.is_completed === 1,
        startDate: r.start_date,
        lastCompletedDate: r.last_completed_date
      };
    });

    return progress;
  } catch (error) {
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
      args: [userId, planId, completedDaysStr, isCompletedInt, currentDay, todayStr, lastCompletedDate || null]
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
      args: [userId]
    });
    return res.rows.map(r => r.plan_id);
  } catch (error) {
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
      args: [userId, planId]
    });
    const existing = existingRes.rows[0];

    if (existing) {
      await db.execute({
        sql: "DELETE FROM saved_plans WHERE user_id = ? AND plan_id = ?",
        args: [userId, planId]
      });
      return { success: true, saved: false };
    } else {
      await db.execute({
        sql: "INSERT INTO saved_plans (user_id, plan_id) VALUES (?, ?)",
        args: [userId, planId]
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
      args: [userId]
    });
    const rows = res.rows;
    const reflections = {};
    
    rows.forEach(r => {
      reflections[`${r.plan_id}_${r.day_number}`] = {
        text: r.text,
        timestamp: r.timestamp
      };
    });

    return reflections;
  } catch (error) {
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
        args: [userId, planId, dayNumber]
      });
    } else {
      await db.execute({
        sql: `INSERT INTO plan_reflections (user_id, plan_id, day_number, text, timestamp)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id, plan_id, day_number) DO UPDATE SET 
                text = excluded.text,
                timestamp = excluded.timestamp`,
        args: [userId, planId, dayNumber, text.trim(), timestamp]
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
    const [notesRes, highlightsRes, reflectionsRes] = await Promise.all([
      db.execute({
        sql: "SELECT * FROM notes WHERE user_id = ?",
        args: [userId]
      }),
      db.execute({
        sql: "SELECT * FROM highlights WHERE user_id = ?",
        args: [userId]
      }),
      db.execute({
        sql: "SELECT * FROM plan_reflections WHERE user_id = ?",
        args: [userId]
      })
    ]);

    const notes = {};
    notesRes.rows.forEach(r => {
      notes[r.verse_id] = { text: r.text, timestamp: r.timestamp };
    });

    const highlights = {};
    highlightsRes.rows.forEach(r => {
      highlights[r.verse_id] = r.color;
    });

    const reflections = {};
    reflectionsRes.rows.forEach(r => {
      reflections[`${r.plan_id}_${r.day_number}`] = { text: r.text, timestamp: r.timestamp };
    });

    return { notes, highlights, reflections };
  } catch (error) {
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
        args: [userId, verseId]
      });
    } else {
      await db.execute({
        sql: `INSERT INTO notes (user_id, verse_id, text, timestamp)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, verse_id) DO UPDATE SET 
                text = excluded.text,
                timestamp = excluded.timestamp`,
        args: [userId, verseId, text.trim(), timestamp]
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
      args: [userId, verseId]
    });
    const existing = existingRes.rows[0];

    if (existing && (existing.color === color || !color)) {
      await db.execute({
        sql: "DELETE FROM highlights WHERE user_id = ? AND verse_id = ?",
        args: [userId, verseId]
      });
      return { success: true, color: null };
    } else {
      await db.execute({
        sql: `INSERT INTO highlights (user_id, verse_id, color)
              VALUES (?, ?, ?)
              ON CONFLICT(user_id, verse_id) DO UPDATE SET color = excluded.color`,
        args: [userId, verseId, color]
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

    const todayStr = new Date().toLocaleDateString();
    const db = await getDb();

    // 1. Sync Bookmarks/Saved Plans
    if (Array.isArray(localData.savedPlans)) {
      for (const planId of localData.savedPlans) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO saved_plans (user_id, plan_id) VALUES (?, ?)",
          args: [userId, planId]
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
          args: [userId, planId, completedDaysStr, isCompletedInt, prog.currentDay || 1, prog.startDate || todayStr]
        });
      }
    }

    // 3. Sync Reflections
    if (localData.reflections && typeof localData.reflections === "object") {
      for (const [key, ref] of Object.entries(localData.reflections)) {
        if (!ref || !ref.text) continue;
        const parts = key.split("_");
        if (parts.length < 2) continue;
        const planId = parts[0];
        const dayNumber = parseInt(parts[1]);
        if (isNaN(dayNumber)) continue;

        await db.execute({
          sql: `INSERT INTO plan_reflections (user_id, plan_id, day_number, text, timestamp)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, plan_id, day_number) DO UPDATE SET text = excluded.text`,
          args: [userId, planId, dayNumber, ref.text, ref.timestamp || todayStr]
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
          args: [userId, verseId, color]
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
          args: [userId, verseId, note.text, note.timestamp || todayStr]
        });
      }
    }

    // 6. Sync local testimonies as database testimonies
    if (Array.isArray(localData.localTestimonies)) {
      const user = await getAuthenticatedUser();
      const authorName = user ? user.name : "Grateful Heart";
      
      for (const t of localData.localTestimonies) {
        if (!t || !t.title || !t.content) continue;
        const id = t.id.startsWith("local_") ? t.id : `local_${t.id}`;
        
        // Check if testimony already exists
        const existingRes = await db.execute({
          sql: "SELECT 1 FROM testimonies WHERE id = ?",
          args: [id]
        });
        if (!existingRes.rows[0]) {
          const contentText = Array.isArray(t.content) 
            ? t.content.map(c => c.text).join("\n\n") 
            : typeof t.content === "string" ? t.content : "";
          
          const contentBlocks = [{ type: "paragraph", text: contentText }];
          const excerpt = contentText.substring(0, 120) + (contentText.length > 120 ? "..." : "");

          await db.execute({
            sql: `INSERT INTO testimonies (id, user_id, author_name, title, content, tag, created_at, read_time, image, excerpt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, '2 Min read', '/assets/images/featured/featured-2.jpg', ?)`,
            args: [id, userId, authorName, t.title, JSON.stringify(contentBlocks), t.tag || "Gratitude", t.date || new Date().toISOString(), excerpt]
          });
        }
      }
    }

    // 7. Sync local gratitude journal entries
    if (Array.isArray(localData.journalEntries)) {
      for (const entry of localData.journalEntries) {
        if (!entry || !entry.text) continue;
        const entryId = entry.id.startsWith("journal_") ? entry.id : `journal_${entry.id}`;
        
        const existing = await db.execute({
          sql: "SELECT 1 FROM gratitude_journal WHERE id = ?",
          args: [entryId]
        });
        if (!existing.rows[0]) {
          await db.execute({
            sql: "INSERT INTO gratitude_journal (id, user_id, prompt, entry_text, created_at) VALUES (?, ?, ?, ?, ?)",
            args: [entryId, userId, entry.prompt || "Gratitude Reflection", entry.text, entry.created_at || new Date().toISOString()]
          });
        }
      }
    }

    // 8. Sync local unlocked badges
    if (Array.isArray(localData.unlockedBadges)) {
      for (const badge of localData.unlockedBadges) {
        if (!badge || !badge.badgeId) continue;
        await db.execute({
          sql: "INSERT OR IGNORE INTO user_badges (user_id, badge_id, unlocked_at) VALUES (?, ?, ?)",
          args: [userId, badge.badgeId, badge.unlockedAt || todayStr]
        });
      }
    }

    // Run safe badge checks at the end of sync
    await checkAndUnlockBadges(userId);

    return { success: true };
  } catch (error) {
    console.error("Error syncing local data:", error);
    return { error: "Something went wrong during data synchronization." };
  }
}

// ================= CONSOLIDATED DASHBOARD LOADERS =================

export async function getHomepageData() {
  try {
    const user = await getMe();
    if (!user) {
      // Guest mode - fetch testimonies in parallel with null values for auth stats
      const testimonies = await getTestimonies();
      return {
        user: null,
        streak: null,
        progress: {},
        highlights: {},
        testimonies: testimonies.slice(0, 4),
        badges: []
      };
    }

    // Logged in: fetch everything concurrently on the server
    const [streakData, progress, notebook, testimonies, badges] = await Promise.all([
      updateStreakAction(),
      getDevotionalProgress(),
      getNotebookData(),
      getTestimonies(),
      getUnlockedBadges()
    ]);

    return {
      user,
      streak: {
        count: streakData ? streakData.streak_count : user.streak_count,
        lastActive: streakData ? streakData.last_active : user.last_active,
        freezes: streakData ? streakData.streak_freezes_count : user.streak_freezes_count
      },
      progress,
      highlights: notebook.highlights || {},
      testimonies: testimonies.slice(0, 4),
      badges: badges || []
    };
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    return {
      user: null,
      streak: null,
      progress: {},
      highlights: {},
      testimonies: [],
      badges: []
    };
  }
}

export async function getProfileData() {
  try {
    const user = await getMe();
    if (!user) {
      return { user: null };
    }

    const [notebook, progress, savedPlans, reflections, journalEntries, badges] = await Promise.all([
      getNotebookData(),
      getDevotionalProgress(),
      getSavedPlans(),
      getPlanReflections(),
      getJournalEntries(),
      getUnlockedBadges()
    ]);

    return {
      user,
      notebook,
      progress,
      savedPlans,
      reflections,
      journalEntries,
      badges
    };
  } catch (error) {
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

    const [progress, savedPlans] = await Promise.all([
      getDevotionalProgress(),
      getSavedPlans()
    ]);

    return {
      user,
      progress,
      savedPlans
    };
  } catch (error) {
    console.error("Error fetching plans dashboard data:", error);
    return { user: null, progress: {}, savedPlans: [] };
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
      args: [userId]
    });
    return res.rows.map(r => ({
      id: r.id,
      prompt: r.prompt,
      text: r.entry_text,
      date: new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
      created_at: r.created_at
    }));
  } catch (error) {
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

    const id = `journal_${Date.now()}`;
    const dateStr = new Date().toISOString();
    const db = await getDb();
    
    await db.execute({
      sql: "INSERT INTO gratitude_journal (id, user_id, prompt, entry_text, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, userId, prompt.trim(), text.trim(), dateStr]
    });

    // Check badges after journaling
    await checkAndUnlockBadges(userId);

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

    const res = await db.execute({
      sql,
      args
    });
    const rows = res.rows;

    let supportedSet = new Set();
    if (currentUserId) {
      const supportRes = await db.execute({
        sql: "SELECT prayer_id FROM prayer_support WHERE user_id = ?",
        args: [currentUserId]
      });
      supportRes.rows.forEach(s => supportedSet.add(s.prayer_id));
    }

    return rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      author: r.is_anonymous === 1 ? "Anonymous" : r.author_name,
      title: r.title,
      content: r.content,
      isAnonymous: r.is_anonymous === 1,
      status: r.status,
      date: new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
      supportCount: r.support_count,
      isSupportedByUser: supportedSet.has(r.id),
      encouragementCount: r.encouragement_count || 0
    }));
  } catch (error) {
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
    res.rows.forEach(r => {
      if (r.status === "active") active = r.count;
      if (r.status === "answered") answered = r.count;
    });
    return { active, answered };
  } catch (error) {
    console.error("Error fetching prayer counts:", error);
    return { active: 0, answered: 0 };
  }
}

export async function createPrayer(title, content, isAnonymous = false) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { error: "Please log in to share a prayer request." };

    if (!title || !content) return { error: "Please fill in all fields." };

    const id = `prayer_${Date.now()}`;
    const dateStr = new Date().toISOString();
    const isAnonInt = isAnonymous ? 1 : 0;
    const db = await getDb();

    await db.execute({
      sql: `INSERT INTO prayers (id, user_id, author_name, title, content, is_anonymous, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      args: [id, user.user_id, user.name, title.trim(), content.trim(), isAnonInt, dateStr]
    });

    // Check badges after posting prayer
    await checkAndUnlockBadges(user.user_id);

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
    
    // Check if support exists
    const existingRes = await db.execute({
      sql: "SELECT 1 FROM prayer_support WHERE user_id = ? AND prayer_id = ?",
      args: [userId, prayerId]
    });
    const existing = existingRes.rows[0];

    let isSupported = false;
    if (existing) {
      await db.execute({
        sql: "DELETE FROM prayer_support WHERE user_id = ? AND prayer_id = ?",
        args: [userId, prayerId]
      });
    } else {
      await db.execute({
        sql: "INSERT INTO prayer_support (user_id, prayer_id) VALUES (?, ?)",
        args: [userId, prayerId]
      });
      isSupported = true;
    }

    // Check badges after supporting a prayer
    await checkAndUnlockBadges(userId);

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

    // Verify ownership
    const prayerRes = await db.execute({
      sql: "SELECT user_id FROM prayers WHERE id = ?",
      args: [prayerId]
    });
    const prayer = prayerRes.rows[0];
    if (!prayer || prayer.user_id !== user.user_id) {
      return { error: "You can only update your own prayer requests." };
    }

    // Update prayer status
    await db.execute({
      sql: "UPDATE prayers SET status = 'answered' WHERE id = ?",
      args: [prayerId]
    });

    // Create a public testimony automatically
    if (testimonyTitle && testimonyContent) {
      await createTestimony(testimonyTitle, testimonyContent, "Answered Prayer");
    }

    // Check badges
    await checkAndUnlockBadges(user.user_id);

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
      args: [userId]
    });
    return res.rows.map(r => ({
      badgeId: r.badge_id,
      unlockedAt: r.unlocked_at
    }));
  } catch (error) {
    console.error("Error fetching unlocked badges:", error);
    return [];
  }
}

export async function checkAndUnlockBadges(userId) {
  try {
    if (!userId) return [];

    const db = await getDb();
    
    // Fetch stats in parallel
    const [notesRes, journalRes, progressRes, supportRes, streakRes] = await Promise.all([
      db.execute({
        sql: "SELECT COUNT(*) as count FROM notes WHERE user_id = ?",
        args: [userId]
      }),
      db.execute({
        sql: "SELECT COUNT(*) as count FROM gratitude_journal WHERE user_id = ?",
        args: [userId]
      }),
      db.execute({
        sql: "SELECT COUNT(*) as count FROM plans_progress WHERE user_id = ? AND is_completed = 1",
        args: [userId]
      }),
      db.execute({
        sql: "SELECT COUNT(*) as count FROM prayer_support WHERE user_id = ?",
        args: [userId]
      }),
      db.execute({
        sql: "SELECT streak_count FROM users WHERE id = ?",
        args: [userId]
      })
    ]);

    const notesCount = notesRes.rows[0]?.count || 0;
    const journalCount = journalRes.rows[0]?.count || 0;
    const completedPlansCount = progressRes.rows[0]?.count || 0;
    const supportedPrayersCount = supportRes.rows[0]?.count || 0;
    const streakCount = streakRes.rows[0]?.streak_count || 0;

    // Fetch already unlocked badges
    const existingRes = await db.execute({
      sql: "SELECT badge_id FROM user_badges WHERE user_id = ?",
      args: [userId]
    });
    const unlockedSet = new Set(existingRes.rows.map(r => r.badge_id));

    const newlyUnlocked = [];
    const dateStr = new Date().toLocaleDateString();

    const tryUnlock = async (badgeId, condition, grantFreeze = false) => {
      if (condition && !unlockedSet.has(badgeId)) {
        await db.execute({
          sql: "INSERT INTO user_badges (user_id, badge_id, unlocked_at) VALUES (?, ?, ?)",
          args: [userId, badgeId, dateStr]
        });
        
        if (grantFreeze) {
          await db.execute({
            sql: "UPDATE users SET streak_freezes_count = streak_freezes_count + 1 WHERE id = ?",
            args: [userId]
          });
        }
        
        newlyUnlocked.push(badgeId);
      }
    };

    // 1. Submit first gratitude entry
    await tryUnlock("first_journal", journalCount >= 1, true);
    
    // 2. 7-day streak
    await tryUnlock("streak_7", streakCount >= 7, true);

    // 3. First note
    await tryUnlock("first_note", notesCount >= 1, false);

    // 4. Complete a devotional plan
    await tryUnlock("devotional_complete", completedPlansCount >= 1, false);

    // 5. Support 5 prayers
    await tryUnlock("prayer_partner", supportedPrayersCount >= 5, false);

    return newlyUnlocked;
  } catch (error) {
    console.error("Error checking and unlocking badges:", error);
    return [];
  }
}

export async function getCustomDevotionals() {
  try {
    const db = await getDb();
    const res = await db.execute("SELECT id, title, category, days, image, created_at FROM custom_devotionals ORDER BY created_at DESC");
    const plans = res.rows.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      days: JSON.parse(r.days),
      image: r.image || "",
      created_at: r.created_at,
      isCustom: true
    }));
    return { success: true, plans };
  } catch (error) {
    console.error("Error fetching custom devotionals:", error);
    return { error: error.message };
  }
}

export async function getCustomDevotionalById(id) {
  try {
    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT id, title, category, days, image, created_at FROM custom_devotionals WHERE id = ?",
      args: [id]
    });
    const r = res.rows[0];
    if (!r) return { error: "Plan not found." };
    const plan = {
      id: r.id,
      title: r.title,
      category: r.category,
      days: JSON.parse(r.days),
      image: r.image || "",
      created_at: r.created_at,
      isCustom: true
    };
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
      args: [prayerId]
    });
    
    return res.rows.map(r => ({
      id: r.id,
      prayerId: r.prayer_id,
      userId: r.user_id,
      authorName: r.author_name,
      content: r.content,
      date: new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    }));
  } catch (error) {
    console.error("Error fetching prayer encouragements:", error);
    return [];
  }
}

export async function addPrayerEncouragement(prayerId, content) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { error: "Please log in to leave an encouragement." };

    if (!content || !content.trim()) return { error: "Encouragement content cannot be empty." };

    const id = `enc_${Date.now()}`;
    const dateStr = new Date().toISOString();
    const db = await getDb();

    await db.execute({
      sql: `INSERT INTO prayer_encouragements (id, prayer_id, user_id, author_name, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, prayerId, user.user_id, user.name, content.trim(), dateStr]
    });

    // Check badges after encouraging others
    await checkAndUnlockBadges(user.user_id);

    return { success: true };
  } catch (error) {
    console.error("Error adding prayer encouragement:", error);
    return { error: "Could not add encouragement. Please try again." };
  }
}

export async function getLatestAnsweredPrayers() {
  try {
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
    
    return res.rows.map(r => ({
      id: r.id,
      author: r.is_anonymous === 1 ? "Anonymous" : r.author_name,
      title: r.title,
      content: r.content,
      date: new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
      supportCount: r.support_count || 0,
      encouragementCount: r.encouragement_count || 0
    }));
  } catch (error) {
    console.error("Error fetching latest answered prayers:", error);
    return [];
  }
}

export async function getCommunityStats() {
  try {
    const db = await getDb();
    
    // Fetch total active prayers
    const activeRes = await db.execute("SELECT COUNT(*) as count FROM prayers WHERE status = 'active'");
    const activeCount = activeRes.rows[0]?.count || 0;

    // Fetch total support registrations
    const supportRes = await db.execute("SELECT COUNT(*) as count FROM prayer_support");
    const supportCount = supportRes.rows[0]?.count || 0;

    // Fetch total gratitude journal entries
    const journalRes = await db.execute("SELECT COUNT(*) as count FROM gratitude_journal");
    const journalCount = journalRes.rows[0]?.count || 0;

    return {
      activePrayers: activeCount,
      prayerSupport: supportCount,
      journalEntries: journalCount
    };
  } catch (error) {
    console.error("Error fetching community stats:", error);
    return {
      activePrayers: 0,
      prayerSupport: 0,
      journalEntries: 0
    };
  }
}
