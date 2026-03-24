import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// ── Waitlist signup endpoint ───────────────────────────────────────
// POST /api/waitlist { email: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Ensure waitlist table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Insert (ignore duplicate)
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO waitlist (email, source) VALUES (?, ?)"
    );
    stmt.run(email, "landing_page");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist signup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
