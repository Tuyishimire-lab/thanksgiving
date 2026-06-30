"use server";

import { getDb, hashPassword, verifyPassword } from "@/data/db";
import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Helper to update user streak internally (asynchronous)
 */
async function updateStreakInternal(userId) {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT streak_count, last_active, streak_freezes_count FROM users WHERE id = ?",
    args: [userId]
  });
  const user = res.rows[0];
  if (!user) return null;

  const todayStr = new Date().toDateString(); // E.g., "Fri Jun 26 2026"
  
  if (user.last_active === todayStr) {
    return {
      streak_count: user.streak_count,
      last_active: user.last_active,
      streak_freezes_count: user.streak_freezes_count ?? 1
    };
  }

  let newCount = 1;
  let freezeUsed = false;
  let newFreezesCount = user.streak_freezes_count !== undefined && user.streak_freezes_count !== null ? user.streak_freezes_count : 1;

  if (user.last_active) {
    const lastDate = new Date(user.last_active);
    const todayDate = new Date(todayStr);
    
    // Calculate difference in days
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newCount = (user.streak_count || 0) + 1;
    } else if (diffDays > 1 && newFreezesCount > 0) {
      // Consume a streak freeze!
      newFreezesCount = Math.max(0, newFreezesCount - 1);
      newCount = (user.streak_count || 0) + 1; // Preserve the streak chain
      freezeUsed = true;
    }
  }

  await db.execute({
    sql: "UPDATE users SET streak_count = ?, last_active = ?, streak_freezes_count = ? WHERE id = ?",
    args: [newCount, todayStr, newFreezesCount, userId]
  });
  return {
    streak_count: newCount,
    last_active: todayStr,
    streak_freezes_count: newFreezesCount,
    freeze_used: freezeUsed
  };
}

/**
 * Get currently authenticated user details
 */
export async function getMe() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;

    const now = new Date().toISOString();
    const db = await getDb();
    const res = await db.execute({
      sql: `SELECT s.user_id, u.name, u.email, u.streak_count, u.last_active, u.streak_freezes_count 
            FROM sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ? AND s.expires_at > ?`,
      args: [token, now]
    });
    const session = res.rows[0];

    if (!session) return null;

    return {
      id: session.user_id,
      name: session.name,
      email: session.email,
      streak_count: session.streak_count,
      last_active: session.last_active,
      streak_freezes_count: session.streak_freezes_count ?? 1
    };
  } catch (error) {
    console.error("Error in getMe server action:", error);
    return null;
  }
}

/**
 * Sign up a new user
 */
export async function signup(name, email, password) {
  try {
    if (!name || !email || !password) {
      return { error: "Please fill in all fields." };
    }
    
    if (password.length < 6) {
      return { error: "Password must be at least 6 characters long." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();
    
    // Check if email already exists
    const existingRes = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [normalizedEmail]
    });
    if (existingRes.rows[0]) {
      return { error: "An account with this email already exists." };
    }

    // Insert new user
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const todayStr = new Date().toDateString();

    await db.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, streak_count, last_active, streak_freezes_count)
            VALUES (?, ?, ?, ?, 1, ?, 1)`,
      args: [userId, name.trim(), normalizedEmail, passwordHash, todayStr]
    });

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await db.execute({
      sql: `INSERT INTO sessions (id, user_id, expires_at)
            VALUES (?, ?, ?)`,
      args: [sessionToken, userId, expiresAt.toISOString()]
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "lax",
      path: "/"
    });

    return {
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        streak_count: 1,
        streak_freezes_count: 1
      }
    };
  } catch (error) {
    console.error("Signup error:", error);
    return { error: "Something went wrong during registration. Please try again." };
  }
}

/**
 * Log in a user
 */
export async function login(email, password) {
  try {
    if (!email || !password) {
      return { error: "Please enter your email and password." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();

    // Find user
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [normalizedEmail]
    });
    const user = userRes.rows[0];
    if (!user) {
      return { error: "Invalid email or password." };
    }

    // Verify password
    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.execute({
      sql: `INSERT INTO sessions (id, user_id, expires_at)
            VALUES (?, ?, ?)`,
      args: [sessionToken, user.id, expiresAt.toISOString()]
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "lax",
      path: "/"
    });

    // Update daily streak on login
    const updated = await updateStreakInternal(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        streak_count: updated ? updated.streak_count : user.streak_count
      }
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Something went wrong during login. Please try again." };
  }
}

/**
 * Log out a user
 */
export async function logout() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (token) {
      const db = await getDb();
      await db.execute({
        sql: "DELETE FROM sessions WHERE id = ?",
        args: [token]
      });
    }

    cookieStore.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/"
    });

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "Could not log out. Please try again." };
  }
}

/**
 * Server Action to check and update daily streak
 */
export async function updateStreakAction() {
  try {
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

    if (!session) return null;

    const updated = await updateStreakInternal(session.user_id);
    return updated;
  } catch (error) {
    console.error("Error updating streak:", error);
    return null;
  }
}
