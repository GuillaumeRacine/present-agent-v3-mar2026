// ── Catalog Stats API ────────────────────────────────────────────────
// Returns real-time catalog statistics for monitoring enrichment progress.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    const total = (db.prepare("SELECT COUNT(*) as c FROM products").get() as any).c;
    const enriched = (db.prepare("SELECT COUNT(*) as c FROM products WHERE enriched=1").get() as any).c;
    const brands = (db.prepare("SELECT COUNT(DISTINCT brand) as c FROM products").get() as any).c;
    const stores = (db.prepare("SELECT COUNT(DISTINCT source_store) as c FROM products").get() as any).c;

    const categories = db.prepare(`
      SELECT category, COUNT(*) as count,
             ROUND(COUNT(*) * 100.0 / ?, 1) as pct
      FROM products WHERE enriched=1
      GROUP BY category ORDER BY count DESC
    `).all(enriched || 1) as any[];

    const priceTiers = db.prepare(`
      SELECT price_tier, COUNT(*) as count
      FROM products WHERE enriched=1 AND price_tier IS NOT NULL
      GROUP BY price_tier ORDER BY count DESC
    `).all() as any[];

    const topStores = db.prepare(`
      SELECT source_store, COUNT(*) as count
      FROM products GROUP BY source_store ORDER BY count DESC LIMIT 15
    `).all() as any[];

    const recentEnriched = db.prepare(`
      SELECT id, name, brand, price, category, usage_signal, what_this_says, source_store
      FROM products WHERE enriched=1
      ORDER BY updated_at DESC LIMIT 10
    `).all() as any[];

    return NextResponse.json({
      total,
      enriched,
      unenriched: total - enriched,
      enrichmentProgress: total > 0 ? Math.round(enriched / total * 100) : 0,
      brands,
      stores,
      categories,
      priceTiers,
      topStores,
      recentEnriched,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
