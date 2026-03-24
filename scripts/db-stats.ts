#!/usr/bin/env tsx
// ── Catalog Database Stats ──────────────────────────────────────────
// Quick overview of product catalog contents and enrichment progress.
//
// Usage: npx tsx scripts/db-stats.ts
//    or: npm run db:stats

import {
  getDb,
  getCatalogStats,
  getUnenrichedProducts,
} from "../lib/db";

function main() {
  console.log("=== Present Agent — Catalog Stats ===\n");

  // Initialize db (creates tables if needed)
  getDb();

  const stats = getCatalogStats();

  console.log(`Total products: ${stats.total}\n`);

  if (stats.total === 0) {
    console.log("No products in the catalog yet.");
    return;
  }

  // By source
  console.log("By source:");
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`  ${source || "(none)"}: ${count}`);
  }

  // By enrichment status
  console.log("\nBy enrichment status:");
  console.log(`  enriched: ${stats.enriched}`);
  console.log(`  unenriched: ${stats.unenriched}`);

  // By category
  console.log("\nBy category:");
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${category || "(none)"}: ${count}`);
  }

  // By price tier
  const db = getDb();
  const tiers = db
    .prepare(
      `SELECT price_tier, COUNT(*) as count FROM products GROUP BY price_tier ORDER BY count DESC`
    )
    .all() as { price_tier: string | null; count: number }[];
  console.log("\nBy price tier:");
  for (const row of tiers) {
    console.log(`  ${row.price_tier || "(none)"}: ${row.count}`);
  }

  // Sample unenriched
  const samples = getUnenrichedProducts(5);
  if (samples.length > 0) {
    console.log("\nSample unenriched products:");
    for (const p of samples) {
      console.log(
        `  - [${p.id}] ${p.name} (${p.brand}) — $${p.price} — source: ${p.source || "unknown"}`
      );
    }
  } else {
    console.log("\nAll products are enriched!");
  }
}

main();
