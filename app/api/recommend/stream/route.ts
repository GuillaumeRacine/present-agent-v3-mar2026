import { getRecommendations } from "@/lib/recommend";
import { trackEvent } from "@/lib/events";
import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { context, sessionId, userId, recipientId } = await request.json();

  if (!context) {
    return new Response(JSON.stringify({ error: "Missing gift context" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(request);
  const rl = checkRateLimit(`recommend:${ip}`, LLM_RATE_LIMIT);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
    });
  }

  trackEvent(sessionId || null, userId || null, "recs.requested", {
    recipientName: context?.recipient?.name,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Phase 1: Searching
        send({ status: "searching", message: "Searching 171K products..." });

        const startMs = Date.now();

        // Phase 2: Scoring (sent just before the actual Claude call)
        setTimeout(() => {
          send({ status: "scoring", message: "AI is scoring top matches..." });
        }, 500);

        setTimeout(() => {
          send({ status: "scoring", message: "Personalizing recommendations..." });
        }, 5000);

        setTimeout(() => {
          send({ status: "scoring", message: "Almost there..." });
        }, 10000);

        // Get recommendations (this is the slow part — 12-15s)
        const recommendations = await getRecommendations(context, recipientId, userId);
        const durationMs = Date.now() - startMs;

        trackEvent(sessionId || null, userId || null, "recs.displayed", {
          productIds: recommendations.map((r) => r.product.id),
          categories: recommendations.map((r) => r.product.category),
        });

        // Log to recommendation_logs
        try {
          const { getDb } = await import("@/lib/db");
          const db = getDb();
          const budget = context?.gift?.budget;
          const budgetNums = budget?.match(/\d+/g)?.map(Number) || [];
          const maxBudget = budgetNums.length > 0 ? Math.max(...budgetNums) : null;
          const allInBudget = maxBudget ? recommendations.every((r) => r.product.price <= maxBudget * 1.05) : true;
          const categories = new Set(recommendations.map((r) => r.product.category));

          db.prepare(
            `INSERT INTO recommendation_logs (session_id, user_id, gift_context, candidate_count, recommendations, budget_stated, budget_compliant, slot3_personalized, category_diverse, duration_ms, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).run(
            sessionId || null, userId || null, JSON.stringify(context),
            recommendations.length,
            JSON.stringify(recommendations.map((r) => ({ id: r.product.id, name: r.product.name, price: r.product.price, category: r.product.category, matchScore: r.matchScore, whyThisFits: r.whyThisFits, whatThisSays: r.whatThisSays }))),
            budget || null, allInBudget ? 1 : 0, 1, categories.size >= 3 ? 1 : 0, durationMs
          );
        } catch { /* non-critical */ }

        // Phase 3: Send each recommendation as a separate event
        const mapped = recommendations.map((r) => ({
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
        }));

        // Send cards one by one with slight delay for visual effect
        for (let i = 0; i < mapped.length; i++) {
          send({ status: "recommendation", index: i, recommendation: mapped[i] });
        }

        // Final event
        send({ status: "done", recommendations: mapped, durationMs });

      } catch (error) {
        send({ status: "error", error: "Recommendation failed" });
        console.error("Streaming recommendation error:", error);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
