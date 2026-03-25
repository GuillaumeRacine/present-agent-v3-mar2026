#!/usr/bin/env npx tsx
// ── Product Freshness Checker ──────────────────────────────────────
// Checks product buy_urls for availability (HEAD request).
// Marks stale/broken products in the database.
// Usage: npx tsx scripts/check-freshness.ts [--limit 100] [--stale-days 90]

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "catalog.db");
const LIMIT = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--limit") || "100");
const STALE_DAYS = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--stale-days") || "90");

async function checkUrl(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Ensure columns exist
  try { db.exec("ALTER TABLE products ADD COLUMN last_checked_at TEXT"); } catch { /* exists */ }
  try { db.exec("ALTER TABLE products ADD COLUMN check_status TEXT DEFAULT 'unchecked'"); } catch { /* exists */ }

  // Get unchecked or stale products with buy_urls
  const products = db.prepare(`
    SELECT id, buy_url, last_checked_at, check_status
    FROM products
    WHERE buy_url IS NOT NULL AND buy_url LIKE 'http%'
    AND (last_checked_at IS NULL OR last_checked_at < datetime('now', '-' || ? || ' days'))
    ORDER BY last_checked_at ASC NULLS FIRST
    LIMIT ?
  `).all(STALE_DAYS, LIMIT) as { id: string; buy_url: string; last_checked_at: string | null; check_status: string }[];

  console.log(`Checking ${products.length} products (limit=${LIMIT}, stale>${STALE_DAYS}d)\n`);

  const update = db.prepare(
    "UPDATE products SET last_checked_at = datetime('now'), check_status = ? WHERE id = ?"
  );

  let ok = 0;
  let broken = 0;
  let timeout = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const result = await checkUrl(p.buy_url);

    if (result.ok) {
      update.run("ok", p.id);
      ok++;
    } else if (result.status === 0) {
      update.run("timeout", p.id);
      timeout++;
    } else {
      update.run(`error:${result.status}`, p.id);
      broken++;
      console.log(`  BROKEN [${result.status}]: ${p.id} → ${p.buy_url.slice(0, 60)}`);
    }

    if ((i + 1) % 20 === 0) {
      process.stdout.write(`  Checked ${i + 1}/${products.length}...\r`);
    }
  }

  console.log(`\n\nResults:`);
  console.log(`  OK:      ${ok}`);
  console.log(`  Broken:  ${broken}`);
  console.log(`  Timeout: ${timeout}`);

  // Summary stats
  const stats = db.prepare(`
    SELECT check_status, COUNT(*) as count
    FROM products
    WHERE check_status IS NOT NULL AND check_status != 'unchecked'
    GROUP BY check_status
    ORDER BY count DESC
  `).all() as { check_status: string; count: number }[];

  if (stats.length > 0) {
    console.log(`\nAll-time status:`);
    for (const s of stats) {
      console.log(`  ${s.check_status}: ${s.count}`);
    }
  }

  db.close();
}

main().catch(console.error);
