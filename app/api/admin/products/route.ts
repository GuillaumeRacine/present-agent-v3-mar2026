import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = req.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(200, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "50", 10)));
  const category = url.searchParams.get("category");
  const priceTier = url.searchParams.get("price_tier");
  const store = url.searchParams.get("store");
  const enriched = url.searchParams.get("enriched");
  const q = url.searchParams.get("q");

  const db = getDb();

  // Build WHERE clauses dynamically
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (priceTier) {
    conditions.push("price_tier = ?");
    params.push(priceTier);
  }
  if (store) {
    conditions.push("source_store = ?");
    params.push(store);
  }
  if (enriched === "1" || enriched === "0") {
    conditions.push("enriched = ?");
    params.push(parseInt(enriched, 10));
  }
  if (q) {
    conditions.push("(name LIKE ? OR brand LIKE ? OR short_description LIKE ?)");
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Total matching count
  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM products ${where}`).get(...params) as { count: number }
  ).count;

  const pages = Math.max(1, Math.ceil(total / perPage));
  const offset = (page - 1) * perPage;

  // Fetch page of products
  const products = db
    .prepare(`SELECT * FROM products ${where} ORDER BY enriched DESC, name ASC LIMIT ? OFFSET ?`)
    .all(...params, perPage, offset);

  // Distinct filter values for the UI dropdowns
  const categories = (
    db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category").all() as { category: string }[]
  ).map((r) => r.category);

  const priceTiers = (
    db.prepare("SELECT DISTINCT price_tier FROM products WHERE price_tier IS NOT NULL ORDER BY price_tier").all() as { price_tier: string }[]
  ).map((r) => r.price_tier);

  const stores = (
    db.prepare("SELECT DISTINCT source_store FROM products WHERE source_store IS NOT NULL ORDER BY source_store").all() as { source_store: string }[]
  ).map((r) => r.source_store);

  return NextResponse.json({
    products,
    total,
    page,
    per_page: perPage,
    pages,
    filters: {
      categories,
      price_tiers: priceTiers,
      stores,
    },
  });
}
