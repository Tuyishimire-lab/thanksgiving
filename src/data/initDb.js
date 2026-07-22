import { posts } from "./posts.js";

let isInitialized = false;

export async function initializeDb(client) {
  if (isInitialized) return;

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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'user'
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
        last_completed_date TEXT,
        PRIMARY KEY (user_id, plan_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await client.execute(`
        ALTER TABLE plans_progress ADD COLUMN last_completed_date TEXT
      `);
    } catch (err) {
      // Column already exists or table doesn't exist yet
    }

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

    await client.execute(`
      CREATE TABLE IF NOT EXISTS gratitude_journal (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        entry_text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS prayers (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        author_name TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS prayer_support (
        user_id TEXT NOT NULL,
        prayer_id TEXT NOT NULL,
        PRIMARY KEY (user_id, prayer_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(prayer_id) REFERENCES prayers(id) ON DELETE CASCADE
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_badges (
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        unlocked_at TEXT NOT NULL,
        PRIMARY KEY (user_id, badge_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS custom_devotionals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        days TEXT NOT NULL,
        image TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS prayer_encouragements (
        id TEXT PRIMARY KEY,
        prayer_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(prayer_id) REFERENCES prayers(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await client.execute(`
        ALTER TABLE users ADD COLUMN streak_freezes_count INTEGER DEFAULT 1
      `);
    } catch (err) {
      // Column already exists or table doesn't exist yet
    }

    try {
      await client.execute(`
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'
      `);
    } catch (err) {
      // Column already exists or table doesn't exist yet
    }

    try {
      await client.execute(`
        ALTER TABLE custom_devotionals ADD COLUMN image TEXT
      `);
    } catch (err) {
      // Column already exists or table doesn't exist yet
    }

    // Push notification subscriptions (stores Web Push endpoint + keys)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Per-user notification preferences (which types they opted into)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        endpoint TEXT PRIMARY KEY,
        verse_of_day INTEGER DEFAULT 1,
        devotional_reminder INTEGER DEFAULT 1,
        gratitude_journal INTEGER DEFAULT 1,
        scripture_quiz INTEGER DEFAULT 1
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
    throw error;
  }
}
