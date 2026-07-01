import { createClient } from "@libsql/client";
import path from "node:path";
import crypto from "node:crypto";
import { initializeDb } from "./initDb.js";

const dbUrl = process.env.TURSO_DATABASE_URL || ("file:" + path.join(process.cwd(), "src/data/database.db"));
const dbToken = process.env.TURSO_AUTH_TOKEN || "";

const client = createClient({
  url: dbUrl,
  authToken: dbToken
});

let initPromise = null;

export async function getDb() {
  if (!initPromise) {
    initPromise = initializeDb(client);
  }
  await initPromise;
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
