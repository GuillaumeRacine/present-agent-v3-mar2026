#!/usr/bin/env tsx
// ── Import Shopify crawl data into SQLite ────────────────────────────
// Reads crawled Shopify product JSON files and imports them as unenriched products.

import fs from "fs";
import { upsertProducts, getCatalogStats, type DbProduct } from "../lib/db";

// ── Category mapping from product_type/tags ──────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  consumable: [
    "candle", "food", "coffee", "tea", "chocolate", "soap", "bath bomb",
    "snack", "spice", "sauce", "honey", "jam", "drink", "beverage",
    "incense", "fragrance", "lip balm", "lotion", "body wash",
  ],
  wellness: [
    "wellness", "self-care", "meditation", "yoga", "aromatherapy",
    "essential oil", "skincare", "body care", "bath", "spa",
    "massage", "relaxation", "health", "supplement", "vitamin",
    "deodorant", "serum", "face", "skin",
  ],
  practical: [
    "kitchen", "cookware", "tool", "gadget", "tech", "bag", "wallet",
    "organizer", "desk", "office", "travel", "luggage", "backpack",
    "pen", "notebook", "journal", "home", "decor", "furniture",
    "light", "lamp", "clock", "keychain", "bottle", "tumbler",
    "mug", "cup", "plate", "bowl", "utensil", "knife", "cutting board",
    "apron", "towel", "blanket", "pillow", "storage", "rack", "hook",
    "accessory", "suitcase", "packing", "carry-on", "duffel",
  ],
  artisan: [
    "art", "print", "poster", "ceramic", "pottery", "handmade",
    "craft", "stationery", "card", "illustration", "letterpress",
    "woodwork", "leather", "textile", "woven", "embroidered",
    "tote", "shirt", "apparel", "clothing", "hat", "scarf",
  ],
  experiential: [
    "experience", "class", "workshop", "subscription", "membership",
    "lesson", "course", "ticket", "gift card",
  ],
  kids: [
    "kids", "children", "baby", "toddler", "toy", "game", "puzzle",
    "plush", "stuffed",
  ],
};

function categorize(productType: string, tags: string[], title: string): string {
  const text = [productType, ...tags, title].join(" ").toLowerCase();

  // Check each category's keywords
  const scores: Record<string, number> = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[category]++;
      }
    }
  }

  // Return highest-scoring category, default to practical
  let best = "practical";
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

// ── Shared product parsing ───────────────────────────────────────────

interface RawProduct {
  id: number | string;
  title: string;
  vendor: string;
  product_type: string;
  handle: string;
  body_html_snippet?: string;
  body_html_excerpt?: string;
  body_html?: string; // raw Shopify format
  price?: string;
  image_src?: string | null;
  tags: string[] | string;
  // Raw Shopify format fields
  variants?: { price: string | number }[];
  images?: { src: string }[];
}

function parseProducts(
  products: RawProduct[],
  storeName: string,
  storeUrl?: string
): (Partial<DbProduct> & { id: string })[] {
  const results: (Partial<DbProduct> & { id: string })[] = [];

  for (const p of products) {
    // Extract price from either flat field or variants array
    const rawPrice = p.price ?? p.variants?.[0]?.price;
    const price = parseFloat(String(rawPrice));
    if (!p.title || isNaN(price) || price <= 0) continue;

    const id = `${storeName}-${p.handle}`;
    // Extract description from various formats, strip HTML
    let description = p.body_html_snippet || p.body_html_excerpt || p.body_html || null;
    if (description) {
      description = description.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
    }
    const tags = Array.isArray(p.tags) ? p.tags : typeof p.tags === "string" ? p.tags.split(",").map(t => t.trim()) : [];
    // Extract image from either flat field or images array
    const imageUrl = p.image_src ?? p.images?.[0]?.src ?? null;

    // Build buy URL from store URL and handle
    const baseUrl = storeUrl
      ? storeUrl.replace(/\/$/, "")
      : `https://${storeName}.com`;
    const buyUrl = `${baseUrl}/products/${p.handle}`;

    results.push({
      id,
      name: p.title,
      brand: p.vendor || storeName,
      price,
      currency: "USD",
      category: categorize(p.product_type || "", tags, p.title),
      image_url: imageUrl || null,
      buy_url: buyUrl,
      short_description: description
        ? description.slice(0, 300)
        : null,

      // No gift intelligence yet
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
      source_store: storeName,
      source_id: String(p.id),
      enriched: 0,
    });
  }

  return results;
}

// ── Main import logic ────────────────────────────────────────────────

// Files with array of {store, products[]} entries
const STORE_ARRAY_FILES = [
  "/tmp/shopify_products.json",
  "/tmp/shopify_batch3.json",
];
// Files with {stores: {name: {store_url, products[]}}} structure
const STORE_OBJECT_FILES = [
  "/Users/gui/shopify-gift-store-products.json",
];
// Files with flat product arrays (source_store on each product)
const FLAT_PRODUCT_FILES = [
  "/tmp/shopify_batch4.json",  // top-level array
  "/tmp/shopify_batch5.json",  // {products: [...]}
  "/tmp/shopify_batch6.json",  // {all_products: [...]}
  "/tmp/shopify_batch7.json",  // top-level array
  "/tmp/experience_products.json", // experience gifts
  "/tmp/shopify_round2_a.json", // pets, games, DIY, tech
  "/tmp/shopify_round2_b.json", // jewelry, fashion, watches
  "/tmp/shopify_round2_c.json", // home, garden, wellness, food
  "/tmp/shopify_round2_d.json", // outdoor, fitness, travel, men's
  "/tmp/shopify_round3_kids.json", // kids, toys, games, books
  "/tmp/shopify_round3_food.json", // food, drink, candles, skincare
  "/tmp/shopify_round3_dtc.json", // DTC brands, desk, artisan, leather
  "/tmp/shopify_round3_wellness.json", // wellness, self-care, plants
  "/tmp/shopify_final.json", // final round: kids, games, food, diverse
  "/tmp/shopify_push_a.json", // push: fashion, home, wellness new brands
  "/tmp/shopify_push_b.json", // push: outdoor, watches, fragrance, food
  "/tmp/shopify_gaps.json", // gap-closing: kids, chocolate, candles
];

let totalImported = 0;
const storeStats: Record<string, number> = {};

// Array-format files: [{ store, status, product_count, products[] }, ...]
for (const filePath of STORE_ARRAY_FILES) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  console.log(`\nReading ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    store: string;
    status: string;
    product_count: number;
    products: RawProduct[];
  }[];

  for (const entry of data) {
    if (!entry.products || entry.products.length === 0) {
      console.log(`  ${entry.store}: 0 products (skipped)`);
      continue;
    }

    const parsed = parseProducts(entry.products, entry.store);
    if (parsed.length > 0) {
      upsertProducts(parsed);
      storeStats[entry.store] = (storeStats[entry.store] || 0) + parsed.length;
      totalImported += parsed.length;
    }
    console.log(`  ${entry.store}: ${parsed.length} products imported`);
  }
}

// Object-format files: { stores: { [name]: { store_url, products[] } } }
for (const filePath of STORE_OBJECT_FILES) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  console.log(`\nReading ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    crawl_date: string;
    summary: object;
    stores: Record<
      string,
      {
        store_url: string;
        pages_fetched: number;
        product_count: number;
        products?: RawProduct[];
        note?: string;
      }
    >;
  };

  for (const [storeName, storeData] of Object.entries(data.stores)) {
    const products = storeData.products;
    if (!products || products.length === 0) {
      console.log(`  ${storeName}: 0 products (skipped)`);
      continue;
    }

    const parsed = parseProducts(products, storeName, storeData.store_url);
    if (parsed.length > 0) {
      upsertProducts(parsed);
      storeStats[storeName] = (storeStats[storeName] || 0) + parsed.length;
      totalImported += parsed.length;
    }
    console.log(`  ${storeName}: ${parsed.length} products imported`);
  }
}

// Flat product files: top-level array or {products/all_products: [...]}
// Each product has source_store field like "https://www.store.com"
for (const filePath of FLAT_PRODUCT_FILES) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  console.log(`\nReading ${filePath}...`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Extract the product array from various shapes
  let products: RawProduct[];
  if (Array.isArray(raw)) {
    products = raw;
  } else if (raw.all_products) {
    products = raw.all_products;
  } else if (raw.products) {
    products = raw.products;
  } else {
    console.log(`  Unknown format, skipping`);
    continue;
  }

  // Group by source_store for logging
  const byStore: Record<string, RawProduct[]> = {};
  for (const p of products) {
    const storeUrl = (p as any).source_store || "unknown";
    // Extract store name from URL
    const storeName = storeUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").split("/")[0];
    if (!byStore[storeName]) byStore[storeName] = [];
    byStore[storeName].push(p);
  }

  for (const [storeName, storeProducts] of Object.entries(byStore)) {
    const parsed = parseProducts(storeProducts, storeName, `https://${storeName}`);
    if (parsed.length > 0) {
      upsertProducts(parsed);
      storeStats[storeName] = (storeStats[storeName] || 0) + parsed.length;
      totalImported += parsed.length;
    }
    console.log(`  ${storeName}: ${parsed.length} products imported`);
  }
}

// ── Final stats ──────────────────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Shopify import complete!`);
console.log(`  Total imported: ${totalImported}`);
console.log(`\n  Per store:`);
for (const [store, count] of Object.entries(storeStats).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${store}: ${count}`);
}

const stats = getCatalogStats();
console.log(`\nFull catalog stats:`);
console.log(`  Total products: ${stats.total}`);
console.log(`  Enriched: ${stats.enriched}`);
console.log(`  Unenriched: ${stats.unenriched}`);
console.log(`  By category:`, stats.byCategory);
console.log(`  By source:`, stats.bySource);
