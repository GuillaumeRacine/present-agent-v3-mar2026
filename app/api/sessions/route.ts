import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { trackEvent } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, recipientId, recipientName, sessionId: customId } = body;

    const db = getDb();
    const id = customId || randomUUID();

    db.prepare(
      `INSERT INTO gift_sessions (id, user_id, recipient_id, status, gift_context, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`
    ).run(id, userId || null, recipientId || null, JSON.stringify({ recipient: { name: recipientName } }));

    trackEvent(id, userId || null, "session.started", { recipientId, recipientName });

    return NextResponse.json({ sessionId: id }, { status: 201 });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session", detail: process.env.NODE_ENV === "development" ? String(error) : "An internal error occurred" },
      { status: 500 }
    );
  }
}
