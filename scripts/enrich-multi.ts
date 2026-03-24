#!/usr/bin/env tsx
// ── Multi-Model Concurrent Enrichment ────────────────────────────────
// Uses Gemini Flash (free), Claude Sonnet, and OpenAI in parallel.
// Structured JSON schema reduces errors across all models.
//
// Usage:
//   GEMINI_API_KEY=xxx npx tsx scripts/enrich-multi.ts
//   GEMINI_API_KEY=xxx ANTHROPIC_API_KEY=xxx npx tsx scripts/enrich-multi.ts
//   npx tsx scripts/enrich-multi.ts --limit=5000 --workers=20

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import OpenAI from "openai";
import { getDb, getUnenrichedProducts, updateEnrichment, getCatalogStats, type DbProduct } from "../lib/db";

// ── Config ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "0") || Infinity;
const WORKERS = parseInt(args.find(a => a.startsWith("--workers="))?.split("=")[1] || "15");
const BATCH_SIZE = 20; // smaller batches = fewer parse errors

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ── Enrichment Schema (shared across models) ─────────────────────────

const CATEGORIES = ["practical", "experiential", "consumable", "artisan", "wellness", "kids"] as const;
const PSYCH_FIT = ["practical", "thoughtful", "playful", "luxurious", "sentimental", "adventurous"] as const;
const REL_FIT = ["partner", "parent", "child", "close_family", "friend", "professional", "acquaintance"] as const;
const AGE_RANGES = ["0-2", "3-5", "6-11", "12-17", "18-25", "26-40", "41-60", "61+"] as const;
const OCCASIONS = ["birthday", "mothers_day", "fathers_day", "anniversary", "thank_you", "housewarming", "wedding", "graduation", "retirement", "christmas", "valentines", "just_because", "baby_shower", "new_baby"] as const;
const EFFORT = ["low_effort", "moderate_effort", "high_effort"] as const;
const PRICE_TIERS = ["token", "budget", "moderate", "premium", "luxury"] as const;

// ── Structured prompt (model-agnostic) ───────────────────────────────

function buildPrompt(products: DbProduct[]): string {
  const slim = products.map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    desc: (p.short_description || "").slice(0, 120),
  }));

  return `You are enriching a gift product catalog. For each product, output a JSON object.

RULES:
- category: pick ONE from [${CATEGORIES.join(", ")}]
- psychological_fit: pick 1-3 from [${PSYCH_FIT.join(", ")}]
- relationship_fit: pick 2-4 from [${REL_FIT.join(", ")}]
- recipient_traits: 3-6 lowercase tags (e.g. "coffee", "outdoors", "minimalist")
- recipient_age: pick applicable from [${AGE_RANGES.join(", ")}]
- occasion_fit: pick 3-6 from [${OCCASIONS.join(", ")}]
- effort_signal: pick ONE from [${EFFORT.join(", ")}]
- price_tier: token(<$15), budget($15-50), moderate($50-100), premium($100-250), luxury($250+). MUST match product price.
- is_last_minute: false for physical, true for digital/instant
- usage_signal: ONE vivid sentence about how recipient uses it daily. Be specific, not generic.
- what_this_says: "This says: '[emotional message about the giver's intent]'"

PRODUCTS:
${JSON.stringify(slim)}

OUTPUT: Return ONLY a JSON array of ${slim.length} objects. No explanation, no markdown fences. Each object must have exactly these keys: id, category, psychological_fit, relationship_fit, recipient_traits, recipient_age, occasion_fit, effort_signal, price_tier, is_last_minute, usage_signal, what_this_says.`;
}

// ── Gemini JSON Schema for structured output ─────────────────────────

const geminiResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING },
      category: { type: SchemaType.STRING },
      psychological_fit: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      relationship_fit: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      recipient_traits: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      recipient_age: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      occasion_fit: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      effort_signal: { type: SchemaType.STRING },
      price_tier: { type: SchemaType.STRING },
      is_last_minute: { type: SchemaType.BOOLEAN },
      usage_signal: { type: SchemaType.STRING },
      what_this_says: { type: SchemaType.STRING },
    },
    required: ["id", "category", "psychological_fit", "relationship_fit", "recipient_traits",
               "recipient_age", "occasion_fit", "effort_signal", "price_tier", "is_last_minute",
               "usage_signal", "what_this_says"],
  },
};

// ── Parse response (tolerant) ────────────────────────────────────────

interface EnrichmentResult {
  id: string;
  category: string;
  psychological_fit: string[];
  relationship_fit: string[];
  recipient_traits: string[];
  recipient_age: string[];
  occasion_fit: string[];
  effort_signal: string;
  price_tier: string;
  is_last_minute: boolean;
  usage_signal: string;
  what_this_says: string;
}

function parseResponse(text: string): EnrichmentResult[] {
  let cleaned = text.trim();
  // Strip markdown fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  // Find JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

// ── Model: Gemini Flash ──────────────────────────────────────────────

let geminiModel: any = null;

function initGemini() {
  if (!GEMINI_KEY) return null;
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });
  return geminiModel;
}

async function enrichWithGemini(batch: DbProduct[]): Promise<EnrichmentResult[]> {
  if (!geminiModel) throw new Error("Gemini not initialized");
  const result = await geminiModel.generateContent(buildPrompt(batch));
  const text = result.response.text();
  return parseResponse(text);
}

// ── Model: Claude (if API key available) ─────────────────────────────

let anthropicClient: any = null;

async function initAnthropic() {
  if (!ANTHROPIC_KEY) return null;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  anthropicClient = new Anthropic();
  return anthropicClient;
}

async function enrichWithClaude(batch: DbProduct[]): Promise<EnrichmentResult[]> {
  if (!anthropicClient) throw new Error("Anthropic not initialized");
  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: buildPrompt(batch) }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseResponse(text);
}

// ── Model: OpenAI GPT-4o-mini ────────────────────────────────────────

let openaiClient: OpenAI | null = null;

function initOpenAI() {
  if (!OPENAI_KEY) return null;
  openaiClient = new OpenAI({ apiKey: OPENAI_KEY });
  return openaiClient;
}

async function enrichWithOpenAI(batch: DbProduct[]): Promise<EnrichmentResult[]> {
  if (!openaiClient) throw new Error("OpenAI not initialized");
  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You output valid JSON only. Return a JSON object with key \"items\" containing an array of enrichment objects." },
      { role: "user", content: buildPrompt(batch) + '\n\nReturn as: {"items": [...]}' },
    ],
  });
  const text = response.choices[0]?.message?.content || "";
  const parsed = JSON.parse(text);
  return parsed.items || parsed;
}

// ── Worker ───────────────────────────────────────────────────────────

type ModelFn = (batch: DbProduct[]) => Promise<EnrichmentResult[]>;

async function enrichBatch(
  modelFn: ModelFn,
  modelName: string,
  batch: DbProduct[],
  batchId: number,
  retries: number = 2,
): Promise<{ success: number; failed: number; model: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const enrichments = await modelFn(batch);
      const batchIds = new Set(batch.map(p => p.id));
      let success = 0;

      for (const e of enrichments) {
        if (!batchIds.has(e.id)) continue;
        try {
          updateEnrichment(e.id, {
            category: e.category,
            psychological_fit: JSON.stringify(e.psychological_fit),
            relationship_fit: JSON.stringify(e.relationship_fit),
            recipient_traits: JSON.stringify(e.recipient_traits),
            recipient_age: JSON.stringify(e.recipient_age),
            occasion_fit: JSON.stringify(e.occasion_fit),
            effort_signal: e.effort_signal,
            price_tier: e.price_tier,
            is_last_minute: e.is_last_minute ? 1 : 0,
            usage_signal: e.usage_signal,
            what_this_says: e.what_this_says,
          });
          success++;
        } catch { /* skip */ }
      }

      return { success, failed: batch.length - success, model: modelName };
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RATE_LIMIT")) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (attempt === retries) {
        console.error(`    [${modelName}] Batch ${batchId} failed: ${err?.message?.slice(0, 300) || JSON.stringify(err).slice(0, 300)}`);
        return { success: 0, failed: batch.length, model: modelName };
      }
    }
  }
  return { success: 0, failed: batch.length, model: "none" };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Multi-Model Enrichment Engine                       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Init models
  const models: { name: string; fn: ModelFn; weight: number }[] = [];

  if (GEMINI_KEY) {
    initGemini();
    models.push({ name: "gemini-flash", fn: enrichWithGemini, weight: 3 });
    console.log("  ✓ Gemini Flash initialized (free tier)");
  }
  if (ANTHROPIC_KEY) {
    await initAnthropic();
    models.push({ name: "claude-sonnet", fn: enrichWithClaude, weight: 1 });
    console.log("  ✓ Claude Sonnet initialized");
  }

  if (OPENAI_KEY) {
    initOpenAI();
    models.push({ name: "gpt-4o-mini", fn: enrichWithOpenAI, weight: 3 });
    console.log("  ✓ GPT-4o-mini initialized");
  }

  if (models.length === 0) {
    console.error("\n  ✗ No API keys found. Set GEMINI_API_KEY and/or ANTHROPIC_API_KEY");
    console.error("  Get free Gemini key: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const stats = getCatalogStats();
  const toEnrich = Math.min(stats.unenriched, LIMIT);
  console.log(`\n  Total: ${stats.total} | Enriched: ${stats.enriched} | To enrich: ${toEnrich}`);
  console.log(`  Workers: ${WORKERS} | Batch size: ${BATCH_SIZE} | Models: ${models.map(m => m.name).join(", ")}\n`);

  // Build weighted model assignment
  const modelPool: typeof models[0][] = [];
  for (const m of models) {
    for (let i = 0; i < m.weight; i++) modelPool.push(m);
  }

  let totalEnriched = 0;
  let totalFailed = 0;
  let round = 0;
  const startTime = Date.now();
  const modelStats: Record<string, { success: number; failed: number }> = {};
  for (const m of models) modelStats[m.name] = { success: 0, failed: 0 };

  while (totalEnriched + totalFailed < toEnrich) {
    round++;
    const remaining = toEnrich - totalEnriched - totalFailed;
    const fetchSize = Math.min(remaining, WORKERS * BATCH_SIZE);
    const products = getUnenrichedProducts(fetchSize);
    if (products.length === 0) break;

    // Split into batches and assign models round-robin from weighted pool
    const tasks: Promise<{ success: number; failed: number; model: string }>[] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const model = modelPool[(i / BATCH_SIZE) % modelPool.length];
      tasks.push(enrichBatch(model.fn, model.name, batch, round * 1000 + i / BATCH_SIZE));
    }

    const results = await Promise.all(tasks);

    let roundSuccess = 0;
    let roundFailed = 0;
    for (const r of results) {
      roundSuccess += r.success;
      roundFailed += r.failed;
      if (modelStats[r.model]) {
        modelStats[r.model].success += r.success;
        modelStats[r.model].failed += r.failed;
      }
    }
    totalEnriched += roundSuccess;
    totalFailed += roundFailed;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = totalEnriched > 0 ? (totalEnriched / ((Date.now() - startTime) / 60000)).toFixed(0) : "0";
    const eta = parseInt(rate) > 0 ? Math.ceil((toEnrich - totalEnriched - totalFailed) / parseInt(rate)) : "?";

    console.log(
      `  R${round}: +${roundSuccess} ok, ${roundFailed} err | ` +
      `${totalEnriched}/${toEnrich} (${(totalEnriched / toEnrich * 100).toFixed(1)}%) | ` +
      `${elapsed}s | ${rate}/min | ETA: ${eta}min`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n  Done! ${totalEnriched} enriched, ${totalFailed} failed in ${elapsed} minutes.`);
  console.log("  Per model:");
  for (const [name, s] of Object.entries(modelStats)) {
    console.log(`    ${name}: ${s.success} ok, ${s.failed} failed`);
  }

  const finalStats = getCatalogStats();
  console.log(`\n  Final: ${finalStats.enriched} enriched / ${finalStats.total} total`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
