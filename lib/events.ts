// ── Event Tracking ──────────────────────────────────────────────────
// Thin wrapper for the events table. Fire-and-forget instrumentation.

import { getDb } from "./db";

export type EventType =
  // Session lifecycle
  | "session.started"
  | "session.abandoned"
  | "session.completed"
  | "session.ordered"
  | "session.delivered"
  // Conversation
  | "chat.message_sent"
  | "chat.response_received"
  | "chat.suggested_reply_used"
  | "chat.voice_input"
  // Recommendations
  | "recs.requested"
  | "recs.displayed"
  | "recs.card_reaction"
  | "recs.product_selected"
  | "recs.refinement"
  // Cards
  | "card.generated"
  | "card.edited"
  | "card.approved"
  // Presentation
  | "presentation.viewed"
  | "presentation.pairing_clicked"
  // Delivery
  | "delivery.marked_given"
  | "delivery.feedback_link_created"
  | "delivery.feedback_received"
  // Voice
  | "voice.enabled"
  | "voice.disabled"
  | "voice.narration_played"
  | "voice.narration_stopped";

export function trackEvent(
  sessionId: string | null,
  userId: string | null,
  eventType: EventType,
  eventData?: Record<string, unknown>
): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO events (session_id, user_id, event_type, event_data, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(
      sessionId,
      userId,
      eventType,
      eventData ? JSON.stringify(eventData) : null
    );
  } catch {
    // Fire and forget — never break the app for instrumentation
  }
}

export function getSessionEvents(sessionId: string): {
  id: number;
  event_type: string;
  event_data: string | null;
  created_at: string;
}[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, event_type, event_data, created_at
       FROM events WHERE session_id = ?
       ORDER BY created_at ASC`
    )
    .all(sessionId) as { id: number; event_type: string; event_data: string | null; created_at: string }[];
}

export function getEventsByType(
  eventType: string,
  startDate?: string,
  endDate?: string
): {
  id: number;
  session_id: string | null;
  user_id: string | null;
  event_data: string | null;
  created_at: string;
}[] {
  const db = getDb();
  const conditions = ["event_type = ?"];
  const params: string[] = [eventType];

  if (startDate) {
    conditions.push("created_at >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("created_at <= ?");
    params.push(endDate);
  }

  return db
    .prepare(
      `SELECT id, session_id, user_id, event_data, created_at
       FROM events WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`
    )
    .all(...params) as { id: number; session_id: string | null; user_id: string | null; event_data: string | null; created_at: string }[];
}
