import { NextResponse } from "next/server";
import { getRecommendations, type GiftContext } from "@/lib/recommend";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { trackEvent } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipient, relationship, occasion, budget, interests, userId } = body;

    if (!recipient) {
      return NextResponse.json({ error: "recipient is required" }, { status: 400 });
    }

    const context: GiftContext = {
      recipient: {
        name: recipient,
        relationship,
        interests: interests ? (Array.isArray(interests) ? interests : interests.split(",").map((s: string) => s.trim())) : undefined,
      },
      occasion: occasion ? { type: occasion } : undefined,
      gift: budget ? { budget } : undefined,
    };

    // Create a persistent session
    const db = getDb();
    const sessionId = randomUUID();
    db.prepare(
      `INSERT INTO gift_sessions (id, user_id, status, gift_context, created_at, updated_at)
       VALUES (?, ?, 'active', ?, datetime('now'), datetime('now'))`
    ).run(sessionId, userId || null, JSON.stringify(context));

    trackEvent(sessionId, userId || null, "session.started", { source: "api" });

    const recommendations = await getRecommendations(context);

    return NextResponse.json({
      sessionId,
      recommendations: recommendations.map((r, i) => ({
        slot: i === 0 ? "top_pick" : i === 1 ? "great_match" : "wild_card",
        id: r.product.id,
        name: r.product.name,
        brand: r.product.brand,
        price: r.product.price,
        category: r.product.category,
        matchScore: r.matchScore,
        whyThisFits: r.whyThisFits,
        giftAngle: r.giftAngle,
        buyUrl: r.product.buyUrl,
      })),
    });
  } catch (error) {
    console.error("V1 gift error:", error);
    return NextResponse.json(
      { error: "Gift recommendation failed", detail: String(error) },
      { status: 500 }
    );
  }
}
