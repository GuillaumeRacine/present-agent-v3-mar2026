import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const db = getDb();
    const sid = params.sessionId;

    // Conversation messages may be stored under a different session ID than gift_sessions.
    // Try exact match first, then search conversation_messages for any session containing this ID.
    let messages = db
      .prepare(
        `SELECT role, content, turn_number, phase, readiness, extracted_context, created_at
         FROM conversation_messages
         WHERE session_id = ?
         ORDER BY turn_number, created_at`
      )
      .all(sid) as Record<string, unknown>[];

    // If no messages found by exact ID, try LIKE match (client IDs contain timestamps)
    if (messages.length === 0) {
      messages = db
        .prepare(
          `SELECT role, content, turn_number, phase, readiness, extracted_context, created_at
           FROM conversation_messages
           WHERE session_id LIKE ?
           ORDER BY turn_number, created_at`
        )
        .all(`%${sid}%`) as Record<string, unknown>[];
    }

    // Get session data from gift_sessions
    const session = db
      .prepare("SELECT * FROM gift_sessions WHERE id = ?")
      .get(sid);

    // Get recommendation log — try exact match then LIKE
    let recLog = db
      .prepare(
        `SELECT recommendations, budget_stated, budget_compliant, category_diverse, duration_ms, created_at
         FROM recommendation_logs
         WHERE session_id = ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(sid) as Record<string, unknown> | undefined;

    if (!recLog) {
      recLog = db
        .prepare(
          `SELECT recommendations, budget_stated, budget_compliant, category_diverse, duration_ms, created_at
           FROM recommendation_logs
           WHERE session_id LIKE ?
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(`%${sid}%`) as Record<string, unknown> | undefined;
    }

    // Enrich recommendation data with product images + descriptions from catalog
    if (recLog?.recommendations) {
      try {
        const recs = JSON.parse(String(recLog.recommendations));
        const enriched = recs.map((rec: Record<string, unknown>) => {
          const product = db
            .prepare("SELECT image_url, short_description, brand, buy_url FROM products WHERE id = ?")
            .get(String(rec.id)) as Record<string, string> | undefined;
          return {
            ...rec,
            imageUrl: product?.image_url || null,
            description: rec.description || product?.short_description || null,
            brand: rec.brand || product?.brand || null,
            buyUrl: rec.buyUrl || product?.buy_url || null,
          };
        });
        recLog = { ...recLog, recommendations: JSON.stringify(enriched) };
      } catch { /* keep original */ }
    }

    return NextResponse.json({ messages, session, recLog });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages", detail: String(error) },
      { status: 500 }
    );
  }
}
