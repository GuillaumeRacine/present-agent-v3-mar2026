import { NextResponse } from "next/server";
import { saveFeedback, computeQualityScores, SessionFeedback } from "@/lib/feedback";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, sessionId, data } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    switch (type) {
      // Capture implicit signals (sent automatically by the UI)
      case "implicit": {
        const feedback: SessionFeedback = {
          sessionId,
          userId: data.userId,
          timestamp: new Date().toISOString(),
          recipientName: data.recipientName,
          occasion: data.occasion,
          relationship: data.relationship,
          giftContext: data.giftContext || {},
          recommendations: data.recommendations || [],
          implicit: data.implicit,
          explicit: { cardReactions: [] },
        };
        feedback.qualityScores = computeQualityScores(feedback);
        saveFeedback(feedback);
        return NextResponse.json({ ok: true, qualityScores: feedback.qualityScores });
      }

      // Capture card-level reaction (thumbs up/down per product)
      case "card_reaction": {
        const { loadFeedback } = await import("@/lib/feedback");
        const existing = loadFeedback(sessionId);
        if (existing) {
          existing.explicit.cardReactions.push({
            productId: data.productId,
            reaction: data.reaction,
          });
          existing.qualityScores = computeQualityScores(existing);
          saveFeedback(existing);
        }
        return NextResponse.json({ ok: true });
      }

      // Quick reaction after CTA click ("perfect" / "good_enough" / "not_great")
      case "quick_reaction": {
        const { loadFeedback: load } = await import("@/lib/feedback");
        const existing = load(sessionId);
        if (existing) {
          existing.explicit.quickReaction = data.reaction;
          existing.qualityScores = computeQualityScores(existing);
          saveFeedback(existing);
        }
        return NextResponse.json({ ok: true });
      }

      // Conversation quality feedback
      case "conversation_quality": {
        const { loadFeedback: load2 } = await import("@/lib/feedback");
        const existing = load2(sessionId);
        if (existing) {
          existing.explicit.conversationFelt = data.felt;
          existing.qualityScores = computeQualityScores(existing);
          saveFeedback(existing);
        }
        return NextResponse.json({ ok: true });
      }

      // Post-purchase follow-up (called from email link or return visit)
      case "post_purchase": {
        const { loadFeedback: load3 } = await import("@/lib/feedback");
        const existing = load3(sessionId);
        if (existing) {
          existing.explicit.postPurchase = data;
          existing.qualityScores = computeQualityScores(existing);
          saveFeedback(existing);
        }
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown feedback type: ${type}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Feedback error:", error);
    const detail = process.env.NODE_ENV === "development" ? String(error) : "An internal error occurred";
    return NextResponse.json({ error: "Feedback save failed", detail }, { status: 500 });
  }
}
