"use server";

import { getDb } from "@/data/db";
import { getMe } from "./authActions";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

function logAdminAction(message) {
  try {
    const logPath = path.join(process.cwd(), "admin_actions.log");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    console.error("Failed to write to admin log:", err);
  }
}

/**
 * Verifies that the current logged-in user is an admin.
 * Throws an error if not authenticated or not an admin.
 */
async function verifyAdmin() {
  const user = await getMe();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return user;
}


/**
 * Fetch consolidated dashboard metrics, aggregates, and activity streams
 */
export async function getAdminStats() {
  try {
    await verifyAdmin();
    const db = await getDb();

    // 1. Fetch users for calculations
    const usersRes = await db.execute("SELECT id, name, email, streak_count, last_active, created_at, role FROM users");
    const users = usersRes.rows;

    const todayStr = new Date().toDateString();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let activeToday = 0;
    let activeThisWeek = 0;

    users.forEach(u => {
      if (u.last_active === todayStr) {
        activeToday++;
        activeThisWeek++;
      } else if (u.last_active) {
        const lastActiveTime = Date.parse(u.last_active);
        if (!isNaN(lastActiveTime) && lastActiveTime >= oneWeekAgo) {
          activeThisWeek++;
        }
      }
    });

    // 2. Fetch other aggregates
    const testimoniesRes = await db.execute("SELECT COUNT(*) as count FROM testimonies");
    const commentsRes = await db.execute("SELECT COUNT(*) as count FROM comments");
    const prayersRes = await db.execute("SELECT COUNT(*) as count FROM prayers");
    const progressRes = await db.execute("SELECT COUNT(*) as count FROM plans_progress");
    const completedProgressRes = await db.execute("SELECT COUNT(*) as count FROM plans_progress WHERE is_completed = 1");

    const totalTestimonies = testimoniesRes.rows[0]?.count ?? 0;
    const totalComments = commentsRes.rows[0]?.count ?? 0;
    const totalPrayers = prayersRes.rows[0]?.count ?? 0;
    const activePlans = (progressRes.rows[0]?.count ?? 0) - (completedProgressRes.rows[0]?.count ?? 0);
    const completedPlans = completedProgressRes.rows[0]?.count ?? 0;

    // 3. Compile Activity Stream
    // User registrations
    const userActivities = users.map(u => ({
      id: `reg_${u.id}`,
      type: "user_registered",
      user: u.name,
      email: u.email,
      details: "registered a new account",
      timestamp: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
    }));

    // Testimony posts
    const testListRes = await db.execute("SELECT id, author_name, title, created_at FROM testimonies ORDER BY created_at DESC LIMIT 15");
    const testimonyActivities = testListRes.rows.map(t => ({
      id: `test_${t.id}`,
      type: "testimony_created",
      user: t.author_name,
      details: `shared a testimony: "${t.title}"`,
      timestamp: t.created_at && (t.created_at.includes("-") || t.created_at.includes(":")) 
        ? new Date(t.created_at).toISOString() 
        : new Date().toISOString()
    }));

    // Comments
    const commentListRes = await db.execute("SELECT id, author_name, content, created_at FROM comments ORDER BY created_at DESC LIMIT 15");
    const commentActivities = commentListRes.rows.map(c => ({
      id: `comm_${c.id}`,
      type: "comment_added",
      user: c.author_name,
      details: `commented: "${c.content.length > 50 ? c.content.substring(0, 50) + "..." : c.content}"`,
      timestamp: c.created_at && (c.created_at.includes("-") || c.created_at.includes(":")) 
        ? new Date(c.created_at).toISOString() 
        : new Date().toISOString()
    }));

    // Prayers
    const prayerListRes = await db.execute("SELECT id, author_name, title, created_at, is_anonymous FROM prayers ORDER BY created_at DESC LIMIT 15");
    const prayerActivities = prayerListRes.rows.map(p => ({
      id: `pray_${p.id}`,
      type: "prayer_requested",
      user: p.is_anonymous ? "Anonymous" : p.author_name,
      details: `requested prayer: "${p.title}"`,
      timestamp: p.created_at && (p.created_at.includes("-") || p.created_at.includes(":")) 
        ? new Date(p.created_at).toISOString() 
        : new Date().toISOString()
    }));

    // Combined stream, sorted newest first
    const activityStream = [
      ...userActivities,
      ...testimonyActivities,
      ...commentActivities,
      ...prayerActivities
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    return {
      success: true,
      stats: {
        totalUsers: users.length,
        activeToday,
        activeThisWeek,
        totalTestimonies,
        totalComments,
        totalPrayers,
        activePlans,
        completedPlans
      },
      activityStream
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
    const res = await db.execute("SELECT id, name, email, streak_count, last_active, created_at, role FROM users ORDER BY created_at DESC");
    const plainUsers = res.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      streak_count: r.streak_count,
      last_active: r.last_active,
      created_at: r.created_at,
      role: r.role || "user"
    }));
    return { success: true, users: plainUsers };
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
      SELECT t.id, t.title, t.author_name, t.tag, t.created_at, t.excerpt, t.content,
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
      created_at: r.created_at,
      excerpt: r.excerpt,
      content: r.content,
      likes_count: r.likes_count,
      comments_count: r.comments_count
    }));
    return { success: true, testimonies: plainTestimonies };
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
      testimony_title: r.testimony_title
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
    const res = await db.execute("SELECT id, author_name, title, content, is_anonymous, status, created_at FROM prayers ORDER BY created_at DESC");
    const plainPrayers = res.rows.map(r => ({
      id: r.id,
      author_name: r.author_name,
      title: r.title,
      content: r.content,
      is_anonymous: r.is_anonymous,
      status: r.status,
      created_at: r.created_at
    }));
    return { success: true, prayers: plainPrayers };
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
    logAdminAction(`deleteUser: verifyAdmin passed. Admin: ${admin.email}`);
    const db = await getDb();
    const dbRes = await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [userId]
    });
    logAdminAction(`deleteUser execute completed. Rows affected: ${dbRes.rowsAffected}`);
    
    revalidatePath("/admin");
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
    logAdminAction(`toggleUserRole: verifyAdmin passed. Admin: ${admin.email}`);
    const newRole = currentRole === "admin" ? "user" : "admin";
    const db = await getDb();
    const dbRes = await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [newRole, userId]
    });
    logAdminAction(`toggleUserRole execute completed. Rows affected: ${dbRes.rowsAffected}`);

    revalidatePath("/admin");
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
    const dbRes = await db.execute({
      sql: "DELETE FROM testimonies WHERE id = ?",
      args: [testimonyId]
    });
    logAdminAction(`deleteTestimony execute completed. Rows affected: ${dbRes.rowsAffected}`);

    revalidatePath("/feed");
    revalidatePath("/admin");
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
      args: [commentId]
    });
    logAdminAction(`deleteComment execute completed. Rows affected: ${dbRes.rowsAffected}`);

    revalidatePath("/feed");
    revalidatePath("/admin");
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
      args: [prayerId]
    });
    logAdminAction(`deletePrayer execute completed. Rows affected: ${dbRes.rowsAffected}`);

    revalidatePath("/prayers");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logAdminAction(`deletePrayer error: ${error.message}`);
    return { error: error.message };
  }
}

export async function createCustomDevotional(title, category, days) {
  try {
    logAdminAction(`createCustomDevotional requested for title: ${title}`);
    await verifyAdmin();
    const db = await getDb();
    
    // Generate a clean url-friendly ID
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "");
    const id = `custom_${slug}_${Date.now()}`;
    
    await db.execute({
      sql: "INSERT INTO custom_devotionals (id, title, category, days) VALUES (?, ?, ?, ?)",
      args: [id, title.trim(), category, JSON.stringify(days)]
    });
    logAdminAction(`createCustomDevotional complete. New ID: ${id}`);
    
    revalidatePath("/plans");
    revalidatePath("/admin");
    return { success: true, id };
  } catch (error) {
    logAdminAction(`createCustomDevotional error: ${error.message}`);
    return { error: error.message };
  }
}

export async function deleteCustomDevotional(id) {
  try {
    logAdminAction(`deleteCustomDevotional requested for id: ${id}`);
    await verifyAdmin();
    const db = await getDb();
    
    const dbRes = await db.execute({
      sql: "DELETE FROM custom_devotionals WHERE id = ?",
      args: [id]
    });
    logAdminAction(`deleteCustomDevotional complete. Rows affected: ${dbRes.rowsAffected}`);
    
    // Also cascade delete user progress on this custom plan
    await db.execute({
      sql: "DELETE FROM plans_progress WHERE plan_id = ?",
      args: [id]
    });
    await db.execute({
      sql: "DELETE FROM plan_reflections WHERE plan_id = ?",
      args: [id]
    });
    await db.execute({
      sql: "DELETE FROM saved_plans WHERE plan_id = ?",
      args: [id]
    });
    
    revalidatePath("/plans");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logAdminAction(`deleteCustomDevotional error: ${error.message}`);
    return { error: error.message };
  }
}
