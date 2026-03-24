import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/recommend";
import { trackEvent } from "@/lib/events";
import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    const { context, sessionId, userId, recipientId } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: "Missing gift context" },
        { status: 400 }
      );
    }

    // Rate limit check
    const ip = getClientIp(request);
    const rl = checkRateLimit(`recommend:${ip}`, LLM_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    trackEvent(sessionId || null, userId || null, "recs.requested", {
      recipientName: context?.recipient?.name,
    });

    const startMs = Date.now();
    const recommendations = await getRecommendations(context, recipientId, userId);
    const durationMs = Date.now() - startMs;

    trackEvent(sessionId || null, userId || null, "recs.displayed", {
      productIds: recommendations.map((r) => r.product.id),
      categories: recommendations.map((r) => r.product.category),
    });

    // Log full recommendation details for VoC analysis
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const budget = context?.gift?.budget;
      const budgetNums = budget?.match(/\d+/g)?.map(Number) || [];
      const maxBudget = budgetNums.length > 0 ? Math.max(...budgetNums) : null;
      const allInBudget = maxBudget ? recommendations.every((r) => r.product.price <= maxBudget * 1.05) : true;
      const categories = new Set(recommendations.map((r) => r.product.category));
      const hasGenericCopy = recommendations.some((r) => r.whyThisFits.includes("solid") && r.whyThisFits.includes("option"));

      db.prepare(
        `INSERT INTO recommendation_logs (session_id, user_id, gift_context, candidate_count, recommendations, budget_stated, budget_compliant, slot3_personalized, category_diverse, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        sessionId || null,
        userId || null,
        JSON.stringify(context),
        recommendations.length,
        JSON.stringify(recommendations.map((r) => ({ id: r.product.id, name: r.product.name, price: r.product.price, category: r.product.category, matchScore: r.matchScore, whyThisFits: r.whyThisFits, whatThisSays: r.whatThisSays }))),
        budget || null,
        allInBudget ? 1 : 0,
        hasGenericCopy ? 0 : 1,
        categories.size >= 3 ? 1 : 0,
        durationMs
      );
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      recommendations: recommendations.map((r) => ({
        id: r.product.id,
        name: r.product.name,
        brand: r.product.brand,
        price: r.product.price,
        currency: r.product.currency,
        category: r.product.category,
        description: r.product.shortDescription,
        imageUrl: r.product.imageUrl || null,
        buyUrl: r.product.buyUrl,
        matchScore: r.matchScore,
        whyThisFits: r.whyThisFits,
        giftAngle: r.giftAngle,
        whatThisSays: r.whatThisSays || "",
        usageSignal: r.usageSignal || "",
      })),
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "Recommendation failed", detail: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
