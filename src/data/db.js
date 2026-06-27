import { createClient } from "@libsql/client";
import path from "node:path";
import crypto from "node:crypto";
import { posts } from "./posts.js";

const dbUrl = process.env.TURSO_DATABASE_URL || ("file:" + path.join(process.cwd(), "src/data/database.db"));
const dbToken = process.env.TURSO_AUTH_TOKEN || "";

const client = createClient({
  url: dbUrl,
  authToken: dbToken
});

let isInitialized = false;

export async function getDb() {
  if (!isInitialized) {
    try {
      // 1. Create tables
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          streak_count INTEGER DEFAULT 0,
          last_active TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS testimonies (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          author_name TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          tag TEXT DEFAULT 'Gratitude',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          read_time TEXT DEFAULT '2 Min read',
          image TEXT,
          excerpt TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS likes (
          user_id TEXT NOT NULL,
          testimony_id TEXT NOT NULL,
          PRIMARY KEY (user_id, testimony_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(testimony_id) REFERENCES testimonies(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          testimony_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(testimony_id) REFERENCES testimonies(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS plans_progress (
          user_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          completed_days TEXT NOT NULL,
          current_day INTEGER NOT NULL DEFAULT 1,
          is_completed INTEGER NOT NULL DEFAULT 0,
          start_date TEXT NOT NULL,
          PRIMARY KEY (user_id, plan_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS plan_reflections (
          user_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          day_number INTEGER NOT NULL,
          text TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          PRIMARY KEY (user_id, plan_id, day_number),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS saved_plans (
          user_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          PRIMARY KEY (user_id, plan_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS highlights (
          user_id TEXT NOT NULL,
          verse_id TEXT NOT NULL,
          color TEXT NOT NULL,
          PRIMARY KEY (user_id, verse_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await client.execute(`
        CREATE TABLE IF NOT EXISTS notes (
          user_id TEXT NOT NULL,
          verse_id TEXT NOT NULL,
          text TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          PRIMARY KEY (user_id, verse_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // 2. Insert initial static posts if they don't exist
      for (const post of posts) {
        const existing = await client.execute({
          sql: "SELECT id FROM testimonies WHERE id = ?",
          args: [post.id]
        });
        
        if (existing.rows.length === 0) {
          let tag = "Gratitude";
          if (post.id === "post1") tag = "Hope";

          await client.execute({
            sql: `INSERT INTO testimonies (id, user_id, author_name, title, content, tag, created_at, read_time, image, excerpt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              post.id,
              null,
              "Ju & Vicky",
              post.title,
              JSON.stringify(post.content),
              tag,
              post.date,
              post.readTime,
              post.image,
              post.excerpt
            ]
          });
        }
      }

      isInitialized = true;
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }
  return client;
}

// ----------------- SECURITY HELPERS -----------------

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}
