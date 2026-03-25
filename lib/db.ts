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
  buy_url: string | null;
  short_description: string | null;

  // Gift intelligence (JSON-encoded arrays)
  psychological_fit: string | null;
  relationship_fit: string | null;
  recipient_traits: string | null;
  recipient_age: string | null;
  occasion_fit: string | null;
  effort_signal: string | null;
  price_tier: string | null;
  is_last_minute: number;
  usage_signal: string | null;
  what_this_says: string | null;

  // Source tracking
  source: string | null;
  source_store: string | null;
  source_id: string | null;
  enriched: number;

  created_at: string;
  updated_at: string;
}

/**
 * Returns the database instance (lazy singleton).
 * Creates the database file and tables if they don't exist.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  _db.pragma("journal_mode = WAL");

  // Create tables and indexes
  _db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'CAD',
      category TEXT NOT NULL,
      image_url TEXT,
      buy_url TEXT,
      short_description TEXT,

      -- Gift intelligence (populated by LLM enrichment)
      psychological_fit TEXT,
      relationship_fit TEXT,
      recipient_traits TEXT,
      recipient_age TEXT,
      occasion_fit TEXT,
      effort_signal TEXT,
      price_tier TEXT,
      is_last_minute INTEGER DEFAULT 0,
      usage_signal TEXT,
      what_this_says TEXT,

      -- Source tracking
      source TEXT,
      source_store TEXT,
      source_id TEXT,
      enriched INTEGER DEFAULT 0,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_price_tier ON products(price_tier);
    CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
    CREATE INDEX IF NOT EXISTS idx_products_enriched ON products(enriched);

    -- Givers (authenticated users)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT,
      name TEXT,
      avatar_url TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Recipients (people you gift)
    CREATE TABLE IF NOT EXISTS recipients (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      relationship TEXT,
      closeness TEXT,
      interests TEXT,
      personality TEXT,
      wishes TEXT,
      avoids TEXT,
      shared_memories TEXT,
      inside_jokes TEXT,
      google_contact_id TEXT,
      birthday TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Gift sessions (replaces ephemeral session IDs)
    CREATE TABLE IF NOT EXISTS gift_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      recipient_id TEXT REFERENCES recipients(id),
      status TEXT DEFAULT 'active',
      gift_context TEXT,
      selected_product_id TEXT,
      selected_product_data TEXT,
      card_content TEXT,
      presentation_guide TEXT,
      delivery_preferences TEXT,
      feedback_token TEXT UNIQUE,
      recipient_feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- Gift history (learning from past gifts)
    CREATE TABLE IF NOT EXISTS gift_history (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES gift_sessions(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      recipient_id TEXT NOT NULL REFERENCES recipients(id),
      product_id TEXT,
      product_name TEXT,
      product_category TEXT,
      price REAL,
      occasion TEXT,
      gift_message TEXT,
      giver_satisfaction TEXT,
      recipient_reaction TEXT,
      recipient_feedback_note TEXT,
      what_worked TEXT,
      what_didnt TEXT,
      gifted_at TEXT DEFAULT (datetime('now'))
    );

    -- Full conversation transcripts (for VoC analysis)
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      user_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      turn_number INTEGER,
      phase TEXT,
      readiness REAL,
      extracted_context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_convo_session ON conversation_messages(session_id, turn_number);

    -- Recommendation logs (full request + response for analysis)
    CREATE TABLE IF NOT EXISTS recommendation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      user_id TEXT,
      gift_context TEXT,
      candidate_count INTEGER,
      recommendations TEXT,
      budget_stated TEXT,
      budget_compliant INTEGER,
      slot3_personalized INTEGER,
      category_diverse INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Instrumentation events
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      user_id TEXT,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Session feedback (migrated from JSON files to SQLite)
    CREATE TABLE IF NOT EXISTS session_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      feedback_data TEXT NOT NULL,
      quality_scores TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_session_feedback_session ON session_feedback(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_feedback_user ON session_feedback(user_id);

    -- Recommendation cache (deduplicate Claude calls)
    CREATE TABLE IF NOT EXISTS recommendation_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context_hash TEXT UNIQUE NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rec_cache_hash ON recommendation_cache(context_hash);

    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);
    CREATE INDEX IF NOT EXISTS idx_gift_sessions_user_recipient ON gift_sessions(user_id, recipient_id, status);
    CREATE INDEX IF NOT EXISTS idx_gift_history_user_recipient ON gift_history(user_id, recipient_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_type ON events(session_id, event_type, created_at);
  `);

  return _db;
}

/**
 * Returns all products in the catalog.
 */
export function getAllProducts(): DbProduct[] {
  const db = getDb();
  return db.prepare("SELECT * FROM products").all() as DbProduct[];
}

/**
 * Returns only enriched products (enriched=1).
 */
export function getEnrichedProducts(): DbProduct[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products WHERE enriched = 1")
    .all() as DbProduct[];
}

/**
 * Returns unenriched products, optionally limited.
 */
export function getUnenrichedProducts(limit?: number): DbProduct[] {
  const db = getDb();
  if (limit) {
    return db
      .prepare("SELECT * FROM products WHERE enriched = 0 LIMIT ?")
      .all(limit) as DbProduct[];
  }
  return db
    .prepare("SELECT * FROM products WHERE enriched = 0")
    .all() as DbProduct[];
}

/**
 * Insert or update a single product.
 */
export function upsertProduct(product: Partial<DbProduct> & { id: string }): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO products (
      id, name, brand, price, currency, category,
      image_url, buy_url, short_description,
      psychological_fit, relationship_fit, recipient_traits,
      recipient_age, occasion_fit, effort_signal, price_tier,
      is_last_minute, usage_signal, what_this_says,
      source, source_store, source_id, enriched,
      created_at, updated_at
    ) VALUES (
      @id, @name, @brand, @price, @currency, @category,
      @image_url, @buy_url, @short_description,
      @psychological_fit, @relationship_fit, @recipient_traits,
      @recipient_age, @occasion_fit, @effort_signal, @price_tier,
      @is_last_minute, @usage_signal, @what_this_says,
      @source, @source_store, @source_id, @enriched,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      brand = excluded.brand,
      price = excluded.price,
      currency = excluded.currency,
      category = excluded.category,
      image_url = excluded.image_url,
      buy_url = excluded.buy_url,
      short_description = excluded.short_description,
      psychological_fit = excluded.psychological_fit,
      relationship_fit = excluded.relationship_fit,
      recipient_traits = excluded.recipient_traits,
      recipient_age = excluded.recipient_age,
      occasion_fit = excluded.occasion_fit,
      effort_signal = excluded.effort_signal,
      price_tier = excluded.price_tier,
      is_last_minute = excluded.is_last_minute,
      usage_signal = excluded.usage_signal,
      what_this_says = excluded.what_this_says,
      source = excluded.source,
      source_store = excluded.source_store,
      source_id = excluded.source_id,
      enriched = excluded.enriched,
      updated_at = datetime('now')
  `);

  stmt.run({
    id: product.id,
    name: product.name ?? null,
    brand: product.brand ?? null,
    price: product.price ?? 0,
    currency: product.currency ?? "CAD",
    category: product.category ?? "practical",
    image_url: product.image_url ?? null,
    buy_url: product.buy_url ?? null,
    short_description: product.short_description ?? null,
    psychological_fit: product.psychological_fit ?? null,
    relationship_fit: product.relationship_fit ?? null,
    recipient_traits: product.recipient_traits ?? null,
    recipient_age: product.recipient_age ?? null,
    occasion_fit: product.occasion_fit ?? null,
    effort_signal: product.effort_signal ?? null,
    price_tier: product.price_tier ?? null,
    is_last_minute: product.is_last_minute ?? 0,
    usage_signal: product.usage_signal ?? null,
    what_this_says: product.what_this_says ?? null,
    source: product.source ?? null,
    source_store: product.source_store ?? null,
    source_id: product.source_id ?? null,
    enriched: product.enriched ?? 0,
  });
}

/**
 * Update only enrichment fields for an existing product.
 */
export function updateEnrichment(
  id: string,
  enrichment: {
    category?: string;
    psychological_fit?: string;
    relationship_fit?: string;
    recipient_traits?: string;
    recipient_age?: string;
    occasion_fit?: string;
    effort_signal?: string;
    price_tier?: string;
    is_last_minute?: number;
    usage_signal?: string;
    what_this_says?: string;
  }
): void {
  const db = getDb();
  db.prepare(`
    UPDATE products SET
      category = COALESCE(@category, category),
      psychological_fit = @psychological_fit,
      relationship_fit = @relationship_fit,
      recipient_traits = @recipient_traits,
      recipient_age = @recipient_age,
      occasion_fit = @occasion_fit,
      effort_signal = @effort_signal,
      price_tier = @price_tier,
      is_last_minute = COALESCE(@is_last_minute, is_last_minute),
      usage_signal = @usage_signal,
      what_this_says = @what_this_says,
      enriched = 1,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    category: enrichment.category ?? null,
    psychological_fit: enrichment.psychological_fit ?? null,
    relationship_fit: enrichment.relationship_fit ?? null,
    recipient_traits: enrichment.recipient_traits ?? null,
    recipient_age: enrichment.recipient_age ?? null,
    occasion_fit: enrichment.occasion_fit ?? null,
    effort_signal: enrichment.effort_signal ?? null,
    price_tier: enrichment.price_tier ?? null,
    is_last_minute: enrichment.is_last_minute ?? null,
    usage_signal: enrichment.usage_signal ?? null,
    what_this_says: enrichment.what_this_says ?? null,
  });
}

/**
 * Bulk insert/update products using a transaction.
 */
export function upsertProducts(products: (Partial<DbProduct> & { id: string })[]): void {
  const db = getDb();
  const upsertMany = db.transaction((items: (Partial<DbProduct> & { id: string })[]) => {
    for (const product of items) {
      upsertProduct(product);
    }
  });
  upsertMany(products);
}

/**
 * Get a single product by ID.
 */
export function getProductById(id: string): DbProduct | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as DbProduct | undefined;
}

/**
 * Basic text search on name, brand, and description.
 */
export function searchProducts(query: string): DbProduct[] {
  const db = getDb();
  const pattern = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM products
       WHERE name LIKE ? OR brand LIKE ? OR short_description LIKE ?
       ORDER BY enriched DESC, name ASC`
    )
    .all(pattern, pattern, pattern) as DbProduct[];
}

/**
 * Filter products by source.
 */
export function getProductsBySource(source: string): DbProduct[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products WHERE source = ?")
    .all(source) as DbProduct[];
}

/**
 * Return catalog statistics: counts by category, source, and enrichment status.
 */
export function getCatalogStats(): {
  total: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  enriched: number;
  unenriched: number;
} {
  const db = getDb();

  const total = (
    db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }
  ).count;

  const enriched = (
    db.prepare("SELECT COUNT(*) as count FROM products WHERE enriched = 1").get() as { count: number }
  ).count;

  const categoryRows = db
    .prepare("SELECT category, COUNT(*) as count FROM products GROUP BY category")
    .all() as { category: string; count: number }[];

  const sourceRows = db
    .prepare("SELECT source, COUNT(*) as count FROM products GROUP BY source")
    .all() as { source: string; count: number }[];

  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    byCategory[row.category] = row.count;
  }

  const bySource: Record<string, number> = {};
  for (const row of sourceRows) {
    bySource[row.source] = row.count;
  }

  return {
    total,
    byCategory,
    bySource,
    enriched,
    unenriched: total - enriched,
  };
}
