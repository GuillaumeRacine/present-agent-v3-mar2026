// ── Recipient Feedback Loop ──────────────────────────────────────────
// After marking a gift as "given", generate a shareable feedback link.
// Recipient submits a reaction, which feeds back into recommendations.

import { getDb } from "./db";
import { randomBytes, randomUUID } from "crypto";
import { updateRecipient, getRecipient } from "./profiles";
import { trackEvent } from "./events";

export interface RecipientFeedback {
  reaction: "loved_it" | "liked_it" | "meh" | "returned";
  whatTheyLiked?: string;
  note?: string;
}

export function createFeedbackToken(sessionId: string): string {
  const db = getDb();
  const token = randomBytes(16).toString("hex");

  db.prepare(
    `UPDATE gift_sessions SET feedback_token = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(token, sessionId);

  trackEvent(sessionId, null, "delivery.feedback_link_created");

  return token;
}

export function validateFeedbackToken(token: string): {
  sessionId: string;
  recipientName: string | null;
  productName: string | null;
  productImage: string | null;
} | null {
  const db = getDb();
  const session = db
    .prepare(
      `SELECT gs.id, gs.gift_context, gs.selected_product_data, gs.recipient_feedback
       FROM gift_sessions gs WHERE gs.feedback_token = ?`
    )
    .get(token) as {
      id: string;
      gift_context: string | null;
      selected_product_data: string | null;
      recipient_feedback: string | null;
    } | undefined;

  if (!session) return null;

  // Already submitted
  if (session.recipient_feedback) return null;

  const context = session.gift_context ? JSON.parse(session.gift_context) : {};
  const product = session.selected_product_data ? JSON.parse(session.selected_product_data) : {};

  return {
    sessionId: session.id,
    recipientName: context?.recipient?.name || null,
    productName: product?.name || null,
    productImage: product?.imageUrl || null,
  };
}

export function submitFeedback(token: string, feedback: RecipientFeedback): boolean {
  const db = getDb();

  const session = db
    .prepare(
      `SELECT id, user_id, recipient_id, selected_product_id, selected_product_data, gift_context
       FROM gift_sessions WHERE feedback_token = ? AND recipient_feedback IS NULL`
    )
    .get(token) as {
      id: string;
      user_id: string | null;
      recipient_id: string | null;
      selected_product_id: string | null;
      selected_product_data: string | null;
      gift_context: string | null;
    } | undefined;

  if (!session) return false;

  const context = session.gift_context ? JSON.parse(session.gift_context) : {};
  const product = session.selected_product_data ? JSON.parse(session.selected_product_data) : {};

  // 1. Save feedback on session
  db.prepare(
    `UPDATE gift_sessions SET
      recipient_feedback = ?,
      status = 'delivered',
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(JSON.stringify({ ...feedback, received_at: new Date().toISOString() }), session.id);

  // 2. Create/update gift_history
  if (session.user_id && session.recipient_id) {
    const historyId = randomUUID();
    db.prepare(
      `INSERT INTO gift_history (
        id, session_id, user_id, recipient_id, product_id, product_name,
        product_category, price, occasion, recipient_reaction,
        recipient_feedback_note, gifted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      historyId,
      session.id,
      session.user_id,
      session.recipient_id,
      session.selected_product_id,
      product.name || null,
      product.category || null,
      product.price || null,
      context?.occasion?.type || null,
      feedback.reaction,
      feedback.note || null
    );
  }

  // 3. Update recipient profile from feedback
  if (session.recipient_id) {
    try {
      const recipient = getRecipient(session.recipient_id);
      if (recipient) {
        // If they loved it, reinforce the category as an interest
        if (feedback.reaction === "loved_it" && product.category) {
          const interests: string[] = recipient.interests ? JSON.parse(recipient.interests) : [];
          if (!interests.includes(product.category)) {
            interests.push(product.category);
            updateRecipient(session.recipient_id, { interests });
          }
        }
        // If meh or returned, add category to avoids
        if ((feedback.reaction === "meh" || feedback.reaction === "returned") && product.category) {
          const avoids: string[] = recipient.avoids ? JSON.parse(recipient.avoids) : [];
          if (!avoids.includes(product.category)) {
            avoids.push(product.category);
            updateRecipient(session.recipient_id, { avoids });
          }
        }
      }
    } catch {
      // Non-critical
    }
  }

  trackEvent(session.id, session.user_id, "delivery.feedback_received", {
    reaction: feedback.reaction,
  });

  return true;
}
