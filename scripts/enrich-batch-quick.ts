#!/usr/bin/env tsx
// ── Quick Batch Enrichment with Gemini Flash ────────────────────────
// Enriches unenriched products in batches of 10 using Gemini 2.0 Flash.
// Falls back to Claude Sonnet if ANTHROPIC_API_KEY is set and no GEMINI_API_KEY.
//
// Usage:
//   GEMINI_API_KEY=xxx npx tsx scripts/enrich-batch-quick.ts
//   GEMINI_API_KEY=xxx npx tsx scripts/enrich-batch-quick.ts --limit=500
//   ANTHROPIC_API_KEY=xxx npx tsx scripts/enrich-batch-quick.ts  # fallback

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  getUnenrichedProducts,
  updateEnrichment,
  getCatalogStats,
  type DbProduct,
} from "../lib/db";

// ── Config ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "0") || Infinity;
const WORKERS = parseInt(args.find(a => a.startsWith("--workers="))?.split("=")[1] || "10");
const BATCH_SIZE = 10;

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ── Enrichment types ────────────────────────────────────────────────

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

// ── Prompt ───────────────────────────────────────────────────────────

const CATEGORIES = ["practical", "experiential", "consumable", "artisan", "wellness", "kids"];
const PSYCH_FIT = ["practical", "thoughtful", "playful", "luxurious", "sentimental", "adventurous"];
const REL_FIT = ["partner", "parent", "child", "close_family", "friend", "professional", "acquaintance"];
const AGE_RANGES = ["0-2", "3-5", "6-11", "12-17", "18-25", "26-40", "41-60", "61+"];
const OCCASIONS = ["birthday", "mothers_day", "fathers_day", "anniversary", "thank_you", "housewarming", "wedding", "graduation", "retirement", "christmas", "valentines", "just_because", "baby_shower", "new_baby"];
const EFFORT = ["low_effort", "moderate_effort", "high_effort"];

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
- price_tier: token(<$25 CAD), budget($25-50), moderate($50-100), premium($100-200), luxury($200+). MUST match product price.
- is_last_minute: false for physical, true for digital/instant
- usage_signal: ONE vivid sentence about how recipient uses it. Be specific, not generic.
- what_this_says: "This says: '[emotional message about the giver's intent]'"

PRODUCTS:
${JSON.stringify(slim)}

OUTPUT: Return ONLY a JSON array of ${slim.length} objects. No explanation, no markdown fences. Each object must have exactly these keys: id, category, psychological_fit, relationship_fit, recipient_traits, recipient_age, occasion_fit, effort_signal, price_tier, is_last_minute, usage_signal, what_this_says.`;
}

// ── Parse response ──────────────────────────────────────────────────

function parseResponse(text: string): EnrichmentResult[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

// ── Gemini enrichment ───────────────────────────────────────────────

let geminiModel: any = null;

function initGemini() {
  if (!GEMINI_KEY) return false;
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });
  return true;
}

async function enrichWithGemini(batch: DbProduct[]): Promise<EnrichmentResult[]> {
  const result = await geminiModel.generateContent(buildPrompt(batch));
  return parseResponse(result.response.text());
}

// ── Claude fallback ─────────────────────────────────────────────────

let anthropicClient: any = null;

async function initAnthropic() {
  if (!ANTHROPIC_KEY) return false;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  anthropicClient = new Anthropic();
  return true;
}

async function enrichWithClaude(batch: DbProduct[]): Promise<EnrichmentResult[]> {
  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: buildPrompt(batch) }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return parseResponse(text);
}

// ── Worker ───────────────────────────────────────────────────────────

type EnrichFn = (batch: DbProduct[]) => Promise<EnrichmentResult[]>;

async function enrichBatch(
  fn: EnrichFn,
  batch: DbProduct[],
  batchId: number,
  retries = 2,
): Promise<{ success: number; failed: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const enrichments = await fn(batch);
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
        } catch { /* skip bad record */ }
      }

      return { success, failed: batch.length - success };
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RATE_LIMIT")) {
        const wait = Math.pow(2, attempt + 1) * 2000;
        console.log(`    Batch ${batchId}: rate limited, waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (attempt === retries) {
        console.error(`    Batch ${batchId} failed: ${(err?.message || "").slice(0, 200)}`);
        return { success: 0, failed: batch.length };
      }
      // Retry on other transient errors
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return { success: 0, failed: batch.length };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Quick Batch Enrichment ===\n");

  // Init model
  let enrichFn: EnrichFn;
  let modelName: string;

  if (GEMINI_KEY && initGemini()) {
    enrichFn = enrichWithGemini;
    modelName = "gemini-2.0-flash";
    console.log("  Model: Gemini 2.0 Flash");
  } else if (ANTHROPIC_KEY && (await initAnthropic())) {
    enrichFn = enrichWithClaude;
    modelName = "claude-sonnet";
    console.log("  Model: Claude Sonnet (fallback)");
  } else {
    console.error("  No API key found. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.");
    console.error("  Get free Gemini key: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const stats = getCatalogStats();
  const toEnrich = Math.min(stats.unenriched, LIMIT);

  if (toEnrich === 0) {
    console.log("  All products already enriched!");
    return;
  }

  console.log(`  To enrich: ${toEnrich} | Workers: ${WORKERS} | Batch size: ${BATCH_SIZE}`);
  console.log(`  Estimated batches: ${Math.ceil(toEnrich / BATCH_SIZE)}\n`);

  let totalSuccess = 0;
  let totalFailed = 0;
  let round = 0;
  const startTime = Date.now();

  while (totalSuccess + totalFailed < toEnrich) {
    round++;
    const remaining = toEnrich - totalSuccess - totalFailed;
    const fetchSize = Math.min(remaining, WORKERS * BATCH_SIZE);
    const products = getUnenrichedProducts(fetchSize);
    if (products.length === 0) break;

    // Split into batches
    const batches: DbProduct[][] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    // Process concurrently
    const results = await Promise.all(
      batches.map((batch, i) => enrichBatch(enrichFn, batch, round * 100 + i))
    );

    const roundSuccess = results.reduce((s, r) => s + r.success, 0);
    const roundFailed = results.reduce((s, r) => s + r.failed, 0);
    totalSuccess += roundSuccess;
    totalFailed += roundFailed;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = totalSuccess > 0 ? (totalSuccess / ((Date.now() - startTime) / 60000)).toFixed(0) : "0";

    console.log(
      `  Round ${round}: +${roundSuccess} ok, ${roundFailed} err | ` +
      `Total: ${totalSuccess}/${toEnrich} (${(totalSuccess / toEnrich * 100).toFixed(1)}%) | ` +
      `${elapsed}s | ${rate}/min`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n  Done! ${totalSuccess} enriched, ${totalFailed} failed in ${elapsed} minutes.`);

  const finalStats = getCatalogStats();
  console.log(`\n  Final catalog: ${finalStats.enriched} enriched / ${finalStats.total} total`);
  console.log(`  By category:`, finalStats.byCategory);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
