import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");

    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const dbSessions = db
      .prepare(
        `SELECT * FROM gift_sessions ${where}
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(...params, limit) as Record<string, unknown>[];

    // Also find conversation-only sessions (not in gift_sessions)
    // These come from test harnesses, E2E tests, etc.
    const convoOnlySessions = db
      .prepare(
        `SELECT
           cm.session_id as id,
           NULL as user_id,
           NULL as recipient_id,
           CASE WHEN MAX(cm.phase) = 'complete' THEN 'completed' ELSE 'active' END as status,
           MAX(cm.extracted_context) as gift_context,
           NULL as selected_product_id,
           NULL as selected_product_data,
           NULL as card_content,
           NULL as presentation_guide,
           NULL as delivery_preferences,
           NULL as feedback_token,
           NULL as recipient_feedback,
           MIN(cm.created_at) as created_at,
           MAX(cm.created_at) as updated_at,
           CASE WHEN MAX(cm.phase) = 'complete' THEN MAX(cm.created_at) ELSE NULL END as completed_at,
           COUNT(*) as message_count
         FROM conversation_messages cm
         WHERE cm.session_id NOT IN (SELECT id FROM gift_sessions)
         GROUP BY cm.session_id
         ORDER BY MIN(cm.created_at) DESC
         LIMIT ?`
      )
      .all(limit) as Record<string, unknown>[];

    // Merge and sort by created_at descending
    const allSessions = [...dbSessions, ...convoOnlySessions]
      .sort((a, b) => {
        const ta = new Date(String(a.created_at)).getTime();
        const tb = new Date(String(b.created_at)).getTime();
        return tb - ta;
      })
      .slice(0, limit);

    return NextResponse.json({ sessions: allSessions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sessions", detail: process.env.NODE_ENV === "development" ? String(error) : "An internal error occurred" },
      { status: 500 }
    );
  }
}
