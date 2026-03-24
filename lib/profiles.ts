// ── Recipient Profile Management ────────────────────────────────────
// CRUD for recipient profiles + learning from gift sessions.

import { getDb } from "./db";
import { randomUUID } from "crypto";
import type { GiftContext } from "./recommend";

export interface Recipient {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  closeness: string | null;
  interests: string | null;        // JSON array
  personality: string | null;       // JSON object
  wishes: string | null;           // JSON array
  avoids: string | null;           // JSON array
  shared_memories: string | null;  // JSON array
  inside_jokes: string | null;     // JSON array
  google_contact_id: string | null;
  birthday: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipientInput {
  name: string;
  relationship?: string;
  closeness?: string;
  interests?: string[];
  personality?: Record<string, unknown>;
  wishes?: string[];
  avoids?: string[];
  shared_memories?: { memory: string; date?: string; weight?: number }[];
  inside_jokes?: string[];
  google_contact_id?: string;
  birthday?: string;
  notes?: string;
}

export interface GiftHistoryEntry {
  id: string;
  product_id: string | null;
  product_name: string | null;
  product_category: string | null;
  price: number | null;
  occasion: string | null;
  giver_satisfaction: string | null;
  recipient_reaction: string | null;
  gifted_at: string;
}

// ── CRUD ─────────────────────────────────────────────────────────────

export function createRecipient(userId: string, data: RecipientInput): Recipient {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO recipients (
      id, user_id, name, relationship, closeness,
      interests, personality, wishes, avoids,
      shared_memories, inside_jokes, google_contact_id, birthday, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(
    id, userId, data.name,
    data.relationship || null,
    data.closeness || null,
    data.interests ? JSON.stringify(data.interests) : null,
    data.personality ? JSON.stringify(data.personality) : null,
    data.wishes ? JSON.stringify(data.wishes) : null,
    data.avoids ? JSON.stringify(data.avoids) : null,
    data.shared_memories ? JSON.stringify(data.shared_memories) : null,
    data.inside_jokes ? JSON.stringify(data.inside_jokes) : null,
    data.google_contact_id || null,
    data.birthday || null,
    data.notes || null
  );
  return getRecipient(id)!;
}

export function getRecipient(id: string): Recipient | null {
  const db = getDb();
  return db.prepare("SELECT * FROM recipients WHERE id = ?").get(id) as Recipient | null;
}

export function getUserRecipients(userId: string): Recipient[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM recipients WHERE user_id = ? ORDER BY updated_at DESC")
    .all(userId) as Recipient[];
}

export function updateRecipient(id: string, data: Partial<RecipientInput>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.relationship !== undefined) { fields.push("relationship = ?"); values.push(data.relationship || null); }
  if (data.closeness !== undefined) { fields.push("closeness = ?"); values.push(data.closeness || null); }
  if (data.interests !== undefined) { fields.push("interests = ?"); values.push(JSON.stringify(data.interests)); }
  if (data.personality !== undefined) { fields.push("personality = ?"); values.push(JSON.stringify(data.personality)); }
  if (data.wishes !== undefined) { fields.push("wishes = ?"); values.push(JSON.stringify(data.wishes)); }
  if (data.avoids !== undefined) { fields.push("avoids = ?"); values.push(JSON.stringify(data.avoids)); }
  if (data.shared_memories !== undefined) { fields.push("shared_memories = ?"); values.push(JSON.stringify(data.shared_memories)); }
  if (data.inside_jokes !== undefined) { fields.push("inside_jokes = ?"); values.push(JSON.stringify(data.inside_jokes)); }
  if (data.google_contact_id !== undefined) { fields.push("google_contact_id = ?"); values.push(data.google_contact_id || null); }
  if (data.birthday !== undefined) { fields.push("birthday = ?"); values.push(data.birthday || null); }
  if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes || null); }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE recipients SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

// ── History ──────────────────────────────────────────────────────────

export function getRecipientHistory(recipientId: string): GiftHistoryEntry[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, product_id, product_name, product_category, price, occasion,
              giver_satisfaction, recipient_reaction, gifted_at
       FROM gift_history WHERE recipient_id = ?
       ORDER BY gifted_at DESC`
    )
    .all(recipientId) as GiftHistoryEntry[];
}

// ── Profile Brief (for prompt injection) ─────────────────────────────

function safeParseJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

export function buildRecipientBrief(recipientId: string): string | null {
  const recipient = getRecipient(recipientId);
  if (!recipient) return null;

  const history = getRecipientHistory(recipientId);
  const interests = safeParseJson<string[]>(recipient.interests, []);
  const avoids = safeParseJson<string[]>(recipient.avoids, []);
  const memories = safeParseJson<{ memory: string }[]>(recipient.shared_memories, []);
  const jokes = safeParseJson<string[]>(recipient.inside_jokes, []);

  const parts: string[] = [];
  parts.push(`## What we already know about ${recipient.name}`);

  if (recipient.relationship) {
    parts.push(`- Relationship: ${recipient.relationship}${recipient.closeness ? ` (${recipient.closeness})` : ""}`);
  }
  if (interests.length > 0) {
    parts.push(`- Interests: ${interests.join(", ")}`);
  }
  if (avoids.length > 0) {
    parts.push(`- Avoids: ${avoids.join(", ")}`);
  }

  // Past gifts
  const worked = history.filter(h => h.recipient_reaction === "loved_it" || h.recipient_reaction === "liked_it");
  const didnt = history.filter(h => h.recipient_reaction === "meh" || h.recipient_reaction === "returned");

  if (worked.length > 0) {
    parts.push(`- Past gifts that worked: [${worked.map(h => `${h.product_name} — ${h.recipient_reaction}`).join(", ")}]`);
  }
  if (didnt.length > 0) {
    parts.push(`- Past gifts that didn't work: [${didnt.map(h => `${h.product_name} — ${h.recipient_reaction}`).join(", ")}]`);
  }

  if (memories.length > 0) {
    parts.push(`- Shared memories: ${memories.map(m => m.memory).join("; ")}`);
  }
  if (jokes.length > 0) {
    parts.push(`- Inside jokes: ${jokes.join("; ")}`);
  }

  // Budget history
  const prices = history.filter(h => h.price).map(h => h.price!);
  if (prices.length > 0) {
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    parts.push(`- Budget history: avg $${avg} for this person`);
  }

  if (recipient.birthday) {
    parts.push(`- Birthday: ${recipient.birthday}`);
  }

  parts.push("");
  parts.push("DO NOT re-ask what you already know. Reference it naturally.");
  if (worked.length > 0) {
    parts.push(`Example: "Since ${recipient.name} loved that ${worked[0].product_name || "last gift"}, I'm thinking along those lines again..."`);
  }

  return parts.join("\n");
}

// ── Learning: merge session context back into profile ─────────────────

export function mergeSessionToRecipient(sessionId: string): void {
  const db = getDb();
  const session = db
    .prepare("SELECT * FROM gift_sessions WHERE id = ?")
    .get(sessionId) as { recipient_id: string; gift_context: string } | undefined;

  if (!session?.recipient_id || !session.gift_context) return;

  const ctx: GiftContext = JSON.parse(session.gift_context);
  const recipient = getRecipient(session.recipient_id);
  if (!recipient || !ctx.recipient) return;

  // Merge interests
  const existingInterests = safeParseJson<string[]>(recipient.interests, []);
  const newInterests = ctx.recipient.interests || [];
  const mergedInterests = Array.from(new Set([...existingInterests, ...newInterests]));

  // Merge avoids
  const existingAvoids = safeParseJson<string[]>(recipient.avoids, []);
  const newAvoids = ctx.recipient.avoids || [];
  const mergedAvoids = Array.from(new Set([...existingAvoids, ...newAvoids]));

  // Merge wishes
  const existingWishes = safeParseJson<string[]>(recipient.wishes, []);
  const newWishes = ctx.recipient.wishes || [];
  const mergedWishes = Array.from(new Set([...existingWishes, ...newWishes]));

  updateRecipient(session.recipient_id, {
    interests: mergedInterests,
    avoids: mergedAvoids,
    wishes: mergedWishes,
    relationship: ctx.recipient.relationship || recipient.relationship || undefined,
    closeness: ctx.recipient.closeness || recipient.closeness || undefined,
  });
}

// ── Find or create recipient by name for a user ──────────────────────

export function findRecipientByName(userId: string, name: string): Recipient | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM recipients WHERE user_id = ? AND LOWER(name) = LOWER(?)")
    .get(userId, name) as Recipient | null;
}

export function getOrCreateRecipient(userId: string, name: string): Recipient {
  const existing = findRecipientByName(userId, name);
  if (existing) return existing;
  return createRecipient(userId, { name });
}
