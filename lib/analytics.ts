// ── Analytics Aggregation ────────────────────────────────────────────
// Computed metrics from the events + gift_sessions + gift_history tables.

import { getDb } from "./db";

export function getSessionFunnel(startDate?: string, endDate?: string) {
  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];

  if (startDate) { conditions.push("created_at >= ?"); params.push(startDate); }
  if (endDate) { conditions.push("created_at <= ?"); params.push(endDate); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where}`).get(...params) as { c: number }).c;
  const completed = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} status IN ('completed','ordered','delivered')`).get(...params) as { c: number }).c;
  const ordered = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} status IN ('ordered','delivered')`).get(...params) as { c: number }).c;
  const delivered = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} status = 'delivered'`).get(...params) as { c: number }).c;
  const feedbackReceived = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} recipient_feedback IS NOT NULL`).get(...params) as { c: number }).c;

  return { started: total, completed, ordered, delivered, feedbackReceived };
}

export function getConversationMetrics() {
  const db = getDb();

  const turns = db.prepare(
    `SELECT session_id, COUNT(*) as turns
     FROM events WHERE event_type = 'chat.message_sent'
     GROUP BY session_id`
  ).all() as { session_id: string; turns: number }[];

  const avgTurns = turns.length > 0
    ? Math.round(turns.reduce((sum, t) => sum + t.turns, 0) / turns.length * 10) / 10
    : 0;

  const voiceInputs = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_type = 'chat.voice_input'`
  ).get() as { c: number }).c;

  const totalMessages = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_type = 'chat.message_sent'`
  ).get() as { c: number }).c;

  const voiceAdoptionRate = totalMessages > 0 ? voiceInputs / totalMessages : 0;

  return { avgTurns, voiceAdoptionRate, totalSessions: turns.length };
}

export function getRecommendationAccuracy() {
  const db = getDb();

  const displayed = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_type = 'recs.displayed'`
  ).get() as { c: number }).c;

  const selected = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_type = 'recs.product_selected'`
  ).get() as { c: number }).c;

  const refinements = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_type = 'recs.refinement'`
  ).get() as { c: number }).c;

  return {
    selectionRate: displayed > 0 ? selected / displayed : 0,
    refinementRate: displayed > 0 ? refinements / displayed : 0,
    displayed,
    selected,
  };
}

export function getRecipientSatisfaction() {
  const db = getDb();
  const rows = db.prepare(
    `SELECT recipient_reaction, COUNT(*) as c FROM gift_history
     WHERE recipient_reaction IS NOT NULL
     GROUP BY recipient_reaction`
  ).all() as { recipient_reaction: string; c: number }[];

  const total = rows.reduce((sum, r) => sum + r.c, 0);
  const byReaction: Record<string, number> = {};
  for (const row of rows) {
    byReaction[row.recipient_reaction] = total > 0 ? row.c / total : 0;
  }

  return {
    total,
    lovedIt: byReaction["loved_it"] || 0,
    likedIt: byReaction["liked_it"] || 0,
    meh: byReaction["meh"] || 0,
    returned: byReaction["returned"] || 0,
  };
}

export function getTimeToGift() {
  const db = getDb();
  const sessions = db.prepare(
    `SELECT created_at, completed_at FROM gift_sessions
     WHERE completed_at IS NOT NULL`
  ).all() as { created_at: string; completed_at: string }[];

  if (sessions.length === 0) return { avgMs: 0, p50Ms: 0, p95Ms: 0, count: 0 };

  const durations = sessions.map(s => {
    return new Date(s.completed_at).getTime() - new Date(s.created_at).getTime();
  }).sort((a, b) => a - b);

  const avgMs = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  const p50Ms = durations[Math.floor(durations.length * 0.5)];
  const p95Ms = durations[Math.floor(durations.length * 0.95)];

  return { avgMs, p50Ms, p95Ms, count: durations.length };
}
