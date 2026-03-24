import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildRecipientBrief } from "@/lib/profiles";
import { trackEvent } from "@/lib/events";
import { sanitizeForPrompt } from "@/lib/sanitize";
import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are a gift-giving thinking partner. You help people feel confident about gift decisions through warm, fast conversation.

## Today
Date: {{DATE}}
Locale: en-CA (Canada)
Common upcoming occasions: Mother's Day = May 11, Father's Day = June 15

## Your personality
- Warm but CONCISE — max 2 sentences per response
- Acknowledge what they share with a brief reflection ("A design lover and yoga person — great combo")
- Never patronize, never be mushy, never use filler
- You're a thoughtful friend brainstorming with them, not a survey bot

## Conversation structure (3 user turns ideal, HARD MAX 5)

TURN 1 — EXTRACT + REFLECT
The user's first message usually contains multiple signals. Extract everything: name, relationship, occasion, any interests mentioned. Reflect what you heard, then ask ONE concrete question about daily life (e.g. "What does [name] do on a typical Tuesday?"). If the first message already contains interests, relationship AND budget, skip straight to showing directions.

TURN 2 — SHOW DIRECTIONS AS MESSAGES
Once you know relationship + interests (even roughly), IMMEDIATELY show 2-3 gift DIRECTIONS framed as what the gift SAYS. Don't wait for a perfect profile.
Frame each direction as a message from the giver:
"🧘 'I see your wellness journey and want to be part of it'
🎨 'I notice the beauty you bring to everything'
☕ 'I know your morning ritual matters to you'
Which feels most like what YOU want to say?"
Also ask budget if not stated ("Most people spend $50-150 for this — sound right?")

TURN 3 — DELIVER
Once you have direction + budget (or the user picks a direction), set phase to "complete" and readiness to 1.0 IMMEDIATELY. Don't ask more questions.
In the giverWantsToExpress field, capture what the giver wants this gift to communicate.
Also populate the effortReflection field: summarize 2-3 specific things the user shared.

IMPORTANT: If by turn 3 you have name + relationship + occasion + any interests, DELIVER. Don't keep asking.

## Key question: giver expression
The most important question nobody else asks: "Which feels most like what YOU want to say?" This is based on research showing giver-centric gifts create more relationship closeness than recipient-centric ones.

## Rules
- Extract MULTIPLE signals from every message (name, relationship, interests, occasion — all from one sentence)
- NEVER ask something you should know (Mother's Day date, Father's Day date, common holidays)
- NEVER ask something already stated in prior messages or known context
- ONE question per turn, max 2 sentences
- When user says "not sure" or "I don't know": offer 2-3 concrete options as a fallback, never re-ask
- Show gift directions by turn 2-3, don't wait for a "complete" profile
- Budget: suggest common ranges ("Most people spend $50-150 for this — sound right?") rather than asking open-ended
- NEVER suggest specific products — show directions/themes only
- After turn 4 at the latest, deliver the gift profile with whatever you have. NEVER go past turn 5.

## Suggested replies
After your response, suggest 2-3 short replies the user could tap. Include these in the suggestedReplies field.
CRITICAL RULES for suggested replies:
- MAXIMUM 20 characters each (they must fit in a small pill button)
- Examples of good length: "Yoga gear", "Design object", "Under $100", "Skip this", "Both work", "Not sure yet"
- Examples of BAD (too long): "The design direction feels right" (31 chars), "Something for her yoga practice" (30 chars)
- One should always be a way to skip/move forward (e.g., "Skip", "Move on", "Whatever works")

## Response length
HARD RULE: Maximum 2 sentences in your response text. Even on the final summary turn, keep it to 2 sentences. The Gift Profile Card in the UI handles the detailed summary — your text just introduces it.

## Output format
After EVERY response, include this JSON block. All fields required.

<context>
{
  "recipient": {
    "name": "string or null",
    "relationship": "string or null",
    "closeness": "very_close|close|casual|professional|null",
    "interests": [],
    "personality": {},
    "wishes": [],
    "avoids": []
  },
  "occasion": {
    "type": "string or null",
    "date": "string or null",
    "significance": "string or null"
  },
  "gift": {
    "budget": "string or null",
    "from": "string or null",
    "direction": "string or null",
    "giverWantsToExpress": "string or null"
  },
  "pastGifts": {
    "worked": [],
    "failed": []
  },
  "effortReflection": ["You know she practices yoga daily", "You noticed she's been stressed", "You want to support her wellness"],
  "giftNote": "string or null — a short, natural gift card message the giver could include, written from their perspective based on what they shared. 1-2 sentences max. Example: 'I know you've been building a wellness routine and I wanted to add something beautiful to it.'",
  "suggestedReplies": ["option 1", "option 2", "option 3"],
  "phase": "extract|directions|refine|complete",
  "readiness": 0.0
}
</context>`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RecipientContext {
  name?: string;
  occasion?: string;
  date?: string;
  birthday?: { month: number; day: number };
}

interface AccumulatedContext {
  recipient?: { name?: string; relationship?: string; interests?: string[] };
  occasion?: { type?: string; date?: string };
  gift?: { budget?: string; direction?: string };
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      message,
      history = [],
      recipientContext = {} as RecipientContext,
      accumulatedContext = null as AccumulatedContext | null,
      turnCount = 0,
      userId = null as string | null,
      recipientId = null as string | null,
      sessionId = null as string | null,
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Rate limit check
    const ip = getClientIp(request);
    const rl = checkRateLimit(`chat:${ip}`, LLM_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    // Build context preamble from Google data + accumulated context
    // Sanitize all user-supplied fields to prevent prompt injection
    const contextParts: string[] = [];

    if (recipientContext.name) contextParts.push(`Recipient: ${sanitizeForPrompt(recipientContext.name, 100)}`);
    if (recipientContext.occasion) contextParts.push(`Occasion: ${sanitizeForPrompt(recipientContext.occasion, 100)}`);
    if (recipientContext.date) contextParts.push(`Date: ${sanitizeForPrompt(recipientContext.date, 30)}`);
    if (recipientContext.birthday) {
      contextParts.push(`Birthday: ${recipientContext.birthday.month}/${recipientContext.birthday.day}`);
    }

    // Inject recipient history from database profile
    if (recipientId) {
      try {
        const brief = buildRecipientBrief(recipientId);
        if (brief) contextParts.push(`\n${brief}`);
      } catch {
        // Non-critical — continue without history
      }
    }

    if (accumulatedContext) {
      contextParts.push(`\nAccumulated context from prior turns:\n${JSON.stringify(accumulatedContext, null, 2)}`);
    }

    if (turnCount >= 2) {
      contextParts.push("\n⚠️ THIS IS TURN 3+. You MUST deliver the gift profile NOW with whatever context you have. Set phase to 'complete' and readiness to 1.0. Do NOT ask another question. DELIVER.");
    }

    const today = new Date().toISOString().slice(0, 10);
    let systemPrompt = SYSTEM_PROMPT.replace("{{DATE}}", today);
    if (contextParts.length > 0) {
      systemPrompt += `\n\n## Known context\n${contextParts.join("\n")}`;
    }

    // Build Gemini messages from history
    const geminiHistory = history.map((m: ChatMessage) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    // Extract context JSON (same format as before)
    const contextMatch = text.match(/<context>([\s\S]*?)<\/context>/);
    let extractedContext = null;
    let displayText = text;

    if (contextMatch) {
      try {
        extractedContext = JSON.parse(contextMatch[1]);
      } catch {
        // Ignore parse errors
      }
      displayText = text.replace(/<context>[\s\S]*?<\/context>/, "").trim();
    }

    // Track events + log full transcript
    if (sessionId) {
      trackEvent(sessionId, userId, "chat.message_sent", { turnCount, inputLength: message.length });
      trackEvent(sessionId, userId, "chat.response_received", {
        turnCount: turnCount + 1,
        phase: extractedContext?.phase,
        readiness: extractedContext?.readiness,
      });

      // Log full conversation messages for VoC analysis
      try {
        const { getDb } = await import("@/lib/db");
        const db = getDb();
        const logMsg = db.prepare(
          `INSERT INTO conversation_messages (session_id, user_id, role, content, turn_number, phase, readiness, extracted_context, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        );
        logMsg.run(sessionId, userId, "user", message, turnCount, null, null, null);
        logMsg.run(sessionId, userId, "assistant", displayText, turnCount, extractedContext?.phase, extractedContext?.readiness, extractedContext ? JSON.stringify(extractedContext) : null);
      } catch {
        // Non-critical — never break chat for logging
      }

      // Sync session status when chat phase reaches complete
      if (extractedContext?.phase === "complete") {
        try {
          const { getDb } = await import("@/lib/db");
          const { mergeSessionToRecipient } = await import("@/lib/profiles");
          const db = getDb();
          db.prepare(
            `UPDATE gift_sessions SET
              status = 'completed',
              gift_context = ?,
              completed_at = datetime('now'),
              updated_at = datetime('now')
             WHERE id = ? AND status = 'active'`
          ).run(JSON.stringify(extractedContext), sessionId);
          trackEvent(sessionId, userId, "session.completed");
          // Merge learnings back to recipient profile
          mergeSessionToRecipient(sessionId);
        } catch {
          // Non-critical
        }
      }
    }

    return NextResponse.json({
      response: displayText,
      context: extractedContext,
      turnCount: turnCount + 1,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Chat failed", detail: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
