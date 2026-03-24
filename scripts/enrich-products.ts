#!/usr/bin/env tsx
// ── LLM Concurrent Enrichment ────────────────────────────────────────
// Enriches products with gift intelligence using parallel Claude calls.
// Processes 50 batches of 25 products concurrently (~1,250 products/round).
// At ~4 rounds/min → ~5,000 products/min → 133K in ~27 minutes.
//
// Usage:
//   npx tsx scripts/enrich-products.ts              # full enrichment
//   npx tsx scripts/enrich-products.ts --limit=1000 # enrich N products
//   npx tsx scripts/enrich-products.ts --workers=20 # custom concurrency

import Anthropic from "@anthropic-ai/sdk";
import {
  getDb,
  getUnenrichedProducts,
  updateEnrichment,
  getCatalogStats,
  type DbProduct,
} from "../lib/db";

// ── Config ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "0") || Infinity;
const WORKERS = parseInt(args.find(a => a.startsWith("--workers="))?.split("=")[1] || "50");
const BATCH_SIZE = 25;
const MODEL = "claude-sonnet-4-20250514";

// ── Types ────────────────────────────────────────────────────────────

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

const SYSTEM_PROMPT = `You are a gift intelligence engine. You analyze products and generate metadata for a gift recommendation system. Be specific, opinionated, and warm. Avoid generic descriptions.`;

function buildUserPrompt(products: DbProduct[]): string {
  const slim = products.map(p => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    description: p.short_description?.slice(0, 150) || "none",
    store: p.source_store,
  }));

  return `Enrich these ${slim.length} products with gift intelligence metadata.

Products:
${JSON.stringify(slim)}

For each product return a JSON object with:
- id (pass through)
- category: "practical"|"experiential"|"consumable"|"artisan"|"wellness"|"kids"
- psychological_fit: subset of ["practical","thoughtful","playful","luxurious","sentimental","adventurous"]
- relationship_fit: subset of ["partner","parent","child","close_family","friend","professional","acquaintance"]
- recipient_traits: 3-8 tags like "coffee","outdoors","minimalist"
- recipient_age: from ["0-2","3-5","6-11","12-17","18-25","26-40","41-60","61+"]
- occasion_fit: from ["birthday","mothers_day","fathers_day","anniversary","thank_you","housewarming","wedding","graduation","retirement","christmas","valentines","just_because","baby_shower","new_baby"]
- effort_signal: "low_effort"|"moderate_effort"|"high_effort"
- price_tier: "token"(<$15)|"budget"($15-50)|"moderate"($50-100)|"premium"($100-250)|"luxury"($250+) — derive from the product price
- is_last_minute: boolean
- usage_signal: vivid one-liner, e.g. "She'll reach for this every morning while the coffee brews"
- what_this_says: e.g. "This says: 'I notice the little things that make you happy'"

Return ONLY a JSON array. No markdown fences, no explanation.`;
}

// ── Parse ────────────────────────────────────────────────────────────

function parseResponse(text: string): EnrichmentResult[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  // Find the JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

// ── Worker ───────────────────────────────────────────────────────────

async function enrichBatch(
  client: Anthropic,
  batch: DbProduct[],
  batchId: number,
): Promise<{ success: number; failed: number }> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(batch) }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let enrichments: EnrichmentResult[];
    try {
      enrichments = parseResponse(text);
    } catch (parseErr: any) {
      console.error(`    Batch ${batchId} parse error: ${parseErr.message}`);
      console.error(`    Response preview: ${text.slice(0, 200)}`);
      return { success: 0, failed: batch.length };
    }
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
      } catch (upsertErr: any) {
        console.error(`    Upsert error for ${e.id}: ${upsertErr.message}`);
      }
    }

    return { success, failed: batch.length - success };
  } catch (err: any) {
    // Rate limit — back off
    if (err?.status === 429) {
      console.log(`    Batch ${batchId}: rate limited, retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      return enrichBatch(client, batch, batchId); // retry
    }
    console.error(`    Batch ${batchId} error [${err?.status || 'unknown'}]: ${err?.message || JSON.stringify(err).slice(0, 200)}`);
    return { success: 0, failed: batch.length };
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     LLM Enrichment — Concurrent Workers                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const stats = getCatalogStats();
  const toEnrich = Math.min(stats.unenriched, LIMIT);
  console.log(`  Total: ${stats.total} | Enriched: ${stats.enriched} | To enrich: ${toEnrich}`);
  console.log(`  Workers: ${WORKERS} | Batch size: ${BATCH_SIZE} | Products/round: ${WORKERS * BATCH_SIZE}`);
  console.log(`  Estimated time: ~${Math.ceil(toEnrich / (WORKERS * BATCH_SIZE) * 0.25)} minutes\n`);

  const client = new Anthropic();
  let totalEnriched = 0;
  let totalFailed = 0;
  let round = 0;
  const startTime = Date.now();

  while (totalEnriched + totalFailed < toEnrich) {
    round++;
    const remaining = toEnrich - totalEnriched - totalFailed;
    const fetchSize = Math.min(remaining, WORKERS * BATCH_SIZE);
    const products = getUnenrichedProducts(fetchSize);

    if (products.length === 0) break;

    // Split into batches
    const batches: DbProduct[][] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    // Process all batches concurrently
    const results = await Promise.all(
      batches.map((batch, i) => enrichBatch(client, batch, round * 1000 + i))
    );

    const roundSuccess = results.reduce((s, r) => s + r.success, 0);
    const roundFailed = results.reduce((s, r) => s + r.failed, 0);
    totalEnriched += roundSuccess;
    totalFailed += roundFailed;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = (totalEnriched / ((Date.now() - startTime) / 60000)).toFixed(0);
    const eta = rate !== "0" ? Math.ceil((toEnrich - totalEnriched) / parseInt(rate)) : "?";

    console.log(
      `  Round ${round}: +${roundSuccess} enriched, ${roundFailed} failed | ` +
      `Total: ${totalEnriched}/${toEnrich} (${(totalEnriched/toEnrich*100).toFixed(1)}%) | ` +
      `${elapsed}s elapsed | ${rate}/min | ETA: ${eta}min`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n  Done! ${totalEnriched} enriched, ${totalFailed} failed in ${elapsed} minutes.`);

  const finalStats = getCatalogStats();
  console.log(`  Final: ${finalStats.enriched} enriched / ${finalStats.total} total`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
