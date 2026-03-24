import { NextResponse } from "next/server";
import {
  getSessionFunnel,
  getConversationMetrics,
  getRecommendationAccuracy,
  getRecipientSatisfaction,
  getTimeToGift,
} from "@/lib/analytics";

export async function GET() {
  try {
    const [funnel, conversation, recommendations, satisfaction, timeToGift] =
      await Promise.all([
        getSessionFunnel(),
        getConversationMetrics(),
        getRecommendationAccuracy(),
        getRecipientSatisfaction(),
        getTimeToGift(),
      ]);

    return NextResponse.json({
      funnel,
      conversation,
      recommendations,
      satisfaction,
      timeToGift,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Analytics failed", detail: String(error) },
      { status: 500 }
    );
  }
}
