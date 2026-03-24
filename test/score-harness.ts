#!/usr/bin/env npx tsx
// ── Automated Quality Scoring Harness ──────────────────────────────
// Runs personas through the API, scores each dimension, outputs a report.
// Usage: npx tsx test/score-harness.ts [--base-url http://localhost:3000]

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3000";

// ── Test scenarios (subset of personas for speed) ──────────────────

const scenarios = [
  {
    id: "yoga_mom",
    chat: "Gift for my partner Lisa, Mother's Day. She loves yoga, design, and reading. Budget around $150 CAD. The wellness direction feels right.",
    expectedBudget: { min: 90, max: 165 },
    expectedInterests: ["yoga", "design", "reading", "wellness"],
    expectedRelationship: "partner",
  },
  {
    id: "friend_guitar",
    chat: "Birthday gift for my best friend Sam. He plays guitar, loves craft beer, and is a minimalist. $50-100 budget. Go with the guitar direction.",
    expectedBudget: { min: 45, max: 105 },
    expectedInterests: ["guitar", "craft beer", "music"],
    expectedRelationship: "friend",
  },
  {
    id: "boss_cooking",
    chat: "Thank you gift for my boss. She loves cooking and hosting dinner parties. $50-75 budget. Something cooking related but elevated.",
    expectedBudget: { min: 45, max: 80 },
    expectedInterests: ["cooking", "hosting", "kitchen"],
    expectedRelationship: "boss",
  },
  {
    id: "teen_art",
    chat: "Christmas gift for my 16-year-old niece. She's into art, drawing, and painting. $40-80 budget. Art supplies or something creative.",
    expectedBudget: { min: 36, max: 88 },
    expectedInterests: ["art", "drawing", "painting", "creative"],
    expectedRelationship: "niece",
  },
];

// ── Scoring functions ──────────────────────────────────────────────

interface Rec {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  matchScore: number;
  whyThisFits: string;
  giftAngle: string;
  whatThisSays: string;
  usageSignal: string;
}

interface ScenarioResult {
  id: string;
  recommendations: Rec[];
  scores: {
    budgetCompliance: number;
    categoryDiversity: number;
    brandDiversity: number;
    explanationQuality: number;
    relevance: number;
    overall: number;
  };
  issues: string[];
}

function scoreBudget(recs: Rec[], budget: { min: number; max: number }): { score: number; issues: string[] } {
  const issues: string[] = [];
  let compliant = 0;
  for (const rec of recs) {
    if (rec.price >= budget.min && rec.price <= budget.max) {
      compliant++;
    } else {
      issues.push(`${rec.name} ($${rec.price}) outside budget $${budget.min}-$${budget.max}`);
    }
  }
  return { score: recs.length > 0 ? compliant / recs.length : 0, issues };
}

function scoreCategoryDiversity(recs: Rec[]): { score: number; issues: string[] } {
  const categories = recs.map(r => r.category);
  const unique = new Set(categories).size;
  const issues: string[] = [];
  if (unique < categories.length) {
    const dupes = categories.filter((c, i) => categories.indexOf(c) !== i);
    issues.push(`Duplicate categories: ${dupes.join(", ")}`);
  }
  return { score: recs.length > 0 ? unique / recs.length : 0, issues };
}

function scoreBrandDiversity(recs: Rec[]): { score: number; issues: string[] } {
  const brands = recs.map(r => r.brand);
  const unique = new Set(brands).size;
  const issues: string[] = [];
  if (unique < brands.length) {
    const dupes = brands.filter((b, i) => brands.indexOf(b) !== i);
    issues.push(`Duplicate brands: ${dupes.join(", ")}`);
  }
  return { score: recs.length > 0 ? unique / recs.length : 0, issues };
}

function scoreExplanationQuality(recs: Rec[]): { score: number; issues: string[] } {
  const issues: string[] = [];
  let totalScore = 0;

  for (const rec of recs) {
    let recScore = 0;
    // whyThisFits should be personalized (not generic boilerplate)
    if (rec.whyThisFits && rec.whyThisFits.length > 20) recScore += 0.25;
    if (!/solid option|great choice|perfect gift|good pick/i.test(rec.whyThisFits)) recScore += 0.25;
    else issues.push(`Generic whyThisFits for ${rec.name}: "${rec.whyThisFits.slice(0, 60)}..."`);

    // whatThisSays should start with "This says:"
    if (rec.whatThisSays?.startsWith("This says:")) recScore += 0.25;
    else issues.push(`Missing "This says:" prefix for ${rec.name}`);

    // usageSignal should be present and specific
    if (rec.usageSignal && rec.usageSignal.length > 10 && !/undefined|null/i.test(rec.usageSignal)) recScore += 0.25;
    else issues.push(`Weak usageSignal for ${rec.name}: "${rec.usageSignal || "empty"}"`);

    totalScore += recScore;
  }

  return { score: recs.length > 0 ? totalScore / recs.length : 0, issues };
}

// Interest → related keywords for broader matching
const INTEREST_EXPANSIONS: Record<string, string[]> = {
  guitar: ["guitar", "music", "instrument", "pick", "strings", "amp", "fender", "acoustic"],
  music: ["music", "guitar", "vinyl", "record", "speaker", "headphone", "audio", "concert"],
  "craft beer": ["beer", "brew", "ipa", "stout", "ale", "lager", "tap", "pint"],
  cooking: ["cooking", "cook", "kitchen", "chef", "spoon", "pan", "knife", "culinary", "recipe", "food", "grill", "bake", "spice"],
  hosting: ["hosting", "host", "dinner", "entertain", "serve", "table", "party", "guest"],
  kitchen: ["kitchen", "cook", "utensil", "cutting", "bowl", "plate", "serving"],
  art: ["art", "paint", "draw", "sketch", "canvas", "creative", "brush", "color", "studio", "craft"],
  drawing: ["drawing", "draw", "sketch", "pencil", "pen", "illustration"],
  painting: ["painting", "paint", "canvas", "brush", "acrylic", "watercolor"],
  creative: ["creative", "craft", "art", "design", "maker", "diy", "handmade"],
  yoga: ["yoga", "mat", "meditation", "wellness", "pilates", "mindful", "stretch"],
  design: ["design", "aesthetic", "minimal", "modern", "decor", "style"],
  reading: ["reading", "book", "read", "literary", "novel", "library"],
  wellness: ["wellness", "health", "self-care", "relax", "calm", "mindful"],
};

function scoreRelevance(recs: Rec[], interests: string[]): { score: number; issues: string[] } {
  const issues: string[] = [];
  let totalScore = 0;

  // Build expanded keyword set from interests
  const expandedKeywords = new Set<string>();
  for (const interest of interests) {
    expandedKeywords.add(interest.toLowerCase());
    const expansions = INTEREST_EXPANSIONS[interest.toLowerCase()];
    if (expansions) {
      for (const kw of expansions) expandedKeywords.add(kw);
    }
  }

  for (const rec of recs) {
    const combined = `${rec.name} ${rec.whyThisFits} ${rec.giftAngle} ${rec.whatThisSays} ${rec.category}`.toLowerCase();
    let matched = false;
    expandedKeywords.forEach((kw) => {
      if (combined.includes(kw)) matched = true;
    });
    totalScore += matched ? 1 : 0;
    if (!matched) {
      issues.push(`No interest match for ${rec.name} (expected: ${interests.join(", ")})`);
    }
  }

  return { score: recs.length > 0 ? totalScore / recs.length : 0, issues };
}

// ── Main loop ──────────────────────────────────────────────────────

async function runScenario(scenario: typeof scenarios[0]): Promise<ScenarioResult> {
  // Step 1: Chat to get context
  const chatRes = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: scenario.chat,
      history: [],
      sessionId: `score-${scenario.id}-${Date.now()}`,
      turnCount: 2, // Force completion
    }),
  });
  const chatData = await chatRes.json();
  const context = chatData.context || {};

  // Ensure we have enough context for recommendations
  if (!context.recipient) context.recipient = {};
  if (!context.recipient.interests || context.recipient.interests.length === 0) {
    context.recipient.interests = scenario.expectedInterests;
  }
  if (!context.recipient.relationship) {
    context.recipient.relationship = scenario.expectedRelationship;
  }
  if (!context.gift) context.gift = {};
  if (!context.gift.budget) {
    context.gift.budget = `$${scenario.expectedBudget.min}-${scenario.expectedBudget.max}`;
  }

  // Step 2: Get recommendations
  const recRes = await fetch(`${BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context,
      sessionId: `score-${scenario.id}-${Date.now()}`,
    }),
  });
  const recData = await recRes.json();
  const recs: Rec[] = recData.recommendations || [];

  // Step 3: Score all dimensions
  const budget = scoreBudget(recs, scenario.expectedBudget);
  const catDiv = scoreCategoryDiversity(recs);
  const brandDiv = scoreBrandDiversity(recs);
  const explQuality = scoreExplanationQuality(recs);
  const relevance = scoreRelevance(recs, scenario.expectedInterests);

  const allIssues = [...budget.issues, ...catDiv.issues, ...brandDiv.issues, ...explQuality.issues, ...relevance.issues];

  const overall = (budget.score + catDiv.score + brandDiv.score + explQuality.score + relevance.score) / 5;

  return {
    id: scenario.id,
    recommendations: recs,
    scores: {
      budgetCompliance: Math.round(budget.score * 100) / 100,
      categoryDiversity: Math.round(catDiv.score * 100) / 100,
      brandDiversity: Math.round(brandDiv.score * 100) / 100,
      explanationQuality: Math.round(explQuality.score * 100) / 100,
      relevance: Math.round(relevance.score * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    },
    issues: allIssues,
  };
}

async function main() {
  console.log(`\n=== Present Agent Quality Scoring ===`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Scenarios: ${scenarios.length}\n`);

  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    process.stdout.write(`  ${scenario.id}... `);
    try {
      const result = await runScenario(scenario);
      results.push(result);
      console.log(`OK (overall: ${result.scores.overall})`);
    } catch (err) {
      console.log(`FAILED: ${err}`);
    }
  }

  // Aggregate scores
  const dims = ["budgetCompliance", "categoryDiversity", "brandDiversity", "explanationQuality", "relevance", "overall"] as const;

  console.log(`\n=== SCORES ===\n`);
  console.log(`| Dimension | ${results.map(r => r.id).join(" | ")} | AVG |`);
  console.log(`|-----------|${results.map(() => "---").join("|")}|-----|`);

  for (const dim of dims) {
    const values = results.map(r => r.scores[dim]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    console.log(`| ${dim.padEnd(20)} | ${values.map(v => v.toFixed(2).padStart(5)).join(" | ")} | ${avg.toFixed(2)} |`);
  }

  // All issues
  const allIssues = results.flatMap(r => r.issues.map(i => `[${r.id}] ${i}`));
  if (allIssues.length > 0) {
    console.log(`\n=== ISSUES (${allIssues.length}) ===\n`);
    for (const issue of allIssues) {
      console.log(`  - ${issue}`);
    }
  }

  // Per-scenario product picks
  console.log(`\n=== PICKS ===\n`);
  for (const r of results) {
    console.log(`${r.id}:`);
    for (let i = 0; i < r.recommendations.length; i++) {
      const rec = r.recommendations[i];
      const slot = ["TOP", "GREAT", "WILD"][i];
      console.log(`  ${slot}: ${rec.name} by ${rec.brand} ($${rec.price}) [${rec.category}] score=${rec.matchScore}`);
    }
  }

  // Output JSON for programmatic comparison
  const summary = {
    timestamp: new Date().toISOString(),
    scenarioCount: scenarios.length,
    averageScores: Object.fromEntries(
      dims.map(dim => {
        const values = results.map(r => r.scores[dim]);
        return [dim, Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100];
      })
    ),
    issueCount: allIssues.length,
    results,
  };

  // Write JSON for diff comparison
  const fs = await import("fs");
  fs.writeFileSync("test/score-latest.json", JSON.stringify(summary, null, 2));
  console.log(`\nScores saved to test/score-latest.json`);
}

main().catch(console.error);
