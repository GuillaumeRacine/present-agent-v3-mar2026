import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    // Funnel: count sessions at each stage
    const totalSessions = (db.prepare("SELECT COUNT(*) as c FROM gift_sessions").get() as { c: number }).c;
    const conversationStarted = (db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM conversation_messages").get() as { c: number }).c;
    const conversationCompleted = (db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM conversation_messages WHERE phase = 'complete'").get() as { c: number }).c;
    const recsViewed = (db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type = 'recs.displayed'").get() as { c: number }).c;
    const cardReacted = (db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type = 'recs.card_reaction'").get() as { c: number }).c;
    const productSelected = (db.prepare("SELECT COUNT(*) as c FROM gift_sessions WHERE selected_product_id IS NOT NULL").get() as { c: number }).c;
    const cardGenerated = (db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type = 'card.generated'").get() as { c: number }).c;
    const purchased = (db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM events WHERE event_type = 'gift.marked_as_purchased'").get() as { c: number }).c;

    const base = Math.max(totalSessions, conversationStarted, 1);

    const funnel = [
      { stage: "Sessions started", count: base, rate: 100, dropoff: 0 },
      { stage: "Conversation started", count: conversationStarted, rate: (conversationStarted / base) * 100, dropoff: ((base - conversationStarted) / base) * 100 },
      { stage: "Profile completed", count: conversationCompleted, rate: (conversationCompleted / base) * 100, dropoff: conversationStarted > 0 ? ((conversationStarted - conversationCompleted) / conversationStarted) * 100 : 0 },
      { stage: "Recs viewed", count: recsViewed, rate: (recsViewed / base) * 100, dropoff: conversationCompleted > 0 ? ((conversationCompleted - recsViewed) / conversationCompleted) * 100 : 0 },
      { stage: "Card reaction", count: cardReacted, rate: (cardReacted / base) * 100, dropoff: recsViewed > 0 ? ((recsViewed - cardReacted) / recsViewed) * 100 : 0 },
      { stage: "Product selected", count: productSelected, rate: (productSelected / base) * 100, dropoff: cardReacted > 0 ? ((cardReacted - productSelected) / cardReacted) * 100 : 0 },
      { stage: "Card generated", count: cardGenerated, rate: (cardGenerated / base) * 100, dropoff: productSelected > 0 ? ((productSelected - cardGenerated) / productSelected) * 100 : 0 },
      { stage: "Purchased", count: purchased, rate: (purchased / base) * 100, dropoff: cardGenerated > 0 ? ((cardGenerated - purchased) / cardGenerated) * 100 : 0 },
    ];

    // Conversion factors
    const avgTurnsCompleted = db.prepare(
      "SELECT AVG(turn_count) as avg FROM (SELECT session_id, MAX(turn_number) as turn_count FROM conversation_messages WHERE phase = 'complete' GROUP BY session_id)"
    ).get() as { avg: number | null };

    const avgTurnsAll = db.prepare(
      "SELECT AVG(turn_count) as avg FROM (SELECT session_id, MAX(turn_number) as turn_count FROM conversation_messages GROUP BY session_id)"
    ).get() as { avg: number | null };

    const recLogs = db.prepare(
      "SELECT budget_compliant, category_diverse FROM recommendation_logs"
    ).all() as { budget_compliant: number; category_diverse: number }[];

    const budgetComplianceRate = recLogs.length > 0
      ? recLogs.filter(r => r.budget_compliant).length / recLogs.length
      : 0;

    // Recent sessions
    const recentSessions = db.prepare(`
      SELECT
        gs.id,
        json_extract(gs.gift_context, '$.recipient.name') as recipientName,
        gs.status,
        gs.selected_product_id,
        gs.created_at,
        (SELECT MAX(turn_number) FROM conversation_messages WHERE session_id = gs.id) as turnCount
      FROM gift_sessions gs
      ORDER BY gs.created_at DESC
      LIMIT 20
    `).all() as { id: string; recipientName: string; status: string; selected_product_id: string | null; created_at: string; turnCount: number | null }[];

    return NextResponse.json({
      funnel,
      factors: {
        avgTurnsConverted: avgTurnsCompleted?.avg || 0,
        avgTurnsAbandoned: avgTurnsAll?.avg || 0,
        topPickSelectionRate: 0, // TODO: compute from recommendation_logs
        avgTimeToSelectMs: 0,   // TODO: compute from events
        refinementRate: 0,      // TODO: compute from events
        budgetComplianceRate,
      },
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        recipientName: s.recipientName || "Unknown",
        status: s.status,
        turnCount: s.turnCount || 0,
        hasProduct: !!s.selected_product_id,
        created: s.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute conversion data", detail: String(error) },
      { status: 500 }
    );
  }
}
