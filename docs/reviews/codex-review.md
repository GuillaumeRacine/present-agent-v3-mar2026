OpenAI Codex v0.115.0 (research preview)
--------
workdir: /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019d252c-12bc-72e2-b395-2074acab65d1
--------
user
Review the Present Agent v3 codebase (https://github.com/GuillaumeRacine/present-agent-v2). AI gift recommendation app for ADHD adults. Next.js 14, SQLite 171K products, Gemini Flash chat, Claude Sonnet recommendations. Write a technical + product review as markdown covering: architecture, security, UX, recommendation engine, testing, competitive position, top 5 improvements, risks. Be critical. Output only the markdown review.
mcp startup: no servers
codex
I’m reviewing the local `present-agent3` codebase as a code and product audit, then I’ll turn that into a critical markdown review covering architecture, security, UX, recommendations, testing, risks, and improvement priorities.
Plan update
  → Map repo structure and key runtime surfaces
  • Inspect recommendation, data, auth, and API paths
  • Assess UX flows, testing coverage, and product positioning
  • Write critical markdown review with concrete references
codex
I’m mapping the app surface first: framework config, data layer, API routes, AI integration points, and any test harnesses. After that I’ll inspect the core recommendation flow and user-facing journey.
exec
/bin/zsh -lc pwd in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
/Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3
exec
/bin/zsh -lc "rg --files -g 'package.json' -g 'pnpm-lock.yaml' -g 'yarn.lock' -g 'package-lock.json' -g 'next.config.*' -g 'src/**' -g 'app/**' -g 'pages/**' -g 'components/**' -g 'lib/**' -g 'server/**' -g 'prisma/**' -g 'db/**' -g 'tests/**' -g '__tests__/**' -g 'README*' -g '.env*' -g 'middleware.*' -g 'tsconfig.json'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
.env.example
tsconfig.json
lib/catalog.ts
lib/auth.ts
lib/db.ts
lib/rate-limit.ts
lib/models.ts
lib/admin-auth.ts
lib/events.ts
lib/feedback.ts
lib/cards.ts
lib/google.ts
lib/posthog.ts
lib/occasions.ts
lib/recommend.ts
lib/recipient-feedback.ts
lib/voice-prompts.ts
lib/analytics.ts
lib/useVoice.ts
lib/sanitize.ts
exec
/bin/zsh -lc 'find . -maxdepth 2 -type d | sort' in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 285ms:
.
./.git
./.git/hooks
./.git/info
./.git/logs
./.git/objects
./.git/refs
./.next
./.next/cache
./.next/server
./.next/static
./.next/types
./app
./app/(marketing)
./app/admin
./app/api
./app/dashboard
./app/feedback
./app/fonts
./app/gift
codex
The repo is a compact Next.js app with a lot of logic concentrated in `lib/*` and `app/api/*`, which usually means the main risks will be around server-side invariants, model orchestration, and data handling rather than framework complexity. I’m reading those paths now.
exec
/bin/zsh -lc "sed -n '1,260p' README.md" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
# Present Agent v2

An AI-powered gifting assistant designed for ADHD adults. Conversational chat builds a recipient profile in 2-3 turns, then delivers 3 psychology-informed gift recommendations with AI-generated cards and presentation guides.

## Architecture

```
Chat (Gemini Flash) → Gift Profile → SQLite Catalog (171K products) → Claude Sonnet Scoring → 3-Card Display → AI Card + Presentation Guide → Purchase → Recipient Feedback → Learning Loop
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, Tailwind CSS, React 18 |
| Chat | Gemini 2.5 Flash (fast conversational flow) |
| Recommendations | Claude Sonnet (nuanced matching, 3-slot strategy) |
| Cards | Claude Sonnet (personalized messages + presentation guides) |
| Catalog | SQLite (better-sqlite3), 171K enriched products |
| Voice STT | Web Speech API + Whisper fallback |
| Voice TTS | OpenAI TTS (server-side) |
| Auth | Google OAuth (profiles, calendar, contacts) |
exec
/bin/zsh -lc "sed -n '1,220p' package.json" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
{
  "name": "present-agent",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:seed": "tsx scripts/seed-existing.ts",
    "db:import-shopify": "tsx scripts/import-shopify.ts",
    "db:enrich": "tsx scripts/enrich-products.ts",
    "db:stats": "tsx scripts/db-stats.ts",
    "db:quality": "tsx scripts/data-quality.ts",
    "db:quality:dry": "tsx scripts/data-quality.ts --dry-run",
    "db:quality:llm": "tsx scripts/data-quality.ts --llm-audit",
    "crawl": "tsx scripts/crawl-stores.ts",
    "enrich:quick": "tsx scripts/enrich-batch-quick.ts"
  },
  "dependencies": {
exec
/bin/zsh -lc "sed -n '1,220p' lib/db.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
// ── SQLite Database Layer for Product Catalog ────────────────────────
// Uses better-sqlite3 for synchronous, fast access to the product catalog.
// Database file: data/catalog.db (relative to project root)

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "catalog.db");

let _db: Database.Database | null = null;

export interface DbProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  image_url: string | null;
exec
/bin/zsh -lc "sed -n '1,260p' lib/recommend.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/chat/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/recommend/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
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
 succeeded in 0ms:
// ── Recommendation Engine ──────────────────────────────────────────
// Takes a completed gift context → returns 3 product recommendations
// Uses Claude to match qualitative context against catalog metadata
// Queries SQLite DB for enriched products (133K+), falls back to static catalog

import Anthropic from "@anthropic-ai/sdk";
import { CATALOG, Product, priceTierFromBudget } from "./catalog";
import { getDb, type DbProduct } from "./db";
import { getRecipientHistory } from "./profiles";
import { loadUserHistory, extractRecommenderInsights } from "./feedback";
import { sanitizeForPrompt } from "./sanitize";

const anthropic = new Anthropic();

export interface Recommendation {
  product: Product;
  matchScore: number; // 0-1
  whyThisFits: string; // 1-2 sentence explanation
  giftAngle: string; // How to present/frame this gift
  whatThisSays: string; // Gift framed as message: "This says: '...'"
 succeeded in 0ms:
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
exec
/bin/zsh -lc "sed -n '261,520p' app/api/chat/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
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
codex
I’ve confirmed the app mixes product logic, persistence, AI prompts, and analytics directly in route handlers. Next I’m checking auth boundaries, public endpoints, and how much of the “learning loop” is actually implemented versus described.
exec
/bin/zsh -lc "sed -n '1,220p' lib/admin-auth.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,220p' lib/auth.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
// ── Admin Authentication Middleware ─────────────────────────────────
// Validates that the requesting user is an admin before allowing access
// to admin endpoints. For MVP: checks x-user-id header + admin flag in DB.

import { getUserById } from "./auth";

const ADMIN_EMAILS = new Set([
  // Add admin emails here
  process.env.ADMIN_EMAIL,
].filter(Boolean));

/**
 * Checks if the request has valid admin credentials.
 * Returns { ok: true, userId } or { ok: false, status, error }.
 */
export function requireAdmin(request: Request):
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string } {
  // Skip auth in development for local admin access
  if (process.env.NODE_ENV === "development") {
 succeeded in 0ms:
// ── User Authentication ─────────────────────────────────────────────
// Maps Google OAuth profiles to local user records.

import { getDb } from "./db";
import { randomUUID } from "crypto";

export interface User {
  id: string;
  google_id: string | null;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  preferences: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleProfile {
  sub: string;       // Google's unique user ID
  email?: string;
exec
/bin/zsh -lc "sed -n '1,280p' lib/feedback.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,240p' lib/rate-limit.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,280p' lib/profiles.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
// ── In-Memory Rate Limiter ──────────────────────────────────────────
// Simple sliding-window rate limiter. No external dependencies.
// Resets on server restart (acceptable for MVP).

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
 succeeded in 0ms:
// ── Recipient Profile Management ────────────────────────────────────
// CRUD for recipient profiles + learning from gift sessions.

import { getDb } from "./db";
import { randomUUID } from "crypto";
import type { GiftContext } from "./recommend";

export interface Recipient {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  closeness: string | null;
  interests: string | null;        // JSON array
  personality: string | null;       // JSON object
  wishes: string | null;           // JSON array
  avoids: string | null;           // JSON array
  shared_memories: string | null;  // JSON array
  inside_jokes: string | null;     // JSON array
  google_contact_id: string | null;
 succeeded in 0ms:
// ── Feedback System ───────────────────────────────────────────────
// Captures signals at every stage of the gift journey to improve
// recommendations over time. Two types of signals:
//
// 1. IMPLICIT — captured automatically from user behavior
// 2. EXPLICIT — captured via lightweight UI prompts
//
// Feedback flows into the recommender via the /api/feedback endpoint
// and is stored per-session for analysis + per-user for personalization.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ── Signal Types ─────────────────────────────────────────────────

/**
 * Implicit signals — captured without asking the user anything.
 * These are the highest-volume, lowest-friction signals.
 */
export interface ImplicitSignals {
exec
/bin/zsh -lc "sed -n '1,240p' lib/sanitize.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
// ── Input Sanitization for LLM Prompts ──────────────────────────────
// Prevents prompt injection by stripping control characters and
// limiting length of user-supplied data before it enters system prompts.

/**
 * Sanitize a string before injecting into an LLM prompt.
 * Strips newlines, code blocks, XML-like tags, and limits length.
 */
export function sanitizeForPrompt(input: string, maxLength = 200): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[\r\n]+/g, " ")           // Flatten newlines
    .replace(/```[\s\S]*?```/g, "")      // Remove code blocks
    .replace(/<[^>]*>/g, "")             // Remove XML/HTML tags
    .replace(/#{1,6}\s/g, "")            // Remove markdown headers
    .replace(/\s+/g, " ")               // Collapse whitespace
    .trim()
    .slice(0, maxLength);
}

exec
/bin/zsh -lc "sed -n '281,520p' lib/feedback.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
    .sort((a, b) => b.negativeCount - a.negativeCount);

  const relationshipPreferences = Object.entries(relationshipMap)
    .map(([relationship, data]) => ({
      relationship,
      preferredCategories: Array.from(new Set(data.categories)),
      avgBudget: data.budgets.length > 0 ? data.budgets.reduce((a, b) => a + b) / data.budgets.length : 0,
      avgSatisfaction: data.satisfactions.length > 0 ? data.satisfactions.reduce((a, b) => a + b) / data.satisfactions.length : 0,
    }));

  const maxSlot = slotPicks.indexOf(Math.max(...slotPicks));

  return {
    preferredCategories,
    preferredPriceTier: null, // TODO: derive from budget patterns
    avoidProducts: worstPerformingProducts.filter(p => p.negativeCount >= 2).map(p => p.productId),
    preferredSlot: slotPicks[maxSlot] > 0 ? maxSlot : null,
    relationshipPreferences,
    topPerformingProducts,
    worstPerformingProducts,
exec
/bin/zsh -lc "sed -n '261,560p' lib/recommend.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:

  // Enforce diversity: max 2 products per brand, max 6 per category
  // This ensures Claude sees a variety of categories, not just "practical" (which is 50% of catalog)
  const brandCount: Record<string, number> = {};
  const catCount: Record<string, number> = {};
  const diverse: DbProduct[] = [];

  for (const row of rows) {
    const brand = row.brand?.toLowerCase() || "unknown";
    const cat = row.category || "practical";
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    catCount[cat] = (catCount[cat] || 0) + 1;
    if (brandCount[brand] <= 2 && catCount[cat] <= 6) {
      diverse.push(row);
    }
    if (diverse.length >= 50) break;
  }

  return diverse.map(dbToProduct);
}
exec
/bin/zsh -lc "sed -n '561,920p' lib/recommend.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
  const recipientName = context.recipient?.name || "them";
  const interests = context.recipient?.interests || [];
  const relationship = context.recipient?.relationship || "";
  const giverExpression = context.gift?.giverWantsToExpress || "";

  function buildFallbackCopy(product: Product): Pick<Recommendation, "whyThisFits" | "giftAngle" | "whatThisSays" | "usageSignal"> {
    const interestMatch = interests.find((i: string) =>
      product.meta.recipientTraits?.some((t: string) => t.toLowerCase().includes(i.toLowerCase()))
    );
    const why = interestMatch
      ? `Connects to ${recipientName}'s interest in ${interestMatch} — a ${product.category} pick that fits naturally into their life.`
      : `A thoughtful ${product.category} pick${relationship ? ` for your ${relationship}` : ""} that shows you put real thought into this.`;
    const says = giverExpression
      ? `This says: '${giverExpression.slice(0, 80)}'`
      : `This says: 'I chose this specifically for you — not a random pick.'`;
    return {
      whyThisFits: why,
      giftAngle: `Give it with a note about why you picked this one specifically for ${recipientName}.`,
      whatThisSays: says,
      usageSignal: product.meta.usageSignal || "",
exec
/bin/zsh -lc "sed -n '1,260p' app/api/v1/gift/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
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
exec
/bin/zsh -lc "sed -n '1,260p' app/api/sessions/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/feedback/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/sessions/[id]/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/v1/gift/[id]/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { trackEvent } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, recipientId, recipientName, sessionId: customId } = body;

    const db = getDb();
    const id = customId || randomUUID();

    db.prepare(
      `INSERT INTO gift_sessions (id, user_id, recipient_id, status, gift_context, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`
    ).run(id, userId || null, recipientId || null, JSON.stringify({ recipient: { name: recipientName } }));

    trackEvent(id, userId || null, "session.started", { recipientId, recipientName });

 succeeded in 0ms:
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
 exited 1 in 0ms:
zsh:1: no matches found: app/api/sessions/[id]/route.ts
 exited 1 in 0ms:
zsh:1: no matches found: app/api/v1/gift/[id]/route.ts
exec
/bin/zsh -lc "rg -n \"requireAuth|requireAdmin|x-user-id|feedback_token|GoogleGenerativeAI|Anthropic|OpenAI|trackEvent\\(|saveFeedback\\(|loadFeedback\\(|loadUserHistory\\(\" app lib components test e2e" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 7ms:

codex
I’ve already found one likely theme: most “auth” is just trust in an `x-user-id` header, with public and internal APIs mixed together. I’m validating how deep that goes across session, recipient, admin, and feedback routes before writing the review.
exec
/bin/zsh -lc "sed -n '1,260p' 'app/api/sessions/[id]/route.ts'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { trackEvent } from "@/lib/events";
import { mergeSessionToRecipient } from "@/lib/profiles";

interface GiftSession {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  status: string;
  gift_context: string | null;
  selected_product_id: string | null;
  selected_product_data: string | null;
  card_content: string | null;
  presentation_guide: string | null;
  delivery_preferences: string | null;
  feedback_token: string | null;
  recipient_feedback: string | null;
  created_at: string;
  updated_at: string;
exec
/bin/zsh -lc "sed -n '1,240p' app/api/recipients/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/admin/products/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,220p' app/api/users/me/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getUserRecipients, createRecipient } from "@/lib/profiles";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const recipients = getUserRecipients(userId);
  return NextResponse.json({
    recipients: recipients.map((r) => ({
      ...r,
      interests: r.interests ? JSON.parse(r.interests) : [],
      personality: r.personality ? JSON.parse(r.personality) : null,
      wishes: r.wishes ? JSON.parse(r.wishes) : [],
      avoids: r.avoids ? JSON.parse(r.avoids) : [],
      shared_memories: r.shared_memories ? JSON.parse(r.shared_memories) : [],
      inside_jokes: r.inside_jokes ? JSON.parse(r.inside_jokes) : [],
    })),
 succeeded in 0ms:
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(200, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "50", 10)));
  const category = url.searchParams.get("category");
  const priceTier = url.searchParams.get("price_tier");
  const store = url.searchParams.get("store");
  const enriched = url.searchParams.get("enriched");
  const q = url.searchParams.get("q");
 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getUserById, updateUserPreferences } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      preferences: user.preferences ? JSON.parse(user.preferences) : null,
    },
  });
exec
/bin/zsh -lc "sed -n '1,260p' 'app/api/recipients/[id]/route.ts'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getRecipient, updateRecipient, getRecipientHistory } from "@/lib/profiles";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const recipient = getRecipient(params.id);
  if (!recipient || recipient.user_id !== userId) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const history = getRecipientHistory(params.id);

  return NextResponse.json({
exec
/bin/zsh -lc "sed -n '1,260p' 'app/api/v1/gift/[id]/route.ts'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const session = db.prepare("SELECT * FROM gift_sessions WHERE id = ?").get(params.id) as Record<string, string | null> | undefined;

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      gift_context: session.gift_context ? JSON.parse(session.gift_context) : null,
      selected_product_data: session.selected_product_data ? JSON.parse(session.selected_product_data) : null,
codex
The code is confirming a pattern: the product story is ambitious, but the implementation is still MVP-grade infrastructure with weak trust boundaries and a lot of runtime coupling. I’m checking the frontend flow and test coverage now so the review stays balanced between engineering and user experience.
exec
/bin/zsh -lc "sed -n '1,260p' app/api/auth/google/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,280p' lib/google.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { googleId, email, name, picture } = body;

    if (!googleId) {
      return NextResponse.json({ error: "Missing googleId" }, { status: 400 });
    }

    const user = getOrCreateUser({
      sub: googleId,
      email,
 succeeded in 0ms:
import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";

let cachedAuth: OAuth2Client | null = null;

export function getGoogleAuth(): OAuth2Client {
  if (cachedAuth) return cachedAuth;

  const credPath = process.env.GOOGLE_CREDENTIALS_PATH!;
  const tokenPath = process.env.GOOGLE_TOKEN_PATH!;

  const creds = JSON.parse(readFileSync(credPath, "utf-8"));
  const { client_id, client_secret } = creds.installed;

  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost";
  const auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const token = JSON.parse(readFileSync(tokenPath, "utf-8"));
  auth.setCredentials(token);
exec
/bin/zsh -lc "sed -n '1,260p' app/api/occasions/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/contacts/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/analytics/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' lib/events.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
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

 succeeded in 0ms:
import { NextResponse } from "next/server";
import { getUpcomingOccasions } from "@/lib/occasions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  try {
    const occasions = await getUpcomingOccasions(days);
    return NextResponse.json({ occasions });
  } catch (error) {
    console.error("Occasions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch occasions", detail: String(error) },
      { status: 500 }
    );
  }
}
 succeeded in 0ms:
import { NextResponse } from "next/server";
import { searchContacts, getAllContacts } from "@/lib/occasions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  try {
    const contacts = query ? await searchContacts(query) : await getAllContacts();
    return NextResponse.json({ contacts, total: contacts.length });
  } catch (error) {
    console.error("Contacts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts", detail: String(error) },
      { status: 500 }
    );
  }
}
 succeeded in 0ms:
// ── Event Tracking ──────────────────────────────────────────────────
// Thin wrapper for the events table. Fire-and-forget instrumentation.

import { getDb } from "./db";

export type EventType =
  // Session lifecycle
  | "session.started"
  | "session.abandoned"
  | "session.completed"
  | "session.ordered"
  | "session.delivered"
  // Conversation
  | "chat.message_sent"
  | "chat.response_received"
  | "chat.suggested_reply_used"
  | "chat.voice_input"
  // Recommendations
  | "recs.requested"
  | "recs.displayed"
exec
/bin/zsh -lc "sed -n '1,320p' lib/analytics.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,340p' lib/occasions.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
// ── Analytics Aggregation ────────────────────────────────────────────
// Computed metrics from the events + gift_sessions + gift_history tables.

import { getDb } from "./db";

export function getSessionFunnel(startDate?: string, endDate?: string) {
  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];

  if (startDate) { conditions.push("created_at >= ?"); params.push(startDate); }
  if (endDate) { conditions.push("created_at <= ?"); params.push(endDate); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where}`).get(...params) as { c: number }).c;
  const completed = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} status IN ('completed','ordered','delivered')`).get(...params) as { c: number }).c;
  const ordered = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} status IN ('ordered','delivered')`).get(...params) as { c: number }).c;
  const delivered = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} status = 'delivered'`).get(...params) as { c: number }).c;
  const feedbackReceived = (db.prepare(`SELECT COUNT(*) as c FROM gift_sessions ${where ? where + " AND" : "WHERE"} recipient_feedback IS NOT NULL`).get(...params) as { c: number }).c;
 succeeded in 0ms:
import { getCalendarService, getPeopleService } from "./google";

export interface Contact {
  resourceName: string;
  name: string;
  birthday: { month: number; day: number; year?: number } | null;
  emails: string[];
  photo: string | null;
}

export interface CalendarOccasion {
  id: string;
  summary: string;
  date: string;
  isAllDay: boolean;
  calendarId: string;
}

export interface Occasion {
  type: "birthday" | "calendar_event";
exec
/bin/zsh -lc "sed -n '1,260p' lib/cards.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' lib/recipient-feedback.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/cards/generate/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/api/feedback/recipient/[token]/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
// ── Recipient Feedback Loop ──────────────────────────────────────────
// After marking a gift as "given", generate a shareable feedback link.
// Recipient submits a reaction, which feeds back into recommendations.

import { getDb } from "./db";
import { randomBytes, randomUUID } from "crypto";
import { updateRecipient, getRecipient } from "./profiles";
import { trackEvent } from "./events";

export interface RecipientFeedback {
  reaction: "loved_it" | "liked_it" | "meh" | "returned";
  whatTheyLiked?: string;
  note?: string;
}

export function createFeedbackToken(sessionId: string): string {
  const db = getDb();
  const token = randomBytes(16).toString("hex");

  db.prepare(
 succeeded in 0ms:
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
 succeeded in 0ms:
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
 exited 1 in 0ms:
zsh:1: no matches found: app/api/feedback/recipient/[token]/route.ts
exec
/bin/zsh -lc "sed -n '1,320p' 'app/gift/[sessionId]/page.tsx'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' 'app/api/feedback/recipient/[token]/route.ts'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,340p' 'app/gift/[sessionId]/card/page.tsx'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { validateFeedbackToken, submitFeedback } from "@/lib/recipient-feedback";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const data = validateFeedbackToken(params.token);
  if (!data) {
    return NextResponse.json(
      { error: "Invalid or expired feedback link" },
      { status: 404 }
    );
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
 succeeded in 0ms:
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVoiceMode, narrateRecommendations } from "@/lib/useVoice";
import {
  trackJustPickForMe,
  trackMarkedAsPurchased,
  trackRefineClicked,
  trackRecommendationsViewed,
  trackMessageSent,
  trackVoiceToggled,
  trackConversationComplete,
  trackBuyLinkClicked,
} from "@/lib/posthog";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
 succeeded in 0ms:
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CardPreview from "@/components/CardPreview";
import CardEditor from "@/components/CardEditor";
import PresentationGuide from "@/components/PresentationGuide";
import type { CardContent, PresentationGuide as PresentationGuideType } from "@/lib/cards";

type Step = "card" | "presentation" | "summary";

export default function CardPage({ params }: { params: { sessionId: string } }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("card");
  const [card, setCard] = useState<CardContent | null>(null);
  const [presentation, setPresentation] = useState<PresentationGuideType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);
exec
/bin/zsh -lc "sed -n '1,260p' app/dashboard/page.tsx" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' 'app/(marketing)/page.tsx'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' app/feedback/[token]/page.tsx" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Contact {
  resourceName: string;
  name: string;
  birthday: { month: number; day: number; year?: number } | null;
  emails: string[];
  photo: string | null;
}

interface Occasion {
  type: string;
  personName: string;
  date: string;
  daysUntil: number;
  source: string;
  contact?: Contact;
 exited 1 in 0ms:
zsh:1: no matches found: app/feedback/[token]/page.tsx
 succeeded in 0ms:
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trackLandingCTA, trackWaitlistSignup } from "@/lib/posthog";
import posthog from "posthog-js";

// ── Scroll depth tracker ───────────────────────────────────────────
function useScrollDepth() {
  const tracked = useRef(new Set<number>());

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !tracked.current.has(threshold)) {
exec
/bin/zsh -lc "sed -n '321,760p' 'app/gift/[sessionId]/page.tsx'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' lib/posthog.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' 'app/feedback/[token]/page.tsx'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-2 italic">This isn&apos;t a random suggestion — it&apos;s built from what you know about {r.name || "them"}.</p>
          </div>
        )}

        {/* From + Occasion + Budget row */}
        <div className="grid grid-cols-3 gap-2">
          {g.from && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">From</div>
              <div className="font-medium text-sm mt-0.5">{g.from}</div>
            </div>
          )}
          {o.type && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
 succeeded in 0ms:
"use client";

import { useState, useEffect } from "react";

interface FeedbackData {
  sessionId: string;
  recipientName: string | null;
  productName: string | null;
  productImage: string | null;
}

const REACTIONS = [
  { value: "loved_it", emoji: "😍", label: "Loved it!" },
  { value: "liked_it", emoji: "😊", label: "Liked it" },
  { value: "meh", emoji: "😐", label: "It was okay" },
  { value: "returned", emoji: "🔄", label: "Not for me" },
];

export default function FeedbackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<FeedbackData | null>(null);
 succeeded in 0ms:
// ── PostHog Client-Side Analytics ────────────────────────────────────
// Provides detailed behavioral tracking: session recording, heatmaps,
// custom events, and user identification. Server-side events (lib/events.ts)
// track the data layer; this tracks the UX layer.

import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined" || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",

    // Session recording — full behavioral replay
exec
/bin/zsh -lc "sed -n '1,320p' e2e/gift-flow.spec.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { test, expect } from "@playwright/test";

// Helper: drive conversation to recommendations
async function driveToRecommendations(page: import("@playwright/test").Page) {
  await page.goto("/gift/new?name=Sarah&occasion=birthday");

  // Wait for first assistant response
  await expect(
    page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
  ).toBeVisible({ timeout: 15_000 });

  // Provide everything Claude needs in one dense message
  const input = page.getByPlaceholder("Type your reply...");
  await expect(input).toBeEnabled({ timeout: 15_000 });
  await input.fill(
    "She loves yoga, design, and coffee. We're close friends. Yoga direction, budget $100. I want to support her practice."
  );
  await page.locator('button[type="submit"]').click();

  // Adaptive loop: keep answering until profile card or recs appear
exec
/bin/zsh -lc 'rg --files e2e test | sort' in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
e2e/gift-flow.spec.ts
e2e/ux-quality.spec.ts
test/archive/100-scenarios.ts
test/archive/personas.json
test/archive/recent-transcripts.md
test/archive/run-100.ts
test/archive/run-personas.ts
test/archive/score-baseline.json
test/multi-turn-harness.ts
test/multi-turn-results.json
test/multi-turn-transcripts.md
test/realistic-personas.json
test/score-harness.ts
test/score-latest.json
exec
/bin/zsh -lc "rg -n \"fetch\\(|/api/\" 'app/gift/[sessionId]/page.tsx' 'app/gift/[sessionId]/card/page.tsx' app/dashboard/page.tsx 'app/(marketing)/page.tsx' components lib/useVoice.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
lib/useVoice.ts:97:          const res = await fetch("/api/voice/stt", { method: "POST", body: formData });
lib/useVoice.ts:196:      const res = await fetch("/api/voice/tts", {
app/(marketing)/page.tsx:83:      const res = await fetch("/api/waitlist", {
app/dashboard/page.tsx:46:    fetch("/api/occasions?days=90")
app/dashboard/page.tsx:55:      fetch("/api/recipients", { headers: { "x-user-id": userId } })
app/dashboard/page.tsx:70:      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`);
app/gift/[sessionId]/page.tsx:445:  fetch("/api/feedback", {
app/gift/[sessionId]/page.tsx:540:    fetch("/api/sessions", {
app/gift/[sessionId]/page.tsx:554:    fetch(`/api/sessions/${dbSessionId}`, {
app/gift/[sessionId]/page.tsx:606:      const res = await fetch("/api/chat", {
app/gift/[sessionId]/page.tsx:685:      const res = await fetch("/api/recommend", {
app/gift/[sessionId]/card/page.tsx:44:    fetch("/api/cards/generate", {
app/gift/[sessionId]/card/page.tsx:213:                    await fetch(`/api/sessions/${params.sessionId}`, {
app/gift/[sessionId]/card/page.tsx:276:                    await fetch(`/api/sessions/${params.sessionId}`, {
exec
/bin/zsh -lc "sed -n '1,260p' test/multi-turn-harness.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,320p' e2e/ux-quality.spec.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "sed -n '1,260p' test/score-harness.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
#!/usr/bin/env npx tsx
// ── Multi-Turn Conversation Quality Harness ────────────────────────
// Simulates realistic back-and-forth conversations with the AI,
// then fetches recommendations, and scores the full journey.
//
// Usage: npx tsx test/multi-turn-harness.ts [--base-url http://localhost:3000]

import * as fs from "fs";

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3000";

// ── Types ──────────────────────────────────────────────────────────

interface PersonaTurn {
  message: string;
  intent: string;
  expect_ai: string;
}
 succeeded in 0ms:
import { test, expect, Page } from "@playwright/test";

// ── Helper: drive conversation to Gift Profile Card and Recommendations ──
async function driveToRecommendations(page: Page) {
  await page.goto("/gift/new?name=Sarah&occasion=birthday");

  // Wait for first assistant response (white bubble)
  await expect(
    page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
  ).toBeVisible({ timeout: 30_000 });

  // Send a dense context message to get to completion quickly
  const input = page.getByPlaceholder("Type your reply...");
  await expect(input).toBeEnabled({ timeout: 15_000 });
  await input.fill(
    "She loves yoga and coffee. Close friend. Under $100. Support her wellness practice."
  );
  await page.locator('button[type="submit"]').click();

  // Adaptive loop: keep answering until profile card or recs appear
 succeeded in 0ms:
#!/usr/bin/env npx tsx
// ── Automated Quality Scoring Harness ──────────────────────────────
// Runs personas through the API, scores each dimension, outputs a report.
// Usage: npx tsx test/score-harness.ts [--base-url http://localhost:3000]

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3000";

// ── Test scenarios (subset of personas for speed) ──────────────────

const scenarios = [
  {
    id: "yoga_mom",
    chat: "Gift for my partner Lisa, Mother's Day. She loves yoga, design, and reading. Budget around $150 CAD. The wellness direction feels right.",
    expectedBudget: { min: 90, max: 165 },
    expectedInterests: ["yoga", "design", "reading", "wellness"],
    expectedRelationship: "partner",
  },
  {
exec
/bin/zsh -lc "sed -n '1,220p' next.config.mjs" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // better-sqlite3 is a native module — must be external
    serverComponentsExternalPackages: ["better-sqlite3"],

    // Persist data directory across builds
    outputFileTracingIncludes: {
      "/**": ["./data/**"],
    },
  },
};

export default nextConfig;
exec
/bin/zsh -lc "sed -n '1,260p' .env.local" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
GEMINI_API_KEY=AIzaSyBghihUC3FVFym_rgP3AiVNS5MESaFUhwo
ANTHROPIC_API_KEY=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
exec
/bin/zsh -lc "sed -n '1,220p' .env.example" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
# ── Present Agent Environment Variables ─────────────────────────────

# Gemini (conversation AI)
GEMINI_API_KEY=

# Anthropic (recommendation engine)
ANTHROPIC_API_KEY=

# Google OAuth (calendar + contacts integration)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google

# PostHog (client-side analytics + session recording)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
codex
I’ve got enough to start shaping the critique, but I’m checking a few details that matter for severity: whether secrets are tracked, whether the card flow leaks personal data in URLs, and how much of the learning loop is heuristic versus measured.
exec
/bin/zsh -lc "git ls-files .env.local .env.example README.md package.json 'app/api/sessions/[id]/route.ts' 'app/api/v1/gift/[id]/route.ts' 'app/api/auth/google/route.ts' lib/admin-auth.ts lib/google.ts lib/posthog.ts lib/recommend.ts app/api/contacts/route.ts app/api/occasions/route.ts app/api/analytics/route.ts 'app/gift/[sessionId]/card/page.tsx' 'app/gift/[sessionId]/page.tsx'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-yIcx1Kft' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-PpXHboUj' (errno=Operation not permitted)
.env.example
README.md
app/api/analytics/route.ts
app/api/auth/google/route.ts
app/api/contacts/route.ts
app/api/occasions/route.ts
app/api/sessions/[id]/route.ts
app/api/v1/gift/[id]/route.ts
app/gift/[sessionId]/card/page.tsx
app/gift/[sessionId]/page.tsx
lib/admin-auth.ts
lib/google.ts
lib/posthog.ts
lib/recommend.ts
package.json
exec
/bin/zsh -lc "nl -ba 'app/api/v1/gift/[id]/route.ts' | sed -n '1,180p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba lib/google.ts | sed -n '1,200p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { google } from "googleapis";
     2	import { readFileSync, writeFileSync } from "fs";
     3	import { OAuth2Client } from "google-auth-library";
     4	
     5	let cachedAuth: OAuth2Client | null = null;
     6	
     7	export function getGoogleAuth(): OAuth2Client {
     8	  if (cachedAuth) return cachedAuth;
     9	
    10	  const credPath = process.env.GOOGLE_CREDENTIALS_PATH!;
    11	  const tokenPath = process.env.GOOGLE_TOKEN_PATH!;
    12	
    13	  const creds = JSON.parse(readFileSync(credPath, "utf-8"));
    14	  const { client_id, client_secret } = creds.installed;
    15	
    16	  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost";
    17	  const auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    18	
    19	  const token = JSON.parse(readFileSync(tokenPath, "utf-8"));
    20	  auth.setCredentials(token);
 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getDb } from "@/lib/db";
     3	
     4	export async function GET(
     5	  request: Request,
     6	  { params }: { params: { id: string } }
     7	) {
     8	  const db = getDb();
     9	  const session = db.prepare("SELECT * FROM gift_sessions WHERE id = ?").get(params.id) as Record<string, string | null> | undefined;
    10	
    11	  if (!session) {
    12	    return NextResponse.json({ error: "Session not found" }, { status: 404 });
    13	  }
    14	
    15	  return NextResponse.json({
    16	    session: {
    17	      id: session.id,
    18	      status: session.status,
    19	      gift_context: session.gift_context ? JSON.parse(session.gift_context) : null,
    20	      selected_product_data: session.selected_product_data ? JSON.parse(session.selected_product_data) : null,
exec
/bin/zsh -lc "nl -ba lib/admin-auth.ts | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	// ── Admin Authentication Middleware ─────────────────────────────────
     2	// Validates that the requesting user is an admin before allowing access
     3	// to admin endpoints. For MVP: checks x-user-id header + admin flag in DB.
     4	
     5	import { getUserById } from "./auth";
     6	
     7	const ADMIN_EMAILS = new Set([
     8	  // Add admin emails here
     9	  process.env.ADMIN_EMAIL,
    10	].filter(Boolean));
    11	
    12	/**
    13	 * Checks if the request has valid admin credentials.
    14	 * Returns { ok: true, userId } or { ok: false, status, error }.
    15	 */
    16	export function requireAdmin(request: Request):
    17	  | { ok: true; userId: string }
    18	  | { ok: false; status: number; error: string } {
    19	  // Skip auth in development for local admin access
    20	  if (process.env.NODE_ENV === "development") {
exec
/bin/zsh -lc "nl -ba 'app/api/auth/google/route.ts' | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getOrCreateUser } from "@/lib/auth";
     3	
     4	export async function POST(request: Request) {
     5	  try {
     6	    let body;
     7	    try {
     8	      body = await request.json();
     9	    } catch {
    10	      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    11	    }
    12	    const { googleId, email, name, picture } = body;
    13	
    14	    if (!googleId) {
    15	      return NextResponse.json({ error: "Missing googleId" }, { status: 400 });
    16	    }
    17	
    18	    const user = getOrCreateUser({
    19	      sub: googleId,
    20	      email,
exec
/bin/zsh -lc "nl -ba app/api/occasions/route.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getUpcomingOccasions } from "@/lib/occasions";
     3	
     4	export async function GET(request: Request) {
     5	  const { searchParams } = new URL(request.url);
     6	  const days = parseInt(searchParams.get("days") || "90");
     7	
     8	  try {
     9	    const occasions = await getUpcomingOccasions(days);
    10	    return NextResponse.json({ occasions });
    11	  } catch (error) {
    12	    console.error("Occasions fetch error:", error);
    13	    return NextResponse.json(
    14	      { error: "Failed to fetch occasions", detail: String(error) },
    15	      { status: 500 }
    16	    );
    17	  }
    18	}
exec
/bin/zsh -lc "nl -ba app/api/contacts/route.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { searchContacts, getAllContacts } from "@/lib/occasions";
     3	
     4	export async function GET(request: Request) {
     5	  const { searchParams } = new URL(request.url);
     6	  const query = searchParams.get("q");
     7	
     8	  try {
     9	    const contacts = query ? await searchContacts(query) : await getAllContacts();
    10	    return NextResponse.json({ contacts, total: contacts.length });
    11	  } catch (error) {
    12	    console.error("Contacts fetch error:", error);
    13	    return NextResponse.json(
    14	      { error: "Failed to fetch contacts", detail: String(error) },
    15	      { status: 500 }
    16	    );
    17	  }
    18	}
exec
/bin/zsh -lc "nl -ba 'app/api/sessions/[id]/route.ts' | sed -n '1,220p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getDb } from "@/lib/db";
     3	import { trackEvent } from "@/lib/events";
     4	import { mergeSessionToRecipient } from "@/lib/profiles";
     5	
     6	interface GiftSession {
     7	  id: string;
     8	  user_id: string | null;
     9	  recipient_id: string | null;
    10	  status: string;
    11	  gift_context: string | null;
    12	  selected_product_id: string | null;
    13	  selected_product_data: string | null;
    14	  card_content: string | null;
    15	  presentation_guide: string | null;
    16	  delivery_preferences: string | null;
    17	  feedback_token: string | null;
    18	  recipient_feedback: string | null;
    19	  created_at: string;
    20	  updated_at: string;
exec
/bin/zsh -lc "nl -ba app/api/analytics/route.ts | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba lib/posthog.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba 'app/gift/[sessionId]/page.tsx' | sed -n '760,840p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import {
     3	  getSessionFunnel,
     4	  getConversationMetrics,
     5	  getRecommendationAccuracy,
     6	  getRecipientSatisfaction,
     7	  getTimeToGift,
     8	} from "@/lib/analytics";
     9	
    10	export async function GET() {
    11	  try {
    12	    const [funnel, conversation, recommendations, satisfaction, timeToGift] =
    13	      await Promise.all([
    14	        getSessionFunnel(),
    15	        getConversationMetrics(),
    16	        getRecommendationAccuracy(),
    17	        getRecipientSatisfaction(),
    18	        getTimeToGift(),
    19	      ]);
    20	
 succeeded in 0ms:
     1	// ── PostHog Client-Side Analytics ────────────────────────────────────
     2	// Provides detailed behavioral tracking: session recording, heatmaps,
     3	// custom events, and user identification. Server-side events (lib/events.ts)
     4	// track the data layer; this tracks the UX layer.
     5	
     6	import posthog from "posthog-js";
     7	
     8	export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
     9	export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    10	
    11	let initialized = false;
    12	
    13	export function initPostHog() {
    14	  if (initialized || typeof window === "undefined" || !POSTHOG_KEY) return;
    15	
    16	  posthog.init(POSTHOG_KEY, {
    17	    api_host: POSTHOG_HOST,
    18	    person_profiles: "identified_only",
    19	
    20	    // Session recording — full behavioral replay
 succeeded in 0ms:
   760	    const ctx = encodeURIComponent(JSON.stringify(context));
   761	    const params = new URLSearchParams();
   762	    params.set("product", product);
   763	    params.set("context", ctx);
   764	    if (recipientId) params.set("recipientId", recipientId);
   765	    if (userId) params.set("userId", userId);
   766	    router.push(`${pathname}/card?${params.toString()}`);
   767	  }
   768	
   769	  // Handle "Just Pick For Me" — auto-select top pick, go straight to card
   770	  async function handleJustPickForMe() {
   771	    if (recommendations.length === 0) return;
   772	    setJustPickLoading(true);
   773	    const topPick = recommendations[0];
   774	    trackJustPickForMe(sessionIdRef.current, topPick.id);
   775	    handleProductSelected(topPick.id, 0);
   776	    // Short delay for visual feedback then navigate
   777	    setTimeout(() => {
   778	      goToCardPage(topPick);
   779	      setJustPickLoading(false);
exec
/bin/zsh -lc "nl -ba 'app/gift/[sessionId]/page.tsx' | sed -n '680,760p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
   680	
   681	  async function fetchRecommendations() {
   682	    setIsLoadingRecs(true);
   683	    setRecsError(false);
   684	    try {
   685	      const res = await fetch("/api/recommend", {
   686	        method: "POST",
   687	        headers: { "Content-Type": "application/json" },
   688	        body: JSON.stringify({ context, userId, sessionId: dbSessionId || sessionIdRef.current, recipientId }),
   689	      });
   690	      const data = await res.json();
   691	      if (data.error) {
   692	        setRecsError(true);
   693	        setIsLoadingRecs(false);
   694	        return;
   695	      }
   696	      if (data.recommendations) {
   697	        setRecommendations(data.recommendations);
   698	        setRecsShownAt(Date.now());
   699	
exec
/bin/zsh -lc "nl -ba 'app/gift/[sessionId]/card/page.tsx' | sed -n '240,320p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba 'app/gift/[sessionId]/card/page.tsx' | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba lib/recommend.ts | sed -n '140,260p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba lib/recommend.ts | sed -n '320,520p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
   240	        {purchased && card && product && (
   241	          <>
   242	            <div className="text-center mb-4">
   243	              <p className="text-4xl mb-2">🎉</p>
   244	              <h2 className="font-semibold text-lg">
   245	                {recipientName ? `Great gift for ${recipientName}!` : "Great gift choice!"}
   246	              </h2>
   247	              <p className="text-sm text-gray-500 mt-1">
   248	                {product.name} by {product.brand}
   249	              </p>
   250	            </div>
   251	
   252	            {/* Card message to include */}
   253	            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
   254	              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Your card message</div>
   255	              <p className="text-sm text-gray-700 italic">&ldquo;{card.message}&rdquo;</p>
   256	              <button
   257	                onClick={() => {
   258	                  navigator.clipboard?.writeText(card.message);
   259	                  setCopied(true);
 succeeded in 0ms:
     1	"use client";
     2	
     3	import { useState, useEffect } from "react";
     4	import { useSearchParams } from "next/navigation";
     5	import CardPreview from "@/components/CardPreview";
     6	import CardEditor from "@/components/CardEditor";
     7	import PresentationGuide from "@/components/PresentationGuide";
     8	import type { CardContent, PresentationGuide as PresentationGuideType } from "@/lib/cards";
     9	
    10	type Step = "card" | "presentation" | "summary";
    11	
    12	export default function CardPage({ params }: { params: { sessionId: string } }) {
    13	  const searchParams = useSearchParams();
    14	  const [step, setStep] = useState<Step>("card");
    15	  const [card, setCard] = useState<CardContent | null>(null);
    16	  const [presentation, setPresentation] = useState<PresentationGuideType | null>(null);
    17	  const [loading, setLoading] = useState(true);
    18	  const [error, setError] = useState<string | null>(null);
    19	  const [purchased, setPurchased] = useState(false);
    20	  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);
 succeeded in 0ms:
   140	  }
   141	  // Fallback: use the first word
   142	  return lower.split(" ")[0];
   143	}
   144	
   145	// ── DB-powered prefilter ─────────────────────────────────────────────
   146	
   147	function parseBudgetRange(budget: string | undefined): { min: number; max: number } | null {
   148	  if (!budget) return null;
   149	  const nums = budget.match(/\d+/g)?.map(Number) || [];
   150	  if (nums.length === 0) return null;
   151	
   152	  // Handle "up to $X", "under $X", "max $X", "at most $X"
   153	  const lower = budget.toLowerCase();
   154	  if (/\b(up\s+to|under|max|at\s+most|less\s+than|no\s+more\s+than)\b/.test(lower) && nums.length >= 1) {
   155	    return { min: 0, max: nums[nums.length - 1] };
   156	  }
   157	
   158	  // Handle "at least $X", "over $X", "more than $X", "minimum $X"
   159	  if (/\b(at\s+least|over|more\s+than|minimum|above)\b/.test(lower) && nums.length >= 1) {
 succeeded in 0ms:
   320	}
   321	
   322	// ── Main recommendation function ─────────────────────────────────────
   323	
   324	export async function getRecommendations(context: GiftContext, recipientId?: string, userId?: string): Promise<Recommendation[]> {
   325	  let candidates = prefilterCatalog(context);
   326	
   327	  // Apply recipient history: exclude products and avoided categories
   328	  if (recipientId) {
   329	    try {
   330	      const history = getRecipientHistory(recipientId);
   331	      const avoidProductIds = new Set(
   332	        history
   333	          .filter(h => h.recipient_reaction === "meh" || h.recipient_reaction === "returned")
   334	          .map(h => h.product_id)
   335	          .filter(Boolean) as string[]
   336	      );
   337	      // Also get avoided categories from recipient profile
   338	      const { getRecipient } = await import("./profiles");
   339	      const recipient = getRecipient(recipientId);
exec
/bin/zsh -lc "nl -ba lib/feedback.ts | sed -n '220,320p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba lib/feedback.ts | sed -n '100,180p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba app/api/feedback/route.ts | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
   220	  const slotPicks = [0, 0, 0]; // count of picks per slot
   221	
   222	  for (const session of sessions) {
   223	    const scores = session.qualityScores ?? computeQualityScores(session)!;
   224	
   225	    // Track which slot the user picked
   226	    if (session.implicit.selectedSlot !== null) {
   227	      slotPicks[session.implicit.selectedSlot]++;
   228	    }
   229	
   230	    // Track category performance
   231	    for (const rec of session.recommendations) {
   232	      if (!categoryCounts[rec.category]) categoryCounts[rec.category] = { picks: 0, total: 0, satisfaction: 0 };
   233	      categoryCounts[rec.category].total++;
   234	      if (session.implicit.selectedProductId === rec.productId) {
   235	        categoryCounts[rec.category].picks++;
   236	        categoryCounts[rec.category].satisfaction += scores.userSatisfaction;
   237	      }
   238	    }
   239	
 succeeded in 0ms:
   100	    recommendationRelevance: number;    // 0-1: based on selection + reactions
   101	    userSatisfaction: number;           // 0-1: composite of explicit signals
   102	    overallSessionQuality: number;      // 0-1: weighted composite
   103	  };
   104	}
   105	
   106	// ── Storage ──────────────────────────────────────────────────────
   107	
   108	const FEEDBACK_DIR = join(process.cwd(), "data", "feedback");
   109	
   110	export function saveFeedback(feedback: SessionFeedback): void {
   111	  mkdirSync(FEEDBACK_DIR, { recursive: true });
   112	
   113	  // Save individual session
   114	  const filename = `${feedback.sessionId}.json`;
   115	  writeFileSync(join(FEEDBACK_DIR, filename), JSON.stringify(feedback, null, 2));
   116	
   117	  // Append to daily log (for batch analysis)
   118	  const dateStr = new Date().toISOString().slice(0, 10);
   119	  const logFile = join(FEEDBACK_DIR, `log-${dateStr}.jsonl`);
 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { saveFeedback, computeQualityScores, SessionFeedback } from "@/lib/feedback";
     3	
     4	export async function POST(request: Request) {
     5	  try {
     6	    const body = await request.json();
     7	    const { type, sessionId, data } = body;
     8	
     9	    if (!sessionId) {
    10	      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    11	    }
    12	
    13	    switch (type) {
    14	      // Capture implicit signals (sent automatically by the UI)
    15	      case "implicit": {
    16	        const feedback: SessionFeedback = {
    17	          sessionId,
    18	          userId: data.userId,
    19	          timestamp: new Date().toISOString(),
    20	          recipientName: data.recipientName,
exec
/bin/zsh -lc "nl -ba '.env.example' | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	# ── Present Agent Environment Variables ─────────────────────────────
     2	
     3	# Gemini (conversation AI)
     4	GEMINI_API_KEY=
     5	
     6	# Anthropic (recommendation engine)
     7	ANTHROPIC_API_KEY=
     8	
     9	# Google OAuth (calendar + contacts integration)
    10	GOOGLE_CLIENT_ID=
    11	GOOGLE_CLIENT_SECRET=
    12	GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google
    13	
    14	# PostHog (client-side analytics + session recording)
    15	NEXT_PUBLIC_POSTHOG_KEY=
    16	NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
    17	
    18	# App
    19	NEXT_PUBLIC_APP_URL=http://localhost:3000
    20	NODE_ENV=development
exec
/bin/zsh -lc "nl -ba app/api/recommend/route.ts | sed -n '1,160p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getRecommendations } from "@/lib/recommend";
     3	import { trackEvent } from "@/lib/events";
     4	import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";
     5	import { safeErrorMessage } from "@/lib/sanitize";
     6	
     7	export async function POST(request: Request) {
     8	  try {
     9	    const { context, sessionId, userId, recipientId } = await request.json();
    10	
    11	    if (!context) {
    12	      return NextResponse.json(
    13	        { error: "Missing gift context" },
    14	        { status: 400 }
    15	      );
    16	    }
    17	
    18	    // Rate limit check
    19	    const ip = getClientIp(request);
    20	    const rl = checkRateLimit(`recommend:${ip}`, LLM_RATE_LIMIT);
exec
/bin/zsh -lc "nl -ba app/api/chat/route.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba app/api/chat/route.ts | sed -n '120,260p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
   120	  recipient?: { name?: string; relationship?: string; interests?: string[] };
   121	  occasion?: { type?: string; date?: string };
   122	  gift?: { budget?: string; direction?: string };
   123	  [key: string]: unknown;
   124	}
   125	
   126	export async function POST(request: Request) {
   127	  try {
   128	    let body;
   129	    try {
   130	      body = await request.json();
   131	    } catch {
   132	      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
   133	    }
   134	
   135	    const {
   136	      message,
   137	      history = [],
   138	      recipientContext = {} as RecipientContext,
   139	      accumulatedContext = null as AccumulatedContext | null,
 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { GoogleGenerativeAI } from "@google/generative-ai";
     3	import { buildRecipientBrief } from "@/lib/profiles";
     4	import { trackEvent } from "@/lib/events";
     5	import { sanitizeForPrompt } from "@/lib/sanitize";
     6	import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";
     7	import { safeErrorMessage } from "@/lib/sanitize";
     8	
     9	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    10	
    11	const SYSTEM_PROMPT = `You are a gift-giving thinking partner. You help people feel confident about gift decisions through warm, fast conversation.
    12	
    13	## Today
    14	Date: {{DATE}}
    15	Locale: en-CA (Canada)
    16	Common upcoming occasions: Mother's Day = May 11, Father's Day = June 15
    17	
    18	## Your personality
    19	- Warm but CONCISE — max 2 sentences per response
    20	- Acknowledge what they share with a brief reflection ("A design lover and yoga person — great combo")
exec
/bin/zsh -lc "nl -ba app/api/cards/generate/route.ts | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { generateCard, generatePresentationGuide } from "@/lib/cards";
     3	import { getRecipient } from "@/lib/profiles";
     4	import { trackEvent } from "@/lib/events";
     5	import { checkRateLimit, getClientIp, LLM_RATE_LIMIT } from "@/lib/rate-limit";
     6	import { safeErrorMessage } from "@/lib/sanitize";
     7	
     8	export async function POST(request: Request) {
     9	  try {
    10	    const { context, recipientId, product, sessionId, userId } = await request.json();
    11	
    12	    if (!context || !product) {
    13	      return NextResponse.json(
    14	        { error: "Missing context or product" },
    15	        { status: 400 }
    16	      );
    17	    }
    18	
    19	    // Rate limit check
    20	    const ip = getClientIp(request);
codex
I’m at the synthesis stage now. One more pass on testing and data/runtime structure, then I’ll produce the markdown review with concrete file references and clear product-level implications.
exec
/bin/zsh -lc "nl -ba package.json | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	{
     2	  "name": "present-agent",
     3	  "version": "0.1.0",
     4	  "private": true,
     5	  "scripts": {
     6	    "dev": "next dev",
     7	    "build": "next build",
     8	    "start": "next start",
     9	    "lint": "next lint",
    10	    "db:seed": "tsx scripts/seed-existing.ts",
    11	    "db:import-shopify": "tsx scripts/import-shopify.ts",
    12	    "db:enrich": "tsx scripts/enrich-products.ts",
    13	    "db:stats": "tsx scripts/db-stats.ts",
    14	    "db:quality": "tsx scripts/data-quality.ts",
    15	    "db:quality:dry": "tsx scripts/data-quality.ts --dry-run",
    16	    "db:quality:llm": "tsx scripts/data-quality.ts --llm-audit",
    17	    "crawl": "tsx scripts/crawl-stores.ts",
    18	    "enrich:quick": "tsx scripts/enrich-batch-quick.ts"
    19	  },
    20	  "dependencies": {
exec
/bin/zsh -lc "nl -ba lib/db.ts | sed -n '1,180p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	// ── SQLite Database Layer for Product Catalog ────────────────────────
     2	// Uses better-sqlite3 for synchronous, fast access to the product catalog.
     3	// Database file: data/catalog.db (relative to project root)
     4	
     5	import Database from "better-sqlite3";
     6	import path from "path";
     7	import fs from "fs";
     8	
     9	const DB_PATH = path.join(process.cwd(), "data", "catalog.db");
    10	
    11	let _db: Database.Database | null = null;
    12	
    13	export interface DbProduct {
    14	  id: string;
    15	  name: string;
    16	  brand: string;
    17	  price: number;
    18	  currency: string;
    19	  category: string;
    20	  image_url: string | null;
exec
/bin/zsh -lc "nl -ba e2e/ux-quality.spec.ts | sed -n '1,220p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba e2e/gift-flow.spec.ts | sed -n '1,280p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { test, expect, Page } from "@playwright/test";
     2	
     3	// ── Helper: drive conversation to Gift Profile Card and Recommendations ──
     4	async function driveToRecommendations(page: Page) {
     5	  await page.goto("/gift/new?name=Sarah&occasion=birthday");
     6	
     7	  // Wait for first assistant response (white bubble)
     8	  await expect(
     9	    page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
    10	  ).toBeVisible({ timeout: 30_000 });
    11	
    12	  // Send a dense context message to get to completion quickly
    13	  const input = page.getByPlaceholder("Type your reply...");
    14	  await expect(input).toBeEnabled({ timeout: 15_000 });
    15	  await input.fill(
    16	    "She loves yoga and coffee. Close friend. Under $100. Support her wellness practice."
    17	  );
    18	  await page.locator('button[type="submit"]').click();
    19	
    20	  // Adaptive loop: keep answering until profile card or recs appear
 succeeded in 0ms:
     1	import { test, expect } from "@playwright/test";
     2	
     3	// Helper: drive conversation to recommendations
     4	async function driveToRecommendations(page: import("@playwright/test").Page) {
     5	  await page.goto("/gift/new?name=Sarah&occasion=birthday");
     6	
     7	  // Wait for first assistant response
     8	  await expect(
     9	    page.locator('[class*="bg-white border border-gray-100 rounded"]').first()
    10	  ).toBeVisible({ timeout: 15_000 });
    11	
    12	  // Provide everything Claude needs in one dense message
    13	  const input = page.getByPlaceholder("Type your reply...");
    14	  await expect(input).toBeEnabled({ timeout: 15_000 });
    15	  await input.fill(
    16	    "She loves yoga, design, and coffee. We're close friends. Yoga direction, budget $100. I want to support her practice."
    17	  );
    18	  await page.locator('button[type="submit"]').click();
    19	
    20	  // Adaptive loop: keep answering until profile card or recs appear
exec
/bin/zsh -lc "nl -ba app/api/events/route.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { trackEvent, type EventType } from "@/lib/events";
     3	
     4	export async function POST(request: Request) {
     5	  try {
     6	    const { sessionId, userId, eventType, eventData } = await request.json();
     7	
     8	    if (!eventType) {
     9	      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    10	    }
    11	
    12	    trackEvent(sessionId || null, userId || null, eventType as EventType, eventData);
    13	    return NextResponse.json({ ok: true });
    14	  } catch (error) {
    15	    return NextResponse.json(
    16	      { error: "Event tracking failed", detail: String(error) },
    17	      { status: 500 }
    18	    );
    19	  }
    20	}
exec
/bin/zsh -lc "nl -ba '.env.local' | sed -n '1,40p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	GEMINI_API_KEY=AIzaSyBghihUC3FVFym_rgP3AiVNS5MESaFUhwo
     2	ANTHROPIC_API_KEY=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
exec
/bin/zsh -lc "sed -n '1,220p' app/api/events/route.ts" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba README.md | sed -n '1,220p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
import { NextResponse } from "next/server";
import { trackEvent, type EventType } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const { sessionId, userId, eventType, eventData } = await request.json();

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    trackEvent(sessionId || null, userId || null, eventType as EventType, eventData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Event tracking failed", detail: String(error) },
      { status: 500 }
    );
  }
}
 succeeded in 0ms:
     1	# Present Agent v2
     2	
     3	An AI-powered gifting assistant designed for ADHD adults. Conversational chat builds a recipient profile in 2-3 turns, then delivers 3 psychology-informed gift recommendations with AI-generated cards and presentation guides.
     4	
     5	## Architecture
     6	
     7	```
     8	Chat (Gemini Flash) → Gift Profile → SQLite Catalog (171K products) → Claude Sonnet Scoring → 3-Card Display → AI Card + Presentation Guide → Purchase → Recipient Feedback → Learning Loop
     9	```
    10	
    11	| Layer | Tech |
    12	|-------|------|
    13	| Frontend | Next.js 14, Tailwind CSS, React 18 |
    14	| Chat | Gemini 2.5 Flash (fast conversational flow) |
    15	| Recommendations | Claude Sonnet (nuanced matching, 3-slot strategy) |
    16	| Cards | Claude Sonnet (personalized messages + presentation guides) |
    17	| Catalog | SQLite (better-sqlite3), 171K enriched products |
    18	| Voice STT | Web Speech API + Whisper fallback |
    19	| Voice TTS | OpenAI TTS (server-side) |
    20	| Auth | Google OAuth (profiles, calendar, contacts) |
exec
/bin/zsh -lc "nl -ba app/api/recipients/route.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3exec
/bin/zsh -lc "nl -ba 'app/api/recipients/[id]/route.ts' | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getUserRecipients, createRecipient } from "@/lib/profiles";
     3	
     4	export async function GET(request: Request) {
     5	  const userId = request.headers.get("x-user-id");
     6	  if (!userId) {
     7	    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
     8	  }
     9	
    10	  const recipients = getUserRecipients(userId);
    11	  return NextResponse.json({
    12	    recipients: recipients.map((r) => ({
    13	      ...r,
    14	      interests: r.interests ? JSON.parse(r.interests) : [],
    15	      personality: r.personality ? JSON.parse(r.personality) : null,
    16	      wishes: r.wishes ? JSON.parse(r.wishes) : [],
    17	      avoids: r.avoids ? JSON.parse(r.avoids) : [],
    18	      shared_memories: r.shared_memories ? JSON.parse(r.shared_memories) : [],
    19	      inside_jokes: r.inside_jokes ? JSON.parse(r.inside_jokes) : [],
    20	    })),
 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getRecipient, updateRecipient, getRecipientHistory } from "@/lib/profiles";
     3	
     4	export async function GET(
     5	  request: Request,
     6	  { params }: { params: { id: string } }
     7	) {
     8	  const userId = request.headers.get("x-user-id");
     9	  if (!userId) {
    10	    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    11	  }
    12	
    13	  const recipient = getRecipient(params.id);
    14	  if (!recipient || recipient.user_id !== userId) {
    15	    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    16	  }
    17	
    18	  const history = getRecipientHistory(params.id);
    19	
    20	  return NextResponse.json({
exec
/bin/zsh -lc "nl -ba app/api/v1/gift/route.ts | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getRecommendations, type GiftContext } from "@/lib/recommend";
     3	import { getDb } from "@/lib/db";
     4	import { randomUUID } from "crypto";
     5	import { trackEvent } from "@/lib/events";
     6	
     7	export async function POST(request: Request) {
     8	  try {
     9	    const body = await request.json();
    10	    const { recipient, relationship, occasion, budget, interests, userId } = body;
    11	
    12	    if (!recipient) {
    13	      return NextResponse.json({ error: "recipient is required" }, { status: 400 });
    14	    }
    15	
    16	    const context: GiftContext = {
    17	      recipient: {
    18	        name: recipient,
    19	        relationship,
    20	        interests: interests ? (Array.isArray(interests) ? interests : interests.split(",").map((s: string) => s.trim())) : undefined,
exec
/bin/zsh -lc "nl -ba app/api/users/me/route.ts | sed -n '1,120p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getUserById, updateUserPreferences } from "@/lib/auth";
     3	
     4	export async function GET(request: Request) {
     5	  const userId = request.headers.get("x-user-id");
     6	  if (!userId) {
     7	    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
     8	  }
     9	
    10	  const user = getUserById(userId);
    11	  if (!user) {
    12	    return NextResponse.json({ error: "User not found" }, { status: 404 });
    13	  }
    14	
    15	  return NextResponse.json({
    16	    user: {
    17	      ...user,
    18	      preferences: user.preferences ? JSON.parse(user.preferences) : null,
    19	    },
    20	  });
exec
/bin/zsh -lc "nl -ba app/api/feedback/recipient/[token]/route.ts | sed -n '1,140p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
zsh:1: no matches found: app/api/feedback/recipient/[token]/route.ts
exec
/bin/zsh -lc "nl -ba app/api/voice/stt/route.ts | sed -n '1,180p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getOpenAIClient } from "@/lib/models";
     3	import { checkRateLimit, getClientIp, VOICE_RATE_LIMIT } from "@/lib/rate-limit";
     4	import { safeErrorMessage } from "@/lib/sanitize";
     5	
     6	export async function POST(request: Request) {
     7	  try {
     8	    const formData = await request.formData();
     9	    const audioFile = formData.get("audio") as File;
    10	
    11	    if (!audioFile) {
    12	      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    13	    }
    14	
    15	    // Rate limit check
    16	    const ip = getClientIp(request);
    17	    const rl = checkRateLimit(`stt:${ip}`, VOICE_RATE_LIMIT);
    18	    if (!rl.allowed) {
    19	      return NextResponse.json(
    20	        { error: "Too many requests. Please wait a moment." },
exec
/bin/zsh -lc "nl -ba app/api/voice/tts/route.ts | sed -n '1,180p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	import { NextResponse } from "next/server";
     2	import { getOpenAIClient } from "@/lib/models";
     3	import { checkRateLimit, getClientIp, VOICE_RATE_LIMIT } from "@/lib/rate-limit";
     4	import { safeErrorMessage } from "@/lib/sanitize";
     5	
     6	export async function POST(request: Request) {
     7	  try {
     8	    const { text, voice = "nova" } = await request.json();
     9	
    10	    if (!text) {
    11	      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    12	    }
    13	
    14	    // Rate limit check
    15	    const ip = getClientIp(request);
    16	    const rl = checkRateLimit(`tts:${ip}`, VOICE_RATE_LIMIT);
    17	    if (!rl.allowed) {
    18	      return NextResponse.json(
    19	        { error: "Too many requests. Please wait a moment." },
    20	        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
exec
/bin/zsh -lc "nl -ba lib/recipient-feedback.ts | sed -n '1,180p'" in /Volumes/SSD/1_Projects/Apps/Present Agent - Multiple Prototypes/present-agent3 succeeded in 0ms:
     1	// ── Recipient Feedback Loop ──────────────────────────────────────────
     2	// After marking a gift as "given", generate a shareable feedback link.
     3	// Recipient submits a reaction, which feeds back into recommendations.
     4	
     5	import { getDb } from "./db";
     6	import { randomBytes, randomUUID } from "crypto";
     7	import { updateRecipient, getRecipient } from "./profiles";
     8	import { trackEvent } from "./events";
     9	
    10	export interface RecipientFeedback {
    11	  reaction: "loved_it" | "liked_it" | "meh" | "returned";
    12	  whatTheyLiked?: string;
    13	  note?: string;
    14	}
    15	
    16	export function createFeedbackToken(sessionId: string): string {
    17	  const db = getDb();
    18	  const token = randomBytes(16).toString("hex");
    19	
    20	  db.prepare(
codex
# Present Agent v3 Review

## Overall Verdict
Present Agent is a strong **prototype concept** and a weak **production system**. The product insight is real: ADHD users benefit from constrained choice, conversational extraction, and emotionally framed recommendations. But the current implementation is still MVP-grade in ways that materially affect trust, privacy, reliability, and defensibility.

## Critical Findings
- **The trust model is fundamentally broken.** `/api/auth/google` creates or updates a user from raw client-supplied `googleId`, `email`, `name`, and `picture` without verifying an OAuth code or ID token, and most “authenticated” routes trust an `x-user-id` header as identity. That means identity can be forged by any caller. [app/api/auth/google/route.ts:12](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/auth/google/route.ts#L12) [lib/admin-auth.ts:16](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/admin-auth.ts#L16) [app/api/users/me/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/users/me/route.ts#L4) [app/api/recipients/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/recipients/route.ts#L4)
- **Private session data is exposed and mutable without authorization.** Session GET/PATCH endpoints return and update gift context, selected product, card content, presentation guide, and feedback tokens by session ID alone. The public v1 session endpoint does the same. [app/api/sessions/[id]/route.ts:24](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/sessions/%5Bid%5D/route.ts#L24) [app/api/sessions/[id]/route.ts:50](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/sessions/%5Bid%5D/route.ts#L50) [app/api/v1/gift/[id]/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/v1/gift/%5Bid%5D/route.ts#L4)
- **Google contacts/calendar access is effectively shared server access, not per-user access.** `/api/contacts` and `/api/occasions` are public, while `lib/google.ts` loads a single server-side token file and reuses it for everyone. That is a major privacy boundary failure. [app/api/contacts/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/contacts/route.ts#L4) [app/api/occasions/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/occasions/route.ts#L4) [lib/google.ts:7](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/google.ts#L7)
- **Sensitive user data is over-collected and under-protected.** The app stores full chat transcripts and recommendation logs, records session replays with `maskAllInputs: false`, and passes full context plus `userId` through the URL when navigating to the card page. That is hard to defend for a gifting app handling relationships, memories, and preferences. [app/api/chat/route.ts:233](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/chat/route.ts#L233) [app/api/recommend/route.ts:41](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/recommend/route.ts#L41) [lib/posthog.ts:20](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/posthog.ts#L20) [app/gift/[sessionId]/page.tsx:749](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/gift/%5BsessionId%5D/page.tsx#L749) [app/gift/[sessionId]/card/page.tsx:24](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/gift/%5BsessionId%5D/card/page.tsx#L24)
- **The “learning loop” is mostly heuristic, not a real recommendation moat.** Feedback is stored as JSON files on disk and scanned synchronously; scores are hand-tuned proxies; the recommender relies on text `LIKE` filters, random sampling, and an LLM prompt rather than a durable ranking system. This is clever, but not robust or defensible. [lib/feedback.ts:108](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/feedback.ts#L108) [lib/feedback.ts:131](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/feedback.ts#L131) [lib/feedback.ts:147](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/feedback.ts#L147) [lib/recommend.ts:170](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L170) [lib/recommend.ts:397](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L397)

## Architecture
- The architecture is admirably simple for a prototype: Next.js app routes, SQLite, direct model calls, and a single-process deployment shape. That keeps iteration fast. [README.md:5](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L5) [lib/db.ts:50](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/db.ts#L50)
- The downside is that routing, persistence, analytics, prompt construction, and business rules are tightly coupled. `getDb()` also creates schema at runtime, so there is no migration discipline, no service boundary, and little operational separation. [lib/db.ts:46](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/db.ts#L46)
- Documentation/setup quality is uneven: README says Google OAuth and persistent auth, but the actual code uses header-based identity and different Google env vars than `.env.example` documents. [README.md:20](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L20) [README.md:143](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L143) [.env.example:9](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/.env.example#L9) [lib/google.ts:10](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/google.ts#L10)

## Security
- Security is the weakest part of the codebase. The current build should not be exposed to real users without reworking auth, authorization, secret handling, and privacy defaults.
- Event ingestion and analytics are also open, so metrics can be polluted or scraped by anyone. [app/api/events/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/events/route.ts#L4) [app/api/analytics/route.ts:10](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/analytics/route.ts#L10)
- Operationally, the workspace currently contains raw API keys in `.env.local`. I did not verify whether they are active, but that is still a serious hygiene issue. [.env.local:1](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/.env.local#L1)

## UX
- The UX direction is strong: bounded choice, short conversational turns, “what this gift says,” and “Just Pick For Me” are all well aligned with ADHD decision fatigue. [README.md:24](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L24)
- The experience is also more opinionated than most gift apps, which is good. The profile card and recommendation explanations are better than generic affiliate-list UX.
- The weakness is flow length and trust burden. The landing page promises “Find a gift in 3 minutes,” but the real path is chat → profile → recommendations → card generation → presentation guide → summary → purchase → feedback. For ADHD adults, that is still a lot of step transitions and model wait time. [app/(marketing)/page.tsx:110](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/%28marketing%29/page.tsx#L110) [app/gift/[sessionId]/card/page.tsx:109](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/gift/%5BsessionId%5D/card/page.tsx#L109)

## Recommendation Engine
- The engine has a sensible shape for an MVP: deterministic prefiltering, then LLM reranking and explanation generation. That is better than pure free-form generation.
- But the candidate generation is shallow. `LIKE` over JSON-ish text fields and `ORDER BY RANDOM()` will miss semantic matches, create unstable outputs, and make quality hard to reproduce at scale. [lib/recommend.ts:193](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L193) [lib/recommend.ts:251](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L251)
- The learning loop is overstated in product terms. Adding a product category to `interests` or `avoids` after feedback is not yet real personalization; it is rule accumulation. [lib/recipient-feedback.ts:119](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recipient-feedback.ts#L119)

## Testing
- Testing coverage is thin for the app’s risk profile. There is no `test` script in `package.json`; most validation lives in two Playwright suites and some ad hoc harnesses. [package.json:5](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/package.json#L5)
- The current tests are not very deterministic because they depend on live LLM behavior, long timeouts, and adaptive retry loops instead of mocked model responses and golden datasets. [e2e/gift-flow.spec.ts:3](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/e2e/gift-flow.spec.ts#L3) [e2e/ux-quality.spec.ts:3](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/e2e/ux-quality.spec.ts#L3)
- There is almost no evidence of unit tests around budget parsing, auth, data ownership, or feedback integrity, which are exactly where the expensive bugs will live.

## Competitive Position
- The product is differentiated against generic shopping assistants because it focuses on **confidence**, **recipient meaning**, and **ADHD-friendly narrowing**, not just search.
- It is weak against serious competitors on trust primitives: inventory freshness, shipping certainty, authenticated identity, checkout integration, and privacy posture.
- The moat is currently thin. A comparable multi-model gift recommender is easy to copy; the real moat would have to come from proprietary outcome data, longitudinal recipient memory, and consistently better recommendation quality. The current implementation does not yet prove that.

## Top 5 Improvements
1. Replace header-based identity with verified auth sessions, and require authorization on every user, session, analytics, and Google-data route.
2. Split public APIs from private user APIs, and remove the shared server Google token model entirely.
3. Rebuild the recommender as deterministic retrieval + constrained reranking + DB-backed outcome learning, not JSON-file heuristics.
4. Remove sensitive context from URLs and session replays; minimize transcript retention and tighten analytics collection by default.
5. Add deterministic tests: mocked LLM adapters, fixture catalogs, auth/ownership tests, and offline recommendation eval suites.

## Key Risks
- **Privacy/compliance risk:** relationship details, memories, preferences, contacts, and transcripts are handled too loosely.
- **Trust risk:** one bad recommendation is survivable; one privacy breach is not.
- **Quality risk:** random candidate selection plus live-model variability will make outcomes inconsistent.
- **Operational risk:** SQLite plus synchronous local file feedback storage is fine for one box, not for a real multi-user product.
- **Business risk:** if the recommendation advantage is mostly prompt engineering, larger platforms can copy the surface quickly.

## Assumptions
- This review is based on the local `present-agent3` workspace, not a running production deployment.
- `.env.local` is present in the workspace but does not appear to be tracked by git; the security concern is operational exposure, not necessarily committed leakage.
tokens used
175,561
# Present Agent v3 Review

## Overall Verdict
Present Agent is a strong **prototype concept** and a weak **production system**. The product insight is real: ADHD users benefit from constrained choice, conversational extraction, and emotionally framed recommendations. But the current implementation is still MVP-grade in ways that materially affect trust, privacy, reliability, and defensibility.

## Critical Findings
- **The trust model is fundamentally broken.** `/api/auth/google` creates or updates a user from raw client-supplied `googleId`, `email`, `name`, and `picture` without verifying an OAuth code or ID token, and most “authenticated” routes trust an `x-user-id` header as identity. That means identity can be forged by any caller. [app/api/auth/google/route.ts:12](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/auth/google/route.ts#L12) [lib/admin-auth.ts:16](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/admin-auth.ts#L16) [app/api/users/me/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/users/me/route.ts#L4) [app/api/recipients/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/recipients/route.ts#L4)
- **Private session data is exposed and mutable without authorization.** Session GET/PATCH endpoints return and update gift context, selected product, card content, presentation guide, and feedback tokens by session ID alone. The public v1 session endpoint does the same. [app/api/sessions/[id]/route.ts:24](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/sessions/%5Bid%5D/route.ts#L24) [app/api/sessions/[id]/route.ts:50](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/sessions/%5Bid%5D/route.ts#L50) [app/api/v1/gift/[id]/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/v1/gift/%5Bid%5D/route.ts#L4)
- **Google contacts/calendar access is effectively shared server access, not per-user access.** `/api/contacts` and `/api/occasions` are public, while `lib/google.ts` loads a single server-side token file and reuses it for everyone. That is a major privacy boundary failure. [app/api/contacts/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/contacts/route.ts#L4) [app/api/occasions/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/occasions/route.ts#L4) [lib/google.ts:7](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/google.ts#L7)
- **Sensitive user data is over-collected and under-protected.** The app stores full chat transcripts and recommendation logs, records session replays with `maskAllInputs: false`, and passes full context plus `userId` through the URL when navigating to the card page. That is hard to defend for a gifting app handling relationships, memories, and preferences. [app/api/chat/route.ts:233](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/chat/route.ts#L233) [app/api/recommend/route.ts:41](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/recommend/route.ts#L41) [lib/posthog.ts:20](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/posthog.ts#L20) [app/gift/[sessionId]/page.tsx:749](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/gift/%5BsessionId%5D/page.tsx#L749) [app/gift/[sessionId]/card/page.tsx:24](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/gift/%5BsessionId%5D/card/page.tsx#L24)
- **The “learning loop” is mostly heuristic, not a real recommendation moat.** Feedback is stored as JSON files on disk and scanned synchronously; scores are hand-tuned proxies; the recommender relies on text `LIKE` filters, random sampling, and an LLM prompt rather than a durable ranking system. This is clever, but not robust or defensible. [lib/feedback.ts:108](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/feedback.ts#L108) [lib/feedback.ts:131](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/feedback.ts#L131) [lib/feedback.ts:147](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/feedback.ts#L147) [lib/recommend.ts:170](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L170) [lib/recommend.ts:397](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L397)

## Architecture
- The architecture is admirably simple for a prototype: Next.js app routes, SQLite, direct model calls, and a single-process deployment shape. That keeps iteration fast. [README.md:5](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L5) [lib/db.ts:50](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/db.ts#L50)
- The downside is that routing, persistence, analytics, prompt construction, and business rules are tightly coupled. `getDb()` also creates schema at runtime, so there is no migration discipline, no service boundary, and little operational separation. [lib/db.ts:46](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/db.ts#L46)
- Documentation/setup quality is uneven: README says Google OAuth and persistent auth, but the actual code uses header-based identity and different Google env vars than `.env.example` documents. [README.md:20](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L20) [README.md:143](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L143) [.env.example:9](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/.env.example#L9) [lib/google.ts:10](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/google.ts#L10)

## Security
- Security is the weakest part of the codebase. The current build should not be exposed to real users without reworking auth, authorization, secret handling, and privacy defaults.
- Event ingestion and analytics are also open, so metrics can be polluted or scraped by anyone. [app/api/events/route.ts:4](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/events/route.ts#L4) [app/api/analytics/route.ts:10](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/api/analytics/route.ts#L10)
- Operationally, the workspace currently contains raw API keys in `.env.local`. I did not verify whether they are active, but that is still a serious hygiene issue. [.env.local:1](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/.env.local#L1)

## UX
- The UX direction is strong: bounded choice, short conversational turns, “what this gift says,” and “Just Pick For Me” are all well aligned with ADHD decision fatigue. [README.md:24](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/README.md#L24)
- The experience is also more opinionated than most gift apps, which is good. The profile card and recommendation explanations are better than generic affiliate-list UX.
- The weakness is flow length and trust burden. The landing page promises “Find a gift in 3 minutes,” but the real path is chat → profile → recommendations → card generation → presentation guide → summary → purchase → feedback. For ADHD adults, that is still a lot of step transitions and model wait time. [app/(marketing)/page.tsx:110](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/%28marketing%29/page.tsx#L110) [app/gift/[sessionId]/card/page.tsx:109](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/app/gift/%5BsessionId%5D/card/page.tsx#L109)

## Recommendation Engine
- The engine has a sensible shape for an MVP: deterministic prefiltering, then LLM reranking and explanation generation. That is better than pure free-form generation.
- But the candidate generation is shallow. `LIKE` over JSON-ish text fields and `ORDER BY RANDOM()` will miss semantic matches, create unstable outputs, and make quality hard to reproduce at scale. [lib/recommend.ts:193](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L193) [lib/recommend.ts:251](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recommend.ts#L251)
- The learning loop is overstated in product terms. Adding a product category to `interests` or `avoids` after feedback is not yet real personalization; it is rule accumulation. [lib/recipient-feedback.ts:119](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/lib/recipient-feedback.ts#L119)

## Testing
- Testing coverage is thin for the app’s risk profile. There is no `test` script in `package.json`; most validation lives in two Playwright suites and some ad hoc harnesses. [package.json:5](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/package.json#L5)
- The current tests are not very deterministic because they depend on live LLM behavior, long timeouts, and adaptive retry loops instead of mocked model responses and golden datasets. [e2e/gift-flow.spec.ts:3](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/e2e/gift-flow.spec.ts#L3) [e2e/ux-quality.spec.ts:3](/Volumes/SSD/1_Projects/Apps/Present%20Agent%20-%20Multiple%20Prototypes/present-agent3/e2e/ux-quality.spec.ts#L3)
- There is almost no evidence of unit tests around budget parsing, auth, data ownership, or feedback integrity, which are exactly where the expensive bugs will live.

## Competitive Position
- The product is differentiated against generic shopping assistants because it focuses on **confidence**, **recipient meaning**, and **ADHD-friendly narrowing**, not just search.
- It is weak against serious competitors on trust primitives: inventory freshness, shipping certainty, authenticated identity, checkout integration, and privacy posture.
- The moat is currently thin. A comparable multi-model gift recommender is easy to copy; the real moat would have to come from proprietary outcome data, longitudinal recipient memory, and consistently better recommendation quality. The current implementation does not yet prove that.

## Top 5 Improvements
1. Replace header-based identity with verified auth sessions, and require authorization on every user, session, analytics, and Google-data route.
2. Split public APIs from private user APIs, and remove the shared server Google token model entirely.
3. Rebuild the recommender as deterministic retrieval + constrained reranking + DB-backed outcome learning, not JSON-file heuristics.
4. Remove sensitive context from URLs and session replays; minimize transcript retention and tighten analytics collection by default.
5. Add deterministic tests: mocked LLM adapters, fixture catalogs, auth/ownership tests, and offline recommendation eval suites.

## Key Risks
- **Privacy/compliance risk:** relationship details, memories, preferences, contacts, and transcripts are handled too loosely.
- **Trust risk:** one bad recommendation is survivable; one privacy breach is not.
- **Quality risk:** random candidate selection plus live-model variability will make outcomes inconsistent.
- **Operational risk:** SQLite plus synchronous local file feedback storage is fine for one box, not for a real multi-user product.
- **Business risk:** if the recommendation advantage is mostly prompt engineering, larger platforms can copy the surface quickly.

## Assumptions
- This review is based on the local `present-agent3` workspace, not a running production deployment.
- `.env.local` is present in the workspace but does not appear to be tracked by git; the security concern is operational exposure, not necessarily committed leakage.
