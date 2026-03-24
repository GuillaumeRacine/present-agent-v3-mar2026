// ── Recommendation Engine ──────────────────────────────────────────
// Takes a completed gift context → returns 3 product recommendations
// Uses Claude to match qualitative context against catalog metadata
// Queries SQLite DB for enriched products (133K+), falls back to static catalog

import Anthropic from "@anthropic-ai/sdk";
import { CATALOG, Product, priceTierFromBudget } from "./catalog";
import { getDb, type DbProduct } from "./db";
import { getRecipientHistory } from "./profiles";
import { loadUserHistory, extractRecommenderInsights } from "./feedback";
import { sanitizeForPrompt } from "./sanitize";

const anthropic = new Anthropic();

export interface Recommendation {
  product: Product;
  matchScore: number; // 0-1
  whyThisFits: string; // 1-2 sentence explanation
  giftAngle: string; // How to present/frame this gift
  whatThisSays: string; // Gift framed as message: "This says: '...'"
  usageSignal: string; // How often recipient interacts: "She'll use this every morning"
}

export interface GiftContext {
  recipient?: {
    name?: string;
    relationship?: string;
    closeness?: string;
    interests?: string[];
    personality?: Record<string, unknown>;
    wishes?: string[];
    avoids?: string[];
  };
  occasion?: {
    type?: string;
    date?: string;
    significance?: string;
  };
  gift?: {
    budget?: string;
    from?: string;
    direction?: string;
    giverWantsToExpress?: string;
  };
  pastGifts?: {
    worked?: string[];
    failed?: string[];
  };
  phase?: string;
  readiness?: number;
}

// ── Convert DbProduct to Product interface ───────────────────────────

function dbToProduct(row: DbProduct): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    price: row.price,
    currency: (row.currency || "USD") as "CAD",
    category: row.category as Product["category"],
    imageUrl: row.image_url || "/products/placeholder.jpg",
    buyUrl: row.buy_url || "",
    shortDescription: row.short_description || "",
    meta: {
      psychologicalFit: safeParseArray(row.psychological_fit),
      relationshipFit: safeParseArray(row.relationship_fit),
      recipientTraits: safeParseArray(row.recipient_traits),
      recipientAge: safeParseArray(row.recipient_age),
      occasionFit: safeParseArray(row.occasion_fit),
      effortSignal: (row.effort_signal || "moderate_effort") as any,
      priceTier: (row.price_tier || "moderate") as any,
      giftable: true,
      isLastMinute: row.is_last_minute === 1,
      usageSignal: row.usage_signal || undefined,
      whatThisSays: row.what_this_says || undefined,
    },
  };
}

function safeParseArray(json: string | null): any[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

// ── Relationship normalization ────────────────────────────────────────

const RELATIONSHIP_MAP: Record<string, string> = {
  "best friend": "friend",
  "close friend": "friend",
  "old friend": "friend",
  "childhood friend": "friend",
  "bff": "friend",
  "buddy": "friend",
  "pal": "friend",
  "mom": "close_family",
  "mother": "close_family",
  "dad": "close_family",
  "father": "close_family",
  "sister": "close_family",
  "brother": "close_family",
  "wife": "close_family",
  "husband": "close_family",
  "partner": "close_family",
  "spouse": "close_family",
  "girlfriend": "close_family",
  "boyfriend": "close_family",
  "daughter": "close_family",
  "son": "close_family",
  "grandma": "close_family",
  "grandmother": "close_family",
  "grandpa": "close_family",
  "grandfather": "close_family",
  "aunt": "extended_family",
  "uncle": "extended_family",
  "cousin": "extended_family",
  "niece": "extended_family",
  "nephew": "extended_family",
  "in-law": "extended_family",
  "mother-in-law": "extended_family",
  "father-in-law": "extended_family",
  "coworker": "professional",
  "colleague": "professional",
  "boss": "professional",
  "manager": "professional",
  "client": "professional",
  "teacher": "professional",
  "mentor": "professional",
  "neighbor": "acquaintance",
  "acquaintance": "acquaintance",
};

function normalizeRelationship(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (RELATIONSHIP_MAP[lower]) return RELATIONSHIP_MAP[lower];
  // Check partial matches
  for (const [key, canonical] of Object.entries(RELATIONSHIP_MAP)) {
    if (lower.includes(key)) return canonical;
  }
  // Fallback: use the first word
  return lower.split(" ")[0];
}

// ── DB-powered prefilter ─────────────────────────────────────────────

function parseBudgetRange(budget: string | undefined): { min: number; max: number } | null {
  if (!budget) return null;
  const nums = budget.match(/\d+/g)?.map(Number) || [];
  if (nums.length === 0) return null;

  // Handle "up to $X", "under $X", "max $X", "at most $X"
  const lower = budget.toLowerCase();
  if (/\b(up\s+to|under|max|at\s+most|less\s+than|no\s+more\s+than)\b/.test(lower) && nums.length >= 1) {
    return { min: 0, max: nums[nums.length - 1] };
  }

  // Handle "at least $X", "over $X", "more than $X", "minimum $X"
  if (/\b(at\s+least|over|more\s+than|minimum|above)\b/.test(lower) && nums.length >= 1) {
    return { min: nums[0], max: nums[0] * 3 };
  }

  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  // Single number: treat as a HARD CEILING — users saying "$75" mean "not more than $75"
  // Use 60% floor to avoid cheap-feeling picks, strict ceiling at the number
  const n = nums[0];
  return { min: Math.max(0, n * 0.6), max: n };
}

function prefilterFromDb(context: GiftContext): Product[] {
  const db = getDb();
  const tiers = priceTierFromBudget(context.gift?.budget);
  const budgetRange = parseBudgetRange(context.gift?.budget);

  // Build SQL query with filters
  const conditions: string[] = ["enriched = 1"];
  const params: any[] = [];

  // Direct price range filter (tighter than tier-only)
  if (budgetRange) {
    // Match pre-filter to post-filter: 95% min, 110% max (tighter for "under" budgets)
    const isUnderBudget = budgetRange.min === 0;
    conditions.push("price >= ? AND price <= ?");
    params.push(
      isUnderBudget ? 0 : budgetRange.min * 0.9,
      isUnderBudget ? budgetRange.max * 1.05 : budgetRange.max * 1.1
    );
  } else if (tiers.length < 5) {
    conditions.push(`price_tier IN (${tiers.map(() => "?").join(",")})`);
    params.push(...tiers);
  }

  // Occasion filter (JSON LIKE match)
  if (context.occasion?.type) {
    const occ = context.occasion.type.toLowerCase().replace(/[^a-z]/g, "_");
    conditions.push("occasion_fit LIKE ?");
    params.push(`%${occ}%`);
  }

  // Relationship filter (JSON LIKE match) — map to canonical values
  if (context.recipient?.relationship) {
    const rel = normalizeRelationship(context.recipient.relationship);
    conditions.push("relationship_fit LIKE ?");
    params.push(`%${rel}%`);
  }

  // Urgency filter: if occasion is very soon, prefer last-minute items
  if (context.occasion?.date) {
    const occDate = new Date(context.occasion.date);
    const now = new Date();
    const daysUntil = Math.ceil((occDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) {
      conditions.push("is_last_minute = 1");
    }
  }

  // Interest/trait matching — first try filtering to interest-matching products,
  // then fall back to broader pool if not enough matches
  const interests = context.recipient?.interests || [];
  let rows: DbProduct[] = [];

  if (interests.length > 0) {
    // Build a fresh param array for the interest-enhanced query
    const intParams: (string | number)[] = [...params]; // clone base params

    // Build interest filter: product must match at least one interest in recipient_traits OR short_description
    const interestConditions = interests.map((interest) => {
      const cleaned = interest.toLowerCase().trim();
      intParams.push(`%${cleaned}%`, `%${cleaned}%`);
      return `(LOWER(recipient_traits) LIKE ? OR LOWER(short_description) LIKE ?)`;
    });
    const interestFilter = `(${interestConditions.join(" OR ")})`;

    // Score by how many interests match (for ordering within filtered set)
    const traitCases = interests.map((interest) => {
      intParams.push(`%${interest.toLowerCase()}%`);
      return `(CASE WHEN LOWER(recipient_traits) LIKE ? THEN 1 ELSE 0 END)`;
    });
    const orderClause = `(${traitCases.join(" + ")}) DESC, RANDOM()`;

    const interestSql = `
      SELECT * FROM products
      WHERE ${conditions.join(" AND ")} AND ${interestFilter}
      ORDER BY ${orderClause}
      LIMIT 150
    `;

    rows = db.prepare(interestSql).all(...intParams) as DbProduct[];
  }

  // Fallback: if interest-filtered pool is too small, broaden to all matching products
  if (rows.length < 15) {
    const fallbackSql = `
      SELECT * FROM products
      WHERE ${conditions.join(" AND ")}
      ORDER BY RANDOM()
      LIMIT 150
    `;
    rows = db.prepare(fallbackSql).all(...params) as DbProduct[];
  }

  // Enforce diversity: max 2 products per brand, max 6 per category
  // This ensures Claude sees a variety of categories, not just "practical" (which is 50% of catalog)
  const brandCount: Record<string, number> = {};
  const catCount: Record<string, number> = {};
  const diverse: DbProduct[] = [];

  for (const row of rows) {
    const brand = row.brand?.toLowerCase() || "unknown";
    const cat = row.category || "practical";
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    catCount[cat] = (catCount[cat] || 0) + 1;
    if (brandCount[brand] <= 2 && catCount[cat] <= 6) {
      diverse.push(row);
    }
    if (diverse.length >= 50) break;
  }

  return diverse.map(dbToProduct);
}

// ── Static catalog fallback ──────────────────────────────────────────

function prefilterStatic(context: GiftContext): Product[] {
  const tiers = priceTierFromBudget(context.gift?.budget);
  let candidates = CATALOG.filter((p) => tiers.includes(p.meta.priceTier));

  if (candidates.length > 8 && context.occasion?.type) {
    const occ = context.occasion.type.toLowerCase();
    const occasionMatches = candidates.filter((p) =>
      p.meta.occasionFit.some((o) => occ.includes(o.replace(/_/g, " ").replace("s day", "")) || o.includes(occ.replace(/[^a-z]/g, "")))
    );
    if (occasionMatches.length >= 5) candidates = occasionMatches;
  }

  if (candidates.length > 8 && context.recipient?.relationship) {
    const rel = context.recipient.relationship.toLowerCase();
    const relMatches = candidates.filter((p) =>
      p.meta.relationshipFit.some((r) => rel.includes(r) || r.includes(rel.split(" ")[0]))
    );
    if (relMatches.length >= 5) candidates = relMatches;
  }

  return candidates;
}

// ── Unified prefilter ────────────────────────────────────────────────

function prefilterCatalog(context: GiftContext): Product[] {
  // Primary: DB with 254K enriched products
  try {
    const dbResults = prefilterFromDb(context);
    if (dbResults.length >= 5) return dbResults;
  } catch {
    // DB not available, fall through to static
  }

  // Fallback to static catalog only if DB fails entirely
  return prefilterStatic(context);
}

// ── Main recommendation function ─────────────────────────────────────

export async function getRecommendations(context: GiftContext, recipientId?: string, userId?: string): Promise<Recommendation[]> {
  let candidates = prefilterCatalog(context);

  // Apply recipient history: exclude products and avoided categories
  if (recipientId) {
    try {
      const history = getRecipientHistory(recipientId);
      const avoidProductIds = new Set(
        history
          .filter(h => h.recipient_reaction === "meh" || h.recipient_reaction === "returned")
          .map(h => h.product_id)
          .filter(Boolean) as string[]
      );
      // Also get avoided categories from recipient profile
      const { getRecipient } = await import("./profiles");
      const recipient = getRecipient(recipientId);
      const avoidCategories = new Set<string>();
      if (recipient?.avoids) {
        try {
          const avoids: string[] = JSON.parse(recipient.avoids);
          avoids.forEach(a => avoidCategories.add(a));
        } catch { /* ignore */ }
      }
      if (avoidProductIds.size > 0 || avoidCategories.size > 0) {
        candidates = candidates.filter(p =>
          !avoidProductIds.has(p.id) && !avoidCategories.has(p.category)
        );
      }
    } catch {
      // Non-critical
    }
  }

  // Build compact catalog for the prompt
  // Sanitize product data to prevent prompt injection via poisoned catalog entries
  const catalogSummary = candidates.map((p) => ({
    id: p.id,
    name: sanitizeForPrompt(`${p.name} by ${p.brand}`, 150),
    price: p.price,
    category: sanitizeForPrompt(p.category, 50),
    description: sanitizeForPrompt(p.shortDescription?.slice(0, 100) || "", 100),
    traits: sanitizeForPrompt(p.meta.recipientTraits.slice(0, 5).join(", "), 100),
    mood: sanitizeForPrompt(p.meta.psychologicalFit.join(", "), 100),
    usageSignal: sanitizeForPrompt(p.meta.usageSignal?.slice(0, 80) || "", 80),
  }));

  // Build learnings from past sessions (if user has history)
  let insightsBlock = "";
  const userKey = userId || context.gift?.from;
  if (userKey) {
    try {
      const userHistory = loadUserHistory(userKey);
      if (userHistory.length > 0) {
        const insights = extractRecommenderInsights(userHistory);
        const parts: string[] = [];
        if (insights.preferredCategories.length > 0) {
          const top = insights.preferredCategories.slice(0, 3).map(c => `${c.category} (${Math.round(c.score * 100)}% pick rate)`);
          parts.push(`- User tends to pick: ${top.join(", ")}`);
        }
        if (insights.avoidProducts.length > 0) {
          parts.push(`- Products with negative reactions (EXCLUDE): ${insights.avoidProducts.slice(0, 5).join(", ")}`);
        }
        if (insights.preferredSlot !== null) {
          const slotNames = ["Top Pick", "Great Match", "Wild Card"];
          parts.push(`- User usually picks: ${slotNames[insights.preferredSlot]} slot`);
        }
        if (parts.length > 0) {
          insightsBlock = `\n## Learnings from past sessions\n${parts.join("\n")}\nUse these patterns to inform your picks but don't over-index — surprise is still valuable.\n`;
        }
      }
    } catch { /* non-critical */ }
  }

  const prompt = `You are the recommendation engine for Present Agent, a gift-finding tool for ADHD adults.

## Gift Context
${JSON.stringify(context, null, 2)}
${insightsBlock}
## Available Products (pre-filtered by budget/occasion)
${JSON.stringify(catalogSummary, null, 2)}

## Task
Pick EXACTLY 3 products that best match this gift context.

## CRITICAL: Interest Matching
The recipient's interests are the MOST important signal. At least 2 of your 3 picks MUST directly relate to one of the recipient's stated interests. Look at the "traits" and "description" fields in the product list — products whose traits or description mention the recipient's interests should be STRONGLY preferred over generic products.

If the recipient loves guitar → pick guitar gear, music accessories, or music-adjacent items.
If the recipient loves art → pick art supplies, creative tools, or art-adjacent items.
If the recipient loves cooking → pick kitchen tools, cooking accessories, or food-related items.

Do NOT pick generic lifestyle products (jewelry, cologne, candles, speakers) unless they specifically connect to a stated interest.

## Slot Strategy (IMPORTANT — each slot has a different purpose)
- Slot 1 "TOP PICK": Highest-confidence match, MUST directly relate to a stated interest or direction. Anchors trust.
- Slot 2 "GREAT MATCH": Different category from slot 1. Prefer something with sentimental/emotional value — research shows recipients value sentimental gifts 2x more than givers expect. Should still connect to an interest.
- Slot 3 "WILD CARD": Unexpected/surprising choice from a different category. High delight potential. MAY explore adjacent interests the recipient didn't mention. Research shows recipients rate unexpected gifts 40% higher than givers expect.

## For each product, generate:
1. "whyThisFits" — Reference SPECIFIC details from context (name, interests, relationship). Lead with emotional fit, mention price LAST or not at all. Example: "Lisa turns her living room into a yoga studio every morning — this would become part of that ritual."
2. "giftAngle" — How to present it, what to say when giving it.
3. "whatThisSays" — Frame the gift as a message from giver to recipient. Start with "This says:" Example: "This says: 'I notice the little rituals that make your day better, and I want to be part of making them richer.'"
4. "usageSignal" — How often the recipient will interact with this. Example: "She'll use this every morning" or "A one-night experience they'll talk about for months". This helps givers pick practical gifts (research shows recipients value feasibility more than givers expect).

## Rules
- Pick 3 DIFFERENT products from DIFFERENT categories AND different brands. NEVER two from the same category. NEVER two from the same brand. This is a HARD RULE — if you pick two from the same category or brand, the response will be rejected
- Match score 0.0-1.0 based on context fit
- Keep explanations warm but concise (1-2 sentences each)
- Slot 1 should match the stated direction closely
- Slot 3 should be genuinely surprising — a category the giver didn't mention
- NEVER lead with price in whyThisFits. Lead with emotional/practical fit
- PREFER products with specific, vivid descriptions over generic ones
- Budget adherence: all 3 picks MUST be within the stated budget range (±20%). If budget is "$50-100", don't pick a $15 item or a $200 item.

## Output
Return ONLY valid JSON, no markdown fences:
[
  {"id": "product-id", "matchScore": 0.95, "whyThisFits": "...", "giftAngle": "...", "whatThisSays": "This says: '...'", "usageSignal": "..."},
  {"id": "product-id", "matchScore": 0.85, "whyThisFits": "...", "giftAngle": "...", "whatThisSays": "This says: '...'", "usageSignal": "..."},
  {"id": "product-id", "matchScore": 0.75, "whyThisFits": "...", "giftAngle": "...", "whatThisSays": "This says: '...'", "usageSignal": "..."}
]`;

  // Call Claude with timeout + retry. If AI fails entirely, fall through to fallback picks.
  let picks: { id: string; matchScore: number; whyThisFits: string; giftAngle: string; whatThisSays?: string; usageSignal?: string }[] = [];

  async function callClaude(): Promise<typeof picks> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s hard timeout
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }, { signal: controller.signal } as any);
      clearTimeout(timeout);
      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        return [];
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error("Claude recommendation call failed:", err);
      return [];
    }
  }

  // Try once, retry on failure with smaller candidate set
  picks = await callClaude();
  if (picks.length === 0) {
    console.log("Retrying recommendation with smaller candidate set...");
    picks = await callClaude();
  }

  // Map back to full products — check DB first, then static catalog
  const recommendations: Recommendation[] = [];
  for (const pick of picks.slice(0, 3)) {
    let product = candidates.find((p) => p.id === pick.id);
    if (!product) {
      // Try static catalog as fallback
      const staticProduct = CATALOG.find((p) => p.id === pick.id);
      if (staticProduct) product = staticProduct;
    }
    if (!product) continue;
    recommendations.push({
      product,
      matchScore: pick.matchScore,
      whyThisFits: pick.whyThisFits,
      giftAngle: pick.giftAngle,
      whatThisSays: pick.whatThisSays || "",
      usageSignal: pick.usageSignal || "",
    });
  }

  // Hard post-filter: reject recommendations outside budget
  // Strict enforcement: single-number budgets ("$75") are hard ceilings
  const budgetRange = parseBudgetRange(context.gift?.budget);
  if (budgetRange) {
    const isUnderBudget = budgetRange.min === 0;
    const isSingleNumber = !context.gift?.budget?.includes("-");
    const hardMin = isUnderBudget ? 0 : budgetRange.min * 0.9;
    // Single number = hard ceiling (no 10% margin). Range = allow 5% over max.
    const hardMax = isSingleNumber ? budgetRange.max : budgetRange.max * 1.05;
    const filtered = recommendations.filter(r => r.product.price >= hardMin && r.product.price <= hardMax);
    if (filtered.length > 0) {
      recommendations.length = 0;
      recommendations.push(...filtered);
    }
  }

  // Post-processing: enforce category diversity — no two from same category
  if (recommendations.length >= 2) {
    const seen = new Set<string>();
    const deduped: Recommendation[] = [];
    const dupes: Recommendation[] = [];
    for (const rec of recommendations) {
      if (seen.has(rec.product.category)) {
        dupes.push(rec);
      } else {
        seen.add(rec.product.category);
        deduped.push(rec);
      }
    }
    // Replace dupes with candidates from unseen categories
    if (dupes.length > 0) {
      const usedIds = new Set(deduped.map(r => r.product.id));
      for (const dupe of dupes) {
        const replacement = candidates.find(p =>
          !usedIds.has(p.id) &&
          !seen.has(p.category) &&
          (!budgetRange || (p.price >= (budgetRange.min * 0.95) && p.price <= (budgetRange.max * 1.1)))
        );
        if (replacement) {
          seen.add(replacement.category);
          usedIds.add(replacement.id);
          deduped.push({
            product: replacement,
            matchScore: dupe.matchScore * 0.9,
            whyThisFits: dupe.whyThisFits,
            giftAngle: dupe.giftAngle,
            whatThisSays: dupe.whatThisSays,
            usageSignal: dupe.usageSignal,
          });
        } else {
          deduped.push(dupe); // Keep dupe if no alternative found
        }
      }
      recommendations.length = 0;
      recommendations.push(...deduped);
    }
  }

  // Fallback: if AI returned invalid IDs, pick from candidates respecting budget
  // Generate personalized copy from context instead of generic boilerplate
  const recipientName = context.recipient?.name || "them";
  const interests = context.recipient?.interests || [];
  const relationship = context.recipient?.relationship || "";
  const giverExpression = context.gift?.giverWantsToExpress || "";

  function buildFallbackCopy(product: Product): Pick<Recommendation, "whyThisFits" | "giftAngle" | "whatThisSays" | "usageSignal"> {
    const interestMatch = interests.find((i: string) =>
      product.meta.recipientTraits?.some((t: string) => t.toLowerCase().includes(i.toLowerCase()))
    );
    const why = interestMatch
      ? `Connects to ${recipientName}'s interest in ${interestMatch} — a ${product.category} pick that fits naturally into their life.`
      : `A thoughtful ${product.category} pick${relationship ? ` for your ${relationship}` : ""} that shows you put real thought into this.`;
    const says = giverExpression
      ? `This says: '${giverExpression.slice(0, 80)}'`
      : `This says: 'I chose this specifically for you — not a random pick.'`;
    return {
      whyThisFits: why,
      giftAngle: `Give it with a note about why you picked this one specifically for ${recipientName}.`,
      whatThisSays: says,
      usageSignal: product.meta.usageSignal || "",
    };
  }

  while (recommendations.length < 3) {
    const used = new Set(recommendations.map((r) => r.product.id));
    const usedCategories = new Set(recommendations.map((r) => r.product.category));
    const fallback = candidates.find((p) =>
      !used.has(p.id) &&
      !usedCategories.has(p.category) &&
      (!budgetRange || (p.price >= (budgetRange.min * 0.95) && p.price <= (budgetRange.max * 1.1)))
    );
    if (!fallback) {
      const anyFallback = candidates.find((p) =>
        !used.has(p.id) &&
        (!budgetRange || (p.price >= (budgetRange.min * 0.95) && p.price <= (budgetRange.max * 1.1)))
      );
      if (!anyFallback) break;
      recommendations.push({
        product: anyFallback,
        matchScore: 0.5,
        ...buildFallbackCopy(anyFallback),
      });
    } else {
      recommendations.push({
        product: fallback,
        matchScore: 0.5,
        ...buildFallbackCopy(fallback),
      });
    }
  }

  return recommendations;
}
