#!/usr/bin/env tsx
// ── Seed DB from existing curated catalog ────────────────────────────
// Imports the manually curated products from lib/catalog.ts into SQLite.

import { CATALOG } from "../lib/catalog";
import { upsertProducts, getCatalogStats, type DbProduct } from "../lib/db";

console.log(`Seeding ${CATALOG.length} curated products into database...`);

const dbProducts: (Partial<DbProduct> & { id: string })[] = CATALOG.map((p) => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  price: p.price,
  currency: p.currency,
  category: p.category,
  image_url: p.imageUrl,
  buy_url: p.buyUrl,
  short_description: p.shortDescription,

  // Gift intelligence — JSON-stringify array fields
  psychological_fit: JSON.stringify(p.meta.psychologicalFit),
  relationship_fit: JSON.stringify(p.meta.relationshipFit),
  recipient_traits: JSON.stringify(p.meta.recipientTraits),
  recipient_age: p.meta.recipientAge ? JSON.stringify(p.meta.recipientAge) : null,
  occasion_fit: JSON.stringify(p.meta.occasionFit),
  effort_signal: p.meta.effortSignal,
  price_tier: p.meta.priceTier,
  is_last_minute: p.meta.isLastMinute ? 1 : 0,
  usage_signal: p.meta.usageSignal ?? null,
  what_this_says: p.meta.whatThisSays ?? null,

  // Source tracking
  source: "manual",
  source_store: null,
  source_id: null,
  enriched: 1, // Already enriched with gift intelligence
}));

upsertProducts(dbProducts);

const stats = getCatalogStats();
console.log(`\nSeed complete!`);
console.log(`  Total products: ${stats.total}`);
console.log(`  Enriched: ${stats.enriched}`);
console.log(`  By category:`, stats.byCategory);
console.log(`  By source:`, stats.bySource);
