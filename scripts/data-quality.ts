#!/usr/bin/env tsx
// ── Data Quality Agent ───────────────────────────────────────────────
// Bar-raises all product data before LLM enrichment.
// Runs deterministic checks first, then uses Claude for subjective quality.
//
// Usage:
//   npx tsx scripts/data-quality.ts              # full audit + cleanup
//   npx tsx scripts/data-quality.ts --dry-run    # report only, no changes
//   npx tsx scripts/data-quality.ts --fix        # auto-fix what's fixable
//   npx tsx scripts/data-quality.ts --llm-audit  # run LLM giftability audit

import Database from "better-sqlite3";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const DB_PATH = path.join(process.cwd(), "data", "catalog.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FIX = args.includes("--fix") || (!DRY_RUN && !args.includes("--llm-audit"));
const LLM_AUDIT = args.includes("--llm-audit");

// ═══════════════════════════════════════════════════════════════════════
// QUALITY RULES — deterministic checks
// ═══════════════════════════════════════════════════════════════════════

interface QualityIssue {
  product_id: string;
  rule: string;
  severity: "reject" | "warn" | "fix";
  detail: string;
}

const issues: QualityIssue[] = [];
let rejected = 0;
let warned = 0;
let fixed = 0;

function report(issue: QualityIssue) {
  issues.push(issue);
  if (issue.severity === "reject") rejected++;
  else if (issue.severity === "warn") warned++;
  else if (issue.severity === "fix") fixed++;
}

// ── Rule 1: Missing essential fields ─────────────────────────────────
function checkMissingFields() {
  console.log("\n🔍 Rule 1: Missing essential fields...");

  const missing = db.prepare(`
    SELECT id, name, brand, price, buy_url, short_description, image_url
    FROM products
    WHERE name IS NULL OR name = ''
       OR brand IS NULL OR brand = ''
       OR price IS NULL OR price <= 0
  `).all() as any[];

  for (const p of missing) {
    report({
      product_id: p.id,
      rule: "missing_essential_fields",
      severity: "reject",
      detail: `name=${p.name ? "ok" : "MISSING"}, brand=${p.brand ? "ok" : "MISSING"}, price=${p.price || "MISSING"}`,
    });
  }

  // Products with no description (not a reject, but warn)
  const noDesc = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE (short_description IS NULL OR short_description = '') AND enriched = 0
  `).get() as any;
  if (noDesc.cnt > 0) {
    console.log(`  ⚠️  ${noDesc.cnt} products have no description (may get poor enrichment)`);
  }

  // Products with no image
  const noImage = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE (image_url IS NULL OR image_url = '') AND enriched = 0
  `).get() as any;
  if (noImage.cnt > 0) {
    console.log(`  ⚠️  ${noImage.cnt} products have no image URL`);
  }

  console.log(`  Found ${missing.length} products with missing essentials`);
}

// ── Rule 2: Duplicate detection ──────────────────────────────────────
function checkDuplicates() {
  console.log("\n🔍 Rule 2: Duplicate detection...");

  // Exact name+brand duplicates across stores
  const dupes = db.prepare(`
    SELECT name, brand, COUNT(*) as cnt, GROUP_CONCAT(source_store, ', ') as stores
    FROM products
    GROUP BY LOWER(name), LOWER(brand)
    HAVING cnt > 1
    ORDER BY cnt DESC
    LIMIT 50
  `).all() as any[];

  let totalDupes = 0;
  for (const d of dupes) {
    totalDupes += d.cnt - 1; // keep one, count extras
    if (d.cnt > 3) {
      report({
        product_id: `${d.brand}-${d.name}`,
        rule: "duplicate_name_brand",
        severity: "fix",
        detail: `"${d.name}" by ${d.brand} appears ${d.cnt}x across: ${d.stores}`,
      });
    }
  }

  // Same source_id from same store (true duplicates)
  const exactDupes = db.prepare(`
    SELECT source_store, source_id, COUNT(*) as cnt
    FROM products
    WHERE source_id IS NOT NULL
    GROUP BY source_store, source_id
    HAVING cnt > 1
  `).all() as any[];

  console.log(`  ${dupes.length} name+brand duplicate groups (${totalDupes} extra copies)`);
  console.log(`  ${exactDupes.length} exact source ID duplicates`);
}

// ── Rule 3: Price sanity ─────────────────────────────────────────────
function checkPriceSanity() {
  console.log("\n🔍 Rule 3: Price sanity...");

  // Suspiciously cheap (likely variants or accessories, not gifts)
  const tooCheap = db.prepare(`
    SELECT COUNT(*) as cnt FROM products WHERE price < 1 AND enriched = 0
  `).get() as any;

  // Suspiciously expensive (likely furniture or not a gift)
  const tooExpensive = db.prepare(`
    SELECT COUNT(*) as cnt FROM products WHERE price > 5000 AND enriched = 0
  `).get() as any;

  // Zero-price items
  const zeroPrice = db.prepare(`
    SELECT COUNT(*) as cnt FROM products WHERE price = 0
  `).get() as any;

  console.log(`  ${zeroPrice.cnt} products at $0 (will reject)`);
  console.log(`  ${tooCheap.cnt} products under $1 (will reject)`);
  console.log(`  ${tooExpensive.cnt} products over $5,000 (will reject — not giftable)`);

  if (FIX) {
    const deleted = db.prepare(`
      DELETE FROM products WHERE (price < 1 OR price > 5000) AND enriched = 0
    `).run();
    console.log(`  ✅ Removed ${deleted.changes} price-outlier products`);
  }
}

// ── Rule 4: Non-giftable product filtering ───────────────────────────
function checkNonGiftable() {
  console.log("\n🔍 Rule 4: Non-giftable product filtering...");

  // Products that are clearly not gifts (refills, replacements, parts, accessories)
  const NON_GIFT_PATTERNS = [
    "refill%", "replacement%", "% part", "% parts", "repair %",
    "% refill", "% cartridge", "% filter", "warranty%",
    "% strap only", "% band only", "% case only",
    "gift card%", "e-gift%", "egift%", // gift cards aren't curated gifts
    "sample %", "% sample", "tester%", "% tester",
    "% swatch", "swatch %", "fabric swatch%",
    "shipping%", "% shipping", "rush %", "express %",
    "donation%", "% donation",
    "% insert", "insert %",
    "monogram%", "engraving%", "personalization%", // add-on services
  ];

  let nonGiftCount = 0;
  for (const pattern of NON_GIFT_PATTERNS) {
    const count = db.prepare(`
      SELECT COUNT(*) as cnt FROM products
      WHERE LOWER(name) LIKE ? AND enriched = 0
    `).get(pattern.toLowerCase()) as any;
    nonGiftCount += count.cnt;
  }

  console.log(`  ${nonGiftCount} products match non-giftable patterns`);

  if (FIX) {
    let totalRemoved = 0;
    for (const pattern of NON_GIFT_PATTERNS) {
      const result = db.prepare(`
        DELETE FROM products WHERE LOWER(name) LIKE ? AND enriched = 0
      `).run(pattern.toLowerCase());
      totalRemoved += result.changes;
    }
    console.log(`  ✅ Removed ${totalRemoved} non-giftable products`);
  }
}

// ── Rule 5: Store concentration / diversity ──────────────────────────
function checkStoreConcentration() {
  console.log("\n🔍 Rule 5: Store concentration check...");

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM products").get() as any).cnt;

  const stores = db.prepare(`
    SELECT source_store, COUNT(*) as cnt,
           ROUND(COUNT(*) * 100.0 / ?, 1) as pct
    FROM products
    GROUP BY source_store
    ORDER BY cnt DESC
    LIMIT 10
  `).all(total) as any[];

  for (const s of stores) {
    const status = s.pct > 15 ? "⚠️  OVER-REPRESENTED" : "✓";
    console.log(`  ${status} ${s.source_store}: ${s.cnt} (${s.pct}%)`);
  }

  // Cap stores at 2000 products max (keep best — prefer those with descriptions + images)
  const MAX_PER_STORE = 2000;
  const overRepresented = db.prepare(`
    SELECT source_store, COUNT(*) as cnt
    FROM products
    WHERE enriched = 0
    GROUP BY source_store
    HAVING cnt > ?
  `).all(MAX_PER_STORE) as any[];

  if (overRepresented.length > 0) {
    console.log(`\n  ${overRepresented.length} stores exceed ${MAX_PER_STORE} product cap:`);
    for (const s of overRepresented) {
      console.log(`    ${s.source_store}: ${s.cnt} → will keep best ${MAX_PER_STORE}`);
    }
  }

  if (FIX && overRepresented.length > 0) {
    let totalTrimmed = 0;
    for (const s of overRepresented) {
      // Keep products WITH description + image first, then by price diversity
      // Delete the excess — keep the best MAX_PER_STORE
      const result = db.prepare(`
        DELETE FROM products WHERE id IN (
          SELECT id FROM products
          WHERE source_store = ? AND enriched = 0
          ORDER BY
            CASE WHEN short_description IS NOT NULL AND short_description != '' THEN 0 ELSE 1 END,
            CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 0 ELSE 1 END,
            price ASC
          LIMIT -1 OFFSET ?
        )
      `).run(s.source_store, MAX_PER_STORE);
      totalTrimmed += result.changes;
      console.log(`    ✅ ${s.source_store}: trimmed ${result.changes} products`);
    }
    console.log(`  ✅ Total trimmed: ${totalTrimmed}`);
  }
}

// ── Rule 6: Name/description quality ─────────────────────────────────
function checkNameQuality() {
  console.log("\n🔍 Rule 6: Name & description quality...");

  // Names that are just SKUs or codes
  const skuNames = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE LENGTH(name) < 5 AND enriched = 0
  `).get() as any;

  // Names that are excessively long (probably HTML leakage)
  const longNames = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE LENGTH(name) > 200 AND enriched = 0
  `).get() as any;

  // Descriptions with HTML artifacts
  const htmlDesc = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE (short_description LIKE '%<%' OR short_description LIKE '%&amp;%'
           OR short_description LIKE '%&nbsp;%' OR short_description LIKE '%&#%')
    AND enriched = 0
  `).get() as any;

  console.log(`  ${skuNames.cnt} products with names < 5 chars (likely SKUs)`);
  console.log(`  ${longNames.cnt} products with names > 200 chars (likely HTML leak)`);
  console.log(`  ${htmlDesc.cnt} products with HTML artifacts in description`);

  if (FIX) {
    // Remove products with useless names
    const del = db.prepare(`
      DELETE FROM products WHERE LENGTH(name) < 5 AND enriched = 0
    `).run();
    console.log(`  ✅ Removed ${del.changes} products with unusable names`);

    // Clean HTML from descriptions
    const htmlProducts = db.prepare(`
      SELECT id, short_description FROM products
      WHERE (short_description LIKE '%<%' OR short_description LIKE '%&amp;%'
             OR short_description LIKE '%&nbsp;%')
      AND enriched = 0
    `).all() as any[];

    const updateDesc = db.prepare(`UPDATE products SET short_description = ? WHERE id = ?`);
    let cleaned = 0;
    const cleanHtml = db.transaction(() => {
      for (const p of htmlProducts) {
        const clean = p.short_description
          .replace(/<[^>]*>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&nbsp;/g, " ")
          .replace(/&#\d+;/g, "")
          .replace(/&[a-z]+;/g, "")
          .replace(/\s+/g, " ")
          .trim();
        updateDesc.run(clean, p.id);
        cleaned++;
      }
    });
    cleanHtml();
    console.log(`  ✅ Cleaned HTML from ${cleaned} descriptions`);
  }
}

// ── Rule 7: Currency normalization ───────────────────────────────────
function checkCurrency() {
  console.log("\n🔍 Rule 7: Currency consistency...");

  const currencies = db.prepare(`
    SELECT currency, COUNT(*) as cnt
    FROM products
    GROUP BY currency
  `).all() as any[];

  for (const c of currencies) {
    console.log(`  ${c.currency}: ${c.cnt} products`);
  }
}

// ── Rule 8: Image URL validation ─────────────────────────────────────
function checkImageUrls() {
  console.log("\n🔍 Rule 8: Image URL validation...");

  const noImage = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE (image_url IS NULL OR image_url = '') AND enriched = 0
  `).get() as any;

  // Broken-looking URLs (no extension, localhost, relative paths)
  const suspectUrls = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE image_url IS NOT NULL
    AND (image_url NOT LIKE 'http%' OR image_url LIKE '%localhost%')
    AND enriched = 0
  `).get() as any;

  console.log(`  ${noImage.cnt} products with no image`);
  console.log(`  ${suspectUrls.cnt} products with suspect image URLs`);
}

// ── Rule 9: Buy URL validation ───────────────────────────────────────
function checkBuyUrls() {
  console.log("\n🔍 Rule 9: Buy URL validation...");

  const noBuyUrl = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE (buy_url IS NULL OR buy_url = '') AND enriched = 0
  `).get() as any;

  // Malformed URLs
  const badUrls = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE buy_url IS NOT NULL AND buy_url NOT LIKE 'http%'
    AND enriched = 0
  `).get() as any;

  console.log(`  ${noBuyUrl.cnt} products with no buy URL`);
  console.log(`  ${badUrls.cnt} products with non-HTTP buy URLs`);
}

// ═══════════════════════════════════════════════════════════════════════
// LLM AUDIT — subjective giftability check (optional, costly)
// ═══════════════════════════════════════════════════════════════════════

async function llmGiftabilityAudit() {
  console.log("\n🤖 LLM Giftability Audit...");
  console.log("  Sampling 200 random unenriched products for giftability check...\n");

  const anthropic = new Anthropic();

  // Sample 200 random products across categories
  const sample = db.prepare(`
    SELECT id, name, brand, price, category, short_description, source_store
    FROM products
    WHERE enriched = 0
    ORDER BY RANDOM()
    LIMIT 200
  `).all() as any[];

  // Process in batches of 50
  const BATCH_SIZE = 50;
  const rejectIds: string[] = [];
  const reclassify: { id: string; newCategory: string }[] = [];

  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(sample.length / BATCH_SIZE);
    console.log(`  Batch ${batchNum}/${totalBatches}...`);

    const products = batch.map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      category: p.category,
      description: p.short_description?.slice(0, 100) || "none",
      store: p.source_store,
    }));

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `You are a gift curation expert. Review these products and for each one:
1. Is it GIFTABLE? (Would someone buy this as a gift for another person?)
2. If not giftable, mark as "reject" with reason
3. If giftable but wrong category, suggest the correct category from: practical, experiential, consumable, artisan, wellness, kids

Products:
${JSON.stringify(products, null, 2)}

Return ONLY a JSON array where each item is:
{"id": "...", "giftable": true/false, "reject_reason": "..." or null, "suggested_category": "..." or null}

Be strict — reject items that are:
- Replacement parts, refills, accessories-only items
- Generic commodity items with no gift appeal
- Items too niche/professional for gifting (industrial, B2B)
- Clothing basics that aren't special (plain t-shirts, socks without a story)
- Products that are just color/size variants listed as separate items

Return ONLY the JSON array.`,
        }],
      });

      const text = (response.content[0] as any).text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        for (const r of results) {
          if (!r.giftable) {
            rejectIds.push(r.id);
          }
          if (r.suggested_category && r.giftable) {
            reclassify.push({ id: r.id, newCategory: r.suggested_category });
          }
        }
      }
    } catch (err) {
      console.log(`    ⚠️  Batch ${batchNum} failed: ${(err as Error).message}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n  LLM Audit Results (from 200-product sample):`);
  console.log(`    Giftable: ${sample.length - rejectIds.length}`);
  console.log(`    Not giftable: ${rejectIds.length} (${(rejectIds.length / sample.length * 100).toFixed(0)}% rejection rate)`);
  console.log(`    Need reclassification: ${reclassify.length}`);

  // Extrapolate rejection rate to full catalog
  const totalUnenriched = (db.prepare("SELECT COUNT(*) as cnt FROM products WHERE enriched = 0").get() as any).cnt;
  const estimatedRejects = Math.round(totalUnenriched * (rejectIds.length / sample.length));
  console.log(`\n  📊 Extrapolated: ~${estimatedRejects} products in full catalog would be rejected`);
  console.log(`  📊 Estimated clean catalog size: ~${totalUnenriched - estimatedRejects} products`);

  if (FIX && rejectIds.length > 0) {
    // Delete the sampled rejects
    const placeholders = rejectIds.map(() => "?").join(",");
    const del = db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...rejectIds);
    console.log(`  ✅ Removed ${del.changes} non-giftable products from sample`);

    // Apply reclassifications
    const updateCat = db.prepare(`UPDATE products SET category = ? WHERE id = ?`);
    const reclassifyTxn = db.transaction(() => {
      for (const r of reclassify) {
        updateCat.run(r.newCategory, r.id);
      }
    });
    reclassifyTxn();
    console.log(`  ✅ Reclassified ${reclassify.length} products`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════

function printFinalReport() {
  const total = (db.prepare("SELECT COUNT(*) as cnt FROM products").get() as any).cnt;
  const enriched = (db.prepare("SELECT COUNT(*) as cnt FROM products WHERE enriched = 1").get() as any).cnt;
  const stores = (db.prepare("SELECT COUNT(DISTINCT source_store) as cnt FROM products").get() as any).cnt;
  const brands = (db.prepare("SELECT COUNT(DISTINCT brand) as cnt FROM products").get() as any).cnt;

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  DATA QUALITY REPORT`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total products:    ${total}`);
  console.log(`  Enriched:          ${enriched}`);
  console.log(`  Unique stores:     ${stores}`);
  console.log(`  Unique brands:     ${brands}`);
  console.log(`  Mode:              ${DRY_RUN ? "DRY RUN" : FIX ? "FIX" : "REPORT"}`);

  // Category breakdown
  console.log(`\n  Category breakdown:`);
  const cats = db.prepare(`
    SELECT category, COUNT(*) as cnt,
           ROUND(COUNT(*) * 100.0 / ?, 1) as pct
    FROM products GROUP BY category ORDER BY cnt DESC
  `).all(total) as any[];
  for (const c of cats) {
    console.log(`    ${c.category}: ${c.cnt} (${c.pct}%)`);
  }

  // Price tier breakdown
  console.log(`\n  Price tier breakdown:`);
  const prices = db.prepare(`
    SELECT
      CASE WHEN price<15 THEN 'token(<$15)'
           WHEN price<50 THEN 'budget($15-50)'
           WHEN price<100 THEN 'moderate($50-100)'
           WHEN price<250 THEN 'premium($100-250)'
           ELSE 'luxury($250+)' END as tier,
      COUNT(*) as cnt,
      ROUND(COUNT(*) * 100.0 / ?, 1) as pct
    FROM products GROUP BY tier ORDER BY MIN(price)
  `).all(total) as any[];
  for (const p of prices) {
    console.log(`    ${p.tier}: ${p.cnt} (${p.pct}%)`);
  }

  // Top stores
  console.log(`\n  Top 10 stores:`);
  const topStores = db.prepare(`
    SELECT source_store, COUNT(*) as cnt,
           ROUND(COUNT(*) * 100.0 / ?, 1) as pct
    FROM products GROUP BY source_store ORDER BY cnt DESC LIMIT 10
  `).all(total) as any[];
  for (const s of topStores) {
    const flag = s.pct > 10 ? " ⚠️" : "";
    console.log(`    ${s.source_store}: ${s.cnt} (${s.pct}%)${flag}`);
  }

  console.log(`\n${"═".repeat(60)}`);
}

// ═══════════════════════════════════════════════════════════════════════
// AUTO-RESEARCH — sample, analyze, and optimize quality rules
// ═══════════════════════════════════════════════════════════════════════

async function autoResearch() {
  console.log("\n🔬 AUTO-RESEARCH: Analyzing catalog quality patterns...\n");

  const anthropic = new Anthropic();

  // ── Test 1: Sample products per store and assess giftability spread ──
  console.log("  Test 1: Store quality distribution...");
  const storeQuality = db.prepare(`
    SELECT source_store,
      COUNT(*) as total,
      SUM(CASE WHEN short_description IS NOT NULL AND short_description != '' THEN 1 ELSE 0 END) as has_desc,
      SUM(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 ELSE 0 END) as has_image,
      ROUND(AVG(price), 2) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(DISTINCT brand) as brand_count
    FROM products WHERE enriched = 0
    GROUP BY source_store
    ORDER BY total DESC
  `).all() as any[];

  const storeScores: Record<string, number> = {};
  for (const s of storeQuality) {
    const descRate = s.has_desc / s.total;
    const imgRate = s.has_image / s.total;
    const priceSpread = Math.min(s.max_price / Math.max(s.min_price, 1), 100) / 100;
    const brandDiv = Math.min(s.brand_count / Math.max(s.total, 1) * 10, 1);
    // Score: 40% description, 30% image, 15% price diversity, 15% brand diversity
    const score = descRate * 0.4 + imgRate * 0.3 + priceSpread * 0.15 + brandDiv * 0.15;
    storeScores[s.source_store] = Math.round(score * 100);
  }

  // Report bottom 10 stores by quality
  const sortedStores = Object.entries(storeScores).sort((a, b) => a[1] - b[1]);
  console.log("    Lowest quality stores (may need removal):");
  for (const [store, score] of sortedStores.slice(0, 10)) {
    const count = storeQuality.find((s: any) => s.source_store === store)?.total || 0;
    console.log(`      ${store}: score=${score}/100, products=${count}`);
  }

  // ── Test 2: Name pattern analysis — find junk patterns ──────────────
  console.log("\n  Test 2: Name pattern analysis...");

  // Sample 500 product names and ask Claude to find junk patterns
  const nameSample = db.prepare(`
    SELECT name, brand, source_store FROM products
    WHERE enriched = 0 ORDER BY RANDOM() LIMIT 500
  `).all() as any[];

  try {
    const patternResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Analyze these 500 product names from a gift catalog. Find patterns that indicate LOW-QUALITY or NON-GIFTABLE products.

Sample names:
${nameSample.map((p: any) => `"${p.name}" (${p.brand}, ${p.source_store})`).join("\n")}

Return a JSON object with:
{
  "junk_patterns": ["regex pattern 1", "regex pattern 2", ...],
  "junk_reason": {"pattern": "why it's junk"},
  "quality_observations": ["observation 1", "observation 2", ...],
  "estimated_junk_rate": 0.0-1.0,
  "category_gaps": ["what gift categories are missing or thin"],
  "recommendations": ["actionable improvements"]
}

Be specific with regex patterns. Examples of junk: size variants listed separately, color-only variants, SKU-like names, accessories/parts, duplicates with minor variation.

Return ONLY the JSON object.`,
      }],
    });

    const text = (patternResponse.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);

      console.log(`    Estimated junk rate: ${(analysis.estimated_junk_rate * 100).toFixed(0)}%`);
      console.log(`    Junk patterns found: ${analysis.junk_patterns?.length || 0}`);

      if (analysis.junk_patterns && FIX) {
        console.log("\n    Applying discovered junk patterns...");
        let totalJunkRemoved = 0;
        for (const pattern of analysis.junk_patterns) {
          try {
            // Convert regex to SQL LIKE where possible, or use app-side filtering
            const regex = new RegExp(pattern, "i");
            // Fetch candidates and test against regex
            const candidates = db.prepare(`
              SELECT id, name FROM products WHERE enriched = 0
            `).all() as any[];

            const junkIds: string[] = [];
            for (const c of candidates) {
              if (regex.test(c.name)) {
                junkIds.push(c.id);
              }
            }

            if (junkIds.length > 0 && junkIds.length < candidates.length * 0.3) {
              // Safety: don't delete more than 30% of catalog with one pattern
              const placeholders = junkIds.map(() => "?").join(",");
              const del = db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...junkIds);
              totalJunkRemoved += del.changes;
              console.log(`      Pattern /${pattern}/i: removed ${del.changes} products`);
            } else if (junkIds.length >= candidates.length * 0.3) {
              console.log(`      Pattern /${pattern}/i: matched ${junkIds.length} (>30%, SKIPPED for safety)`);
            }
          } catch {
            // Invalid regex, skip
          }
        }
        console.log(`    ✅ Total junk removed by patterns: ${totalJunkRemoved}`);
      }

      console.log("\n    Quality observations:");
      for (const obs of analysis.quality_observations || []) {
        console.log(`      • ${obs}`);
      }
      console.log("\n    Category gaps:");
      for (const gap of analysis.category_gaps || []) {
        console.log(`      • ${gap}`);
      }
      console.log("\n    Recommendations:");
      for (const rec of analysis.recommendations || []) {
        console.log(`      → ${rec}`);
      }
    }
  } catch (err) {
    console.log(`    ⚠️  Pattern analysis failed: ${(err as Error).message}`);
  }

  // ── Test 3: Category accuracy audit ─────────────────────────────────
  console.log("\n  Test 3: Category accuracy audit...");

  const catSample = db.prepare(`
    SELECT id, name, brand, price, category, short_description, source_store
    FROM products WHERE enriched = 0
    ORDER BY RANDOM() LIMIT 100
  `).all() as any[];

  try {
    const catResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Review these 100 products and check if their category assignment is correct.

Categories: practical, experiential, consumable, artisan, wellness, kids

Products:
${JSON.stringify(catSample.map((p: any) => ({
  id: p.id, name: p.name, brand: p.brand, price: p.price,
  current_category: p.category, desc: p.short_description?.slice(0, 80) || "none"
})), null, 2)}

Return ONLY a JSON object:
{
  "accuracy_rate": 0.0-1.0,
  "misclassified": [{"id": "...", "current": "...", "correct": "...", "reason": "..."}],
  "category_confusion_pairs": [["cat1", "cat2", "why they get confused"]],
  "suggestions": ["how to improve categorization"]
}`,
      }],
    });

    const text = (catResponse.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const catAudit = JSON.parse(jsonMatch[0]);

      console.log(`    Category accuracy: ${(catAudit.accuracy_rate * 100).toFixed(0)}%`);
      console.log(`    Misclassified: ${catAudit.misclassified?.length || 0} out of 100`);

      if (catAudit.misclassified && FIX) {
        const updateCat = db.prepare(`UPDATE products SET category = ? WHERE id = ?`);
        const fixCats = db.transaction(() => {
          for (const m of catAudit.misclassified) {
            updateCat.run(m.correct, m.id);
          }
        });
        fixCats();
        console.log(`    ✅ Fixed ${catAudit.misclassified.length} category assignments`);
      }

      if (catAudit.category_confusion_pairs) {
        console.log("    Common confusion pairs:");
        for (const pair of catAudit.category_confusion_pairs) {
          console.log(`      ${pair[0]} ↔ ${pair[1]}: ${pair[2]}`);
        }
      }

      if (catAudit.suggestions) {
        console.log("    Categorization improvements:");
        for (const s of catAudit.suggestions) {
          console.log(`      → ${s}`);
        }
      }
    }
  } catch (err) {
    console.log(`    ⚠️  Category audit failed: ${(err as Error).message}`);
  }

  // ── Test 4: Price tier distribution vs ideal ────────────────────────
  console.log("\n  Test 4: Price tier vs ideal gift distribution...");

  const idealDistribution = {
    "token(<$15)": 10,
    "budget($15-50)": 30,
    "moderate($50-100)": 30,
    "premium($100-250)": 20,
    "luxury($250+)": 10,
  };

  const total = (db.prepare("SELECT COUNT(*) as cnt FROM products WHERE enriched = 0").get() as any).cnt;
  const actualPrices = db.prepare(`
    SELECT
      CASE WHEN price<15 THEN 'token(<$15)'
           WHEN price<50 THEN 'budget($15-50)'
           WHEN price<100 THEN 'moderate($50-100)'
           WHEN price<250 THEN 'premium($100-250)'
           ELSE 'luxury($250+)' END as tier,
      ROUND(COUNT(*) * 100.0 / ?, 1) as pct
    FROM products WHERE enriched = 0 GROUP BY tier ORDER BY MIN(price)
  `).all(total) as any[];

  console.log("    Tier        | Actual | Ideal | Delta");
  console.log("    ------------|--------|-------|------");
  for (const p of actualPrices) {
    const ideal = (idealDistribution as any)[p.tier] || 0;
    const delta = (p.pct - ideal).toFixed(1);
    const flag = Math.abs(p.pct - ideal) > 10 ? " ⚠️" : "";
    console.log(`    ${p.tier.padEnd(12)} | ${String(p.pct).padEnd(6)} | ${String(ideal).padEnd(5)} | ${delta}${flag}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        DATA QUALITY AGENT — Bar Raiser                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no changes)" : FIX ? "FIX (will modify DB)" : "REPORT"}`);

  // Phase 1: Deterministic checks
  console.log("\n━━━ PHASE 1: Deterministic Checks ━━━");
  checkMissingFields();
  checkDuplicates();
  checkPriceSanity();
  checkNonGiftable();
  checkStoreConcentration();
  checkNameQuality();
  checkCurrency();
  checkImageUrls();
  checkBuyUrls();

  // Phase 2: Auto-research (LLM-powered pattern discovery)
  console.log("\n━━━ PHASE 2: Auto-Research & Pattern Discovery ━━━");
  await autoResearch();

  // Phase 3: LLM giftability audit (optional, more expensive)
  if (LLM_AUDIT) {
    console.log("\n━━━ PHASE 3: LLM Giftability Audit ━━━");
    await llmGiftabilityAudit();
  }

  printFinalReport();
}

main().catch(console.error);
