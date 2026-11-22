import { posts } from "./posts.js";

let isInitialized = false;

const REQUIRED_TABLES = [
  "users",
  "sessions",
  "testimonies",
  "likes",
  "comments",
  "plans_progress",
  "plan_reflections",
  "saved_plans",
  "highlights",
  "notes",
  "gratitude_journal",
  "prayers",
  "prayer_support",
  "user_badges",
  "custom_devotionals",
  "prayer_encouragements",
  "push_subscriptions",
  "notification_preferences",
];

const REQUIRED_INDEXES = [
  "idx_sessions_expires",
  "idx_sessions_user",
  "idx_testimonies_created",
  "idx_comments_testimony",
  "idx_prayers_created",
  "idx_users_email",
  "idx_users_last_active",
  "idx_likes_testimony",
  "idx_plans_progress_user",
  "idx_push_subs_user",
  "idx_prayer_support_prayer",
  "idx_prayer_encouragements_prayer",
  "idx_prayers_status_created",
  "idx_gratitude_journal_user",
  "idx_plan_reflections_user",
];

const TABLE_DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    streak_count INTEGER DEFAULT 0,
    last_active TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    streak_freezes_count INTEGER DEFAULT 1,
    role TEXT DEFAULT 'user'
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS testimonies (
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
  )`,
  `CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL,
    testimony_id TEXT NOT NULL,
    PRIMARY KEY (user_id, testimony_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(testimony_id) REFERENCES testimonies(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    testimony_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(testimony_id) REFERENCES testimonies(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS plans_progress (
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    completed_days TEXT NOT NULL,
    current_day INTEGER NOT NULL DEFAULT 1,
    is_completed INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL,
    last_completed_date TEXT,
    PRIMARY KEY (user_id, plan_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS plan_reflections (
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    PRIMARY KEY (user_id, plan_id, day_number),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS saved_plans (
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    PRIMARY KEY (user_id, plan_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS highlights (
    user_id TEXT NOT NULL,
    verse_id TEXT NOT NULL,
    color TEXT NOT NULL,
    PRIMARY KEY (user_id, verse_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    user_id TEXT NOT NULL,
    verse_id TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    PRIMARY KEY (user_id, verse_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS gratitude_journal (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    entry_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS prayers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prayer_support (
    user_id TEXT NOT NULL,
    prayer_id TEXT NOT NULL,
    PRIMARY KEY (user_id, prayer_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(prayer_id) REFERENCES prayers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at TEXT NOT NULL,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS custom_devotionals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    days TEXT NOT NULL,
    image TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS prayer_encouragements (
    id TEXT PRIMARY KEY,
    prayer_id TEXT NOT NULL,
    user_id TEXT,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(prayer_id) REFERENCES prayers(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS notification_preferences (
    endpoint TEXT PRIMARY KEY,
    verse_of_day INTEGER DEFAULT 1,
    devotional_reminder INTEGER DEFAULT 1,
    gratitude_journal INTEGER DEFAULT 1,
    scripture_quiz INTEGER DEFAULT 1
  )`,
];

const INDEX_DDL = [
  "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_testimonies_created ON testimonies(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_comments_testimony ON comments(testimony_id, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_prayers_created ON prayers(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
  "CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active)",
  "CREATE INDEX IF NOT EXISTS idx_likes_testimony ON likes(testimony_id)",
  "CREATE INDEX IF NOT EXISTS idx_plans_progress_user ON plans_progress(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_prayer_support_prayer ON prayer_support(prayer_id)",
  "CREATE INDEX IF NOT EXISTS idx_prayer_encouragements_prayer ON prayer_encouragements(prayer_id, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_prayers_status_created ON prayers(status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_gratitude_journal_user ON gratitude_journal(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_plan_reflections_user ON plan_reflections(user_id)",
];

function hasAllSchema(objectsMap) {
  for (const table of REQUIRED_TABLES) {
    if (!objectsMap.has(table)) return false;
  }
  for (const idx of REQUIRED_INDEXES) {
    if (!objectsMap.has(idx)) return false;
  }
  const usersSql = objectsMap.get("users") || "";
  if (!usersSql.includes("streak_freezes_count") || !usersSql.includes("role")) return false;

  const progressSql = objectsMap.get("plans_progress") || "";
  if (!progressSql.includes("last_completed_date")) return false;

  const customSql = objectsMap.get("custom_devotionals") || "";
  if (!customSql.includes("image")) return false;

  const encSql = objectsMap.get("prayer_encouragements") || "";
  if (/user_id\s+TEXT\s+NOT\s+NULL/i.test(encSql)) return false;

  return true;
}

export async function initializeDb(client) {
  if (isInitialized) return;

  try {
    // Fast-path check: verify schema & seed posts in 1 single read batch
    const postIds = posts.map((p) => p.id);
    const placeholders = postIds.map(() => "?").join(", ");
    let objectsMap = new Map();

    try {
      const [schemaRes, seededRes] = await client.batch(
        [
          "SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index')",
          {
            sql: `SELECT id FROM testimonies WHERE id IN (${placeholders})`,
            args: postIds,
          },
        ],
        "read"
      );
      objectsMap = new Map(schemaRes.rows.map((r) => [r.name, r.sql || ""]));
      if (hasAllSchema(objectsMap) && seededRes.rows.length === postIds.length) {
        isInitialized = true;
        return;
      }
    } catch {
      // Fresh/incomplete database (e.g., testimonies table does not exist yet)
      try {
        const schemaRes = await client.execute(
          "SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index')"
        );
        objectsMap = new Map(schemaRes.rows.map((r) => [r.name, r.sql || ""]));
      } catch {
        objectsMap = new Map();
      }
    }

    // 1. Create any missing tables in one batch
    await client.batch(TABLE_DDL, "write");

    // 2. Apply incremental column migrations if needed on older DBs
    const alterStatements = [
      { table: "plans_progress", col: "last_completed_date", sql: "ALTER TABLE plans_progress ADD COLUMN last_completed_date TEXT" },
      { table: "users", col: "streak_freezes_count", sql: "ALTER TABLE users ADD COLUMN streak_freezes_count INTEGER DEFAULT 1" },
      { table: "users", col: "role", sql: "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'" },
      { table: "custom_devotionals", col: "image", sql: "ALTER TABLE custom_devotionals ADD COLUMN image TEXT" },
    ];

    for (const alt of alterStatements) {
      const existingSql = objectsMap.get(alt.table) || "";
      if (existingSql && !existingSql.includes(alt.col)) {
        try {
          await client.execute(alt.sql);
        } catch {
          // Column already exists
        }
      }
    }

    // Migrate prayer_encouragements if previously created with user_id TEXT NOT NULL
    const encSql = objectsMap.get("prayer_encouragements") || "";
    if (/user_id\s+TEXT\s+NOT\s+NULL/i.test(encSql)) {
      await client.batch(
        [
          `CREATE TABLE IF NOT EXISTS prayer_encouragements_new (
            id TEXT PRIMARY KEY,
            prayer_id TEXT NOT NULL,
            user_id TEXT,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(prayer_id) REFERENCES prayers(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
          )`,
          "INSERT INTO prayer_encouragements_new SELECT id, prayer_id, user_id, author_name, content, created_at FROM prayer_encouragements",
          "DROP TABLE prayer_encouragements",
          "ALTER TABLE prayer_encouragements_new RENAME TO prayer_encouragements",
        ],
        "write"
      );
    }

    // 3. Insert initial static posts if they don't exist
    const postInserts = posts.map((post) => ({
      sql: `INSERT OR IGNORE INTO testimonies (id, user_id, author_name, title, content, tag, created_at, read_time, image, excerpt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        post.id,
        null,
        "Ju & Vicky",
        post.title,
        JSON.stringify(post.content),
        post.id === "post1" ? "Hope" : "Gratitude",
        post.date,
        post.readTime,
        post.image,
        post.excerpt,
      ],
    }));

    // 4. Create indexes + seed posts in one batch
    await client.batch([...postInserts, ...INDEX_DDL], "write");

    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}
