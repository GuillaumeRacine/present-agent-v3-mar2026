import { NextResponse } from "next/server";
import { generateCard, generatePresentationGuide } from "@/lib/cards";
import { getRecipient } from "@/lib/profiles";
import { trackEvent } from "@/lib/events";
import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    const { context, recipientId, product, sessionId, userId } = await request.json();

    if (!context || !product) {
      return NextResponse.json(
        { error: "Missing context or product" },
        { status: 400 }
      );
    }

    // Rate limit check
    const ip = getClientIp(request);
    const rl = checkRateLimit(`cards:${ip}`, LLM_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const recipientProfile = recipientId ? getRecipient(recipientId) : null;

    const [card, presentation] = await Promise.all([
      generateCard(context, recipientProfile, product),
      generatePresentationGuide(context, recipientProfile, product),
    ]);

    if (sessionId) {
      trackEvent(sessionId, userId || null, "card.generated", {
        productId: product.id,
        designTheme: card.designTheme,
        toneMatch: card.toneMatch,
      });
    }

    return NextResponse.json({ card, presentation });
  } catch (error) {
    console.error("Card generation error:", error);
    return NextResponse.json(
      { error: "Card generation failed", detail: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
