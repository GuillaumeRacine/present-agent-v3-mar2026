import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const session = db.prepare("SELECT * FROM gift_sessions WHERE id = ?").get(params.id) as Record<string, string | null> | undefined;

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      gift_context: session.gift_context ? JSON.parse(session.gift_context) : null,
      selected_product_data: session.selected_product_data ? JSON.parse(session.selected_product_data) : null,
      card_content: session.card_content ? JSON.parse(session.card_content) : null,
      created_at: session.created_at,
      completed_at: session.completed_at,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const session = db.prepare("SELECT * FROM gift_sessions WHERE id = ?").get(params.id) as Record<string, string | null> | undefined;
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (body.status) { updates.push("status = ?"); values.push(body.status); }
  if (body.selected_product_id) { updates.push("selected_product_id = ?"); values.push(body.selected_product_id); }
  if (body.selected_product_data) { updates.push("selected_product_data = ?"); values.push(JSON.stringify(body.selected_product_data)); }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  values.push(params.id);

  db.prepare(`UPDATE gift_sessions SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
