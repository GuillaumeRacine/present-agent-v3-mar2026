// ── User Authentication ─────────────────────────────────────────────
// Maps Google OAuth profiles to local user records.

import { getDb } from "./db";
import { randomUUID } from "crypto";

export interface User {
  id: string;
  google_id: string | null;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  preferences: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleProfile {
  sub: string;       // Google's unique user ID
  email?: string;
  name?: string;
  picture?: string;
}

export function getUserFromGoogleId(googleId: string): User | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .get(googleId) as User | null;
}

export function getUserById(userId: string): User | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as User | null;
}

export function createUser(profile: GoogleProfile): User {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, google_id, email, name, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(id, profile.sub, profile.email || null, profile.name || null, profile.picture || null);

  return getUserById(id)!;
}

export function getOrCreateUser(profile: GoogleProfile): User {
  const existing = getUserFromGoogleId(profile.sub);
  if (existing) {
    // Update name/email/avatar if changed
    const db = getDb();
    db.prepare(
      `UPDATE users SET
        email = COALESCE(?, email),
        name = COALESCE(?, name),
        avatar_url = COALESCE(?, avatar_url),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(profile.email || null, profile.name || null, profile.picture || null, existing.id);
    return getUserById(existing.id)!;
  }
  return createUser(profile);
}

export function updateUserPreferences(userId: string, preferences: Record<string, unknown>): void {
  const db = getDb();
  db.prepare(
    `UPDATE users SET preferences = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(JSON.stringify(preferences), userId);
}
