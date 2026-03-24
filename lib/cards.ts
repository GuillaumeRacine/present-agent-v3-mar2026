// ── AI-Generated Gift Cards & Presentation Guides ───────────────────
// After selecting a product, generate a personal card message
// and a guide for how to present the gift.

import Anthropic from "@anthropic-ai/sdk";
import type { GiftContext } from "./recommend";
import type { Recipient } from "./profiles";

const anthropic = new Anthropic();

export interface CardContent {
  id: string;
  message: string;
  designTheme: "warm_minimal" | "playful" | "elegant" | "bold" | "nostalgic";
  toneMatch: "heartfelt" | "funny" | "understated" | "celebratory";
  insideJokeRef?: string;
  memoryRef?: string;
}

export interface PresentationGuide {
  wrappingIdea: string;
  timingAdvice: string;
  settingAdvice: string;
  whatToSay: string;
  pairingIdea?: string;
}

interface ProductSnapshot {
  name: string;
  brand: string;
  price: number;
  category: string;
  description?: string;
}

function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

export async function generateCard(
  context: GiftContext,
  recipientProfile: Recipient | null,
  product: ProductSnapshot
): Promise<CardContent> {
  const memories = recipientProfile
    ? safeParseJson<{ memory: string }[]>(recipientProfile.shared_memories, [])
    : [];
  const jokes = recipientProfile
    ? safeParseJson<string[]>(recipientProfile.inside_jokes, [])
    : [];

  const prompt = `You are writing a gift card message for a real person. The message should sound like the GIVER wrote it, not AI.

## Context
- Recipient: ${context.recipient?.name || "them"}
- Relationship: ${context.recipient?.relationship || "unknown"}
- Occasion: ${context.occasion?.type || "no specific occasion"}
- What the giver wants to express: ${context.gift?.giverWantsToExpress || "general thoughtfulness"}
- Product being given: ${product.name} by ${product.brand} ($${product.price})
- Product description: ${product.description || ""}
${memories.length > 0 ? `- Shared memories: ${memories.map(m => m.memory).join("; ")}` : ""}
${jokes.length > 0 ? `- Inside jokes: ${jokes.join("; ")}` : ""}

## Rules
- Maximum 3 sentences
- Reference ONLY specific things the giver actually shared (interests, memories, what they know about the recipient)
- NEVER invent or fabricate shared memories, inside jokes, or experiences that were not explicitly provided in the context
- If inside jokes or memories are available, weave ONE in naturally
- Match the relationship tone (mom = warm, friend = casual, professional = respectful)
- Sound like a real person, not a greeting card company
- NO generic phrases like "thinking of you" or "hope you enjoy"
- NO emojis
- NO corporate language
- ONLY reference facts from the context above — do not hallucinate details
- If the gift is from a group (gift.from mentions "group", "team", "us", "we"), use "we" instead of "I" throughout the message

## Output — return ONLY valid JSON:
{
  "message": "the card message",
  "designTheme": "warm_minimal|playful|elegant|bold|nostalgic",
  "toneMatch": "heartfelt|funny|understated|celebratory",
  "insideJokeRef": "the joke referenced, or null",
  "memoryRef": "the memory referenced, or null"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  let parsed: Omit<CardContent, "id">;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { message: "For you.", designTheme: "warm_minimal", toneMatch: "heartfelt" };
  }

  return {
    id: `card-${Date.now()}`,
    ...parsed,
  };
}

export async function generatePresentationGuide(
  context: GiftContext,
  recipientProfile: Recipient | null,
  product: ProductSnapshot
): Promise<PresentationGuide> {
  const prompt = `You are a gift-giving coach. Generate practical advice for HOW to give this gift for maximum emotional impact.

## Context
- Recipient: ${context.recipient?.name || "them"} (${context.recipient?.relationship || "someone special"})
- Occasion: ${context.occasion?.type || "no specific occasion"}
- Product: ${product.name} by ${product.brand}
- What the giver wants to express: ${context.gift?.giverWantsToExpress || "general thoughtfulness"}
- Interests: ${(context.recipient?.interests || []).join(", ") || "unknown"}

## Rules
- Be specific and practical, not generic
- Reference the actual product and recipient
- Keep each field to 1-2 sentences max
- Wrapping idea should be creative but achievable (no "commission an artist")
- Timing should be specific ("Saturday morning when she does her routine", not "a quiet moment")
- whatToSay should be a natural sentence the giver could actually say out loud

## Output — return ONLY valid JSON:
{
  "wrappingIdea": "specific wrapping suggestion",
  "timingAdvice": "when to give it",
  "settingAdvice": "where/context for giving",
  "whatToSay": "what to say when handing it over",
  "pairingIdea": "optional small add-on suggestion, or null"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match
      ? JSON.parse(match[0])
      : {
          wrappingIdea: "Simple gift bag with tissue paper.",
          timingAdvice: "Give it when you're together and relaxed.",
          settingAdvice: "Somewhere comfortable and private.",
          whatToSay: "I saw this and thought of you.",
        };
  }
}
