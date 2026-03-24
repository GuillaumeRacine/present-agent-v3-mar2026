#!/usr/bin/env tsx
// ── Inline Enrichment Writer ─────────────────────────────────────────
// Takes a JSON string of enrichment results and writes them to the DB.
// Used by Claude Code agents to write enrichment results directly.
//
// Usage: npx tsx scripts/enrich-batch-inline.ts '<JSON array>'
//    or: echo '<JSON>' | npx tsx scripts/enrich-batch-inline.ts --stdin

import { getDb, updateEnrichment } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  let jsonInput: string;

  if (args.includes("--stdin")) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    jsonInput = Buffer.concat(chunks).toString("utf-8");
  } else if (args[0]) {
    jsonInput = args[0];
  } else {
    console.error("Usage: npx tsx scripts/enrich-batch-inline.ts '<JSON array>'");
    process.exit(1);
    return;
  }

  try {
    const enrichments = JSON.parse(jsonInput);
    if (!Array.isArray(enrichments)) {
      console.error("Expected a JSON array");
      process.exit(1);
      return;
    }

    const db = getDb();
    let success = 0;
    let failed = 0;

    const tx = db.transaction(() => {
      for (const e of enrichments) {
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
        } catch (err: any) {
          failed++;
        }
      }
    });

    tx();
    console.log(`Written: ${success} enriched, ${failed} failed`);
  } catch (err: any) {
    console.error("Parse error:", err.message);
    process.exit(1);
  }
}

main();
