import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { trackEvent } from "@/lib/events";
import { mergeSessionToRecipient } from "@/lib/profiles";

interface GiftSession {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  status: string;
  gift_context: string | null;
  selected_product_id: string | null;
  selected_product_data: string | null;
  card_content: string | null;
  presentation_guide: string | null;
  delivery_preferences: string | null;
  feedback_token: string | null;
  recipient_feedback: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const session = db
    .prepare("SELECT * FROM gift_sessions WHERE id = ?")
    .get(params.id) as GiftSession | undefined;

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Ownership check: if session has a user_id, verify requester matches
  const userId = request.headers.get("x-user-id");
  if (session.user_id && userId && session.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      ...session,
      gift_context: session.gift_context ? JSON.parse(session.gift_context) : null,
      selected_product_data: session.selected_product_data ? JSON.parse(session.selected_product_data) : null,
      card_content: session.card_content ? JSON.parse(session.card_content) : null,
      presentation_guide: session.presentation_guide ? JSON.parse(session.presentation_guide) : null,
      delivery_preferences: session.delivery_preferences ? JSON.parse(session.delivery_preferences) : null,
      recipient_feedback: session.recipient_feedback ? JSON.parse(session.recipient_feedback) : null,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const session = db
    .prepare("SELECT * FROM gift_sessions WHERE id = ?")
    .get(params.id) as GiftSession | undefined;

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Ownership check: if session has a user_id, verify requester matches
  const userId = request.headers.get("x-user-id");
  if (session.user_id && userId && session.user_id !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (body.status !== undefined) {
    fields.push("status = ?");
    values.push(body.status);
    if (body.status === "completed") {
      fields.push("completed_at = datetime('now')");
    }
  }
  if (body.recipient_id !== undefined) {
    fields.push("recipient_id = ?");
    values.push(body.recipient_id);
  }
  if (body.gift_context !== undefined) {
    fields.push("gift_context = ?");
    values.push(JSON.stringify(body.gift_context));
  }
  if (body.selected_product_id !== undefined) {
    fields.push("selected_product_id = ?");
    values.push(body.selected_product_id);
  }
  if (body.selected_product_data !== undefined) {
    fields.push("selected_product_data = ?");
    values.push(JSON.stringify(body.selected_product_data));
  }
  if (body.card_content !== undefined) {
    fields.push("card_content = ?");
    values.push(JSON.stringify(body.card_content));
  }
  if (body.presentation_guide !== undefined) {
    fields.push("presentation_guide = ?");
    values.push(JSON.stringify(body.presentation_guide));
  }
  if (body.delivery_preferences !== undefined) {
    fields.push("delivery_preferences = ?");
    values.push(JSON.stringify(body.delivery_preferences));
  }
  if (body.feedback_token !== undefined) {
    fields.push("feedback_token = ?");
    values.push(body.feedback_token);
    trackEvent(params.id, session.user_id, "delivery.feedback_link_created");
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  fields.push("updated_at = datetime('now')");
  values.push(params.id);

  db.prepare(`UPDATE gift_sessions SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  // On completion, merge learnings back to recipient profile
  if (body.status === "completed" && session.recipient_id) {
    try {
      mergeSessionToRecipient(params.id);
    } catch {
      // Non-critical
    }
    trackEvent(params.id, session.user_id, "session.completed");
  }

  return NextResponse.json({ ok: true });
}
