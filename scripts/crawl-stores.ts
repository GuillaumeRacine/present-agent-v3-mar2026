#!/usr/bin/env tsx
// ── Crawl Shopify Stores for Giftable Products ─────────────────────
// Hits {store}/products.json?limit=250&page=N for a curated list of
// gift-focused Shopify stores and imports products into the SQLite DB.
//
// Usage:
//   npx tsx scripts/crawl-stores.ts

import { upsertProducts, getCatalogStats, type DbProduct } from "../lib/db";

// ── Store list ──────────────────────────────────────────────────────

const STORES = [
  // Home & Design
  "riflepaperco.com",
  "poketo.com",
  "areaware.com",
  "eastfork.com",
  "our-place.com",
  "hedleyandbennett.com",
  "material.kitchen",
  // Wellness & Self-Care
  "vitruvi.com",
  "oseaskincare.com",
  "herbivore.com",
  "necessaire.com",
  "byhumankind.com",
  // Food & Consumable
  "brightland.co",
  "fly-by-jing.com",
  "omsom.com",
  "grfrancis.co",
  "dashofmilk.com",
  // Artisan & Craft
  "thesill.com",
  "craighill.co",
  "letterfolk.com",
  "yfrancistudio.com",
  // Kids
  "lovevery.com",
  "mailegusa.com",
  // Experiential / Subscription
  "cratejoy.com",
];

const USD_TO_CAD = 1.38;
const USER_AGENT = "PresentAgent/1.0 (gift-catalog-builder; contact@present.gift)";
const DELAY_MS = 1000;

// ── Category mapping (same as import-shopify.ts) ────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  consumable: [
    "candle", "food", "coffee", "tea", "chocolate", "soap", "bath bomb",
    "snack", "spice", "sauce", "honey", "jam", "drink", "beverage",
    "incense", "fragrance", "lip balm", "lotion", "body wash",
    "oil", "vinegar", "seasoning", "syrup",
  ],
  wellness: [
    "wellness", "self-care", "meditation", "yoga", "aromatherapy",
    "essential oil", "skincare", "body care", "bath", "spa",
    "massage", "relaxation", "health", "supplement", "vitamin",
    "deodorant", "serum", "face", "skin", "moisturizer", "cleanser",
    "diffuser", "mist",
  ],
  practical: [
    "kitchen", "cookware", "tool", "gadget", "tech", "bag", "wallet",
    "organizer", "desk", "office", "travel", "luggage", "backpack",
    "pen", "notebook", "journal", "home", "decor", "furniture",
    "light", "lamp", "clock", "keychain", "bottle", "tumbler",
    "mug", "cup", "plate", "bowl", "utensil", "knife", "cutting board",
    "apron", "towel", "blanket", "pillow", "storage", "rack", "hook",
    "accessory", "pan", "pot", "dutch oven",
  ],
  artisan: [
    "art", "print", "poster", "ceramic", "pottery", "handmade",
    "craft", "stationery", "card", "illustration", "letterpress",
    "woodwork", "leather", "textile", "woven", "embroidered",
    "tote", "shirt", "apparel", "clothing", "hat", "scarf",
    "letter board", "tile",
  ],
  experiential: [
    "experience", "class", "workshop", "subscription", "membership",
    "lesson", "course", "ticket", "gift card", "box",
  ],
  kids: [
    "kids", "children", "baby", "toddler", "toy", "game", "puzzle",
    "plush", "stuffed", "play kit", "play set",
  ],
};

function categorize(productType: string, tags: string[], title: string): string {
  const text = [productType, ...tags, title].join(" ").toLowerCase();
  const scores: Record<string, number> = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) scores[category]++;
    }
  }
  let best = "practical";
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

// ── Shopify product types ───────────────────────────────────────────

interface ShopifyVariant {
  price: string;
  available?: boolean;
}

interface ShopifyImage {
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  handle: string;
  tags: string[];
  body_html: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

interface ShopifyResponse {
  products: ShopifyProduct[];
}

// ── Crawl a single store ────────────────────────────────────────────

async function crawlStore(domain: string): Promise<(Partial<DbProduct> & { id: string })[]> {
  const products: (Partial<DbProduct> & { id: string })[] = [];
  const storeSlug = domain.replace(/\./g, "-");
  let page = 1;
  const maxPages = 10; // safety limit (250 * 10 = 2500 max per store)

  while (page <= maxPages) {
    const url = `https://${domain}/products.json?limit=250&page=${page}`;
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (resp.status === 403 || resp.status === 401) {
        if (page === 1) console.log(`    [BLOCKED] ${domain} returned ${resp.status}`);
        break;
      }
      if (resp.status === 404) {
        if (page === 1) console.log(`    [404] ${domain} does not expose /products.json`);
        break;
      }
      if (!resp.ok) {
        if (page === 1) console.log(`    [${resp.status}] ${domain}`);
        break;
      }

      const data = (await resp.json()) as ShopifyResponse;
      if (!data.products || data.products.length === 0) break;

      for (const p of data.products) {
        const rawPrice = p.variants?.[0]?.price;
        const priceUSD = parseFloat(String(rawPrice));
        if (!p.title || isNaN(priceUSD) || priceUSD <= 0) continue;

        const priceCAD = Math.round(priceUSD * USD_TO_CAD * 100) / 100;
        const tags = Array.isArray(p.tags)
          ? p.tags
          : typeof p.tags === "string"
            ? (p.tags as string).split(",").map((t: string) => t.trim())
            : [];

        // Strip HTML from description
        let desc = p.body_html || "";
        desc = desc.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

        const id = `${storeSlug}-${p.handle}`;
        products.push({
          id,
          name: p.title,
          brand: p.vendor || domain,
          price: priceCAD,
          currency: "CAD",
          category: categorize(p.product_type || "", tags, p.title),
          image_url: p.images?.[0]?.src || null,
          buy_url: `https://${domain}/products/${p.handle}`,
          short_description: desc ? desc.slice(0, 300) : null,
          psychological_fit: null,
          relationship_fit: null,
          recipient_traits: null,
          recipient_age: null,
          occasion_fit: null,
          effort_signal: null,
          price_tier: null,
          is_last_minute: 0,
          usage_signal: null,
          what_this_says: null,
          source: "shopify_crawl",
          source_store: domain,
          source_id: String(p.id),
          enriched: 0,
        });
      }

      // If we got fewer than 250, we've reached the last page
      if (data.products.length < 250) break;
      page++;
    } catch (err: any) {
      if (page === 1) {
        console.log(`    [ERROR] ${domain}: ${err?.message?.slice(0, 100) || "unknown error"}`);
      }
      break;
    }
  }

  return products;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Shopify Store Crawler ===\n");

  const statsBefore = getCatalogStats();
  console.log(`Catalog before: ${statsBefore.total} products (${statsBefore.enriched} enriched)\n`);

  let totalCrawled = 0;
  let totalImported = 0;
  const storeResults: { domain: string; crawled: number; imported: number }[] = [];

  for (const domain of STORES) {
    process.stdout.write(`  Crawling ${domain}...`);
    const products = await crawlStore(domain);

    if (products.length > 0) {
      upsertProducts(products);
      totalImported += products.length;
    }
    totalCrawled += products.length;

    storeResults.push({ domain, crawled: products.length, imported: products.length });
    console.log(` ${products.length} products`);

    // Polite delay between stores
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Crawl complete!\n`);
  console.log("Per store:");
  for (const r of storeResults.sort((a, b) => b.crawled - a.crawled)) {
    if (r.crawled > 0) console.log(`  ${r.domain}: ${r.crawled}`);
    else console.log(`  ${r.domain}: 0 (skipped/blocked)`);
  }

  const statsAfter = getCatalogStats();
  console.log(`\nCatalog after: ${statsAfter.total} products`);
  console.log(`  Enriched: ${statsAfter.enriched}`);
  console.log(`  Unenriched: ${statsAfter.unenriched}`);
  console.log(`  By category:`, statsAfter.byCategory);
  console.log(`  By source:`, statsAfter.bySource);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
