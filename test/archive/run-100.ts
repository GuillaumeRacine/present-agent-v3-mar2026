// ── 100-Scenario Test Runner ──────────────────────────────────────
// Drives each scenario through the full Present Agent flow:
// 1. Start conversation with context
// 2. Adaptively respond until gift profile is complete
// 3. Fetch recommendations
// 4. Record everything for analysis

import { SCENARIOS, GiftScenario } from "./100-scenarios";
import { writeFileSync, mkdirSync } from "fs";

const BASE_URL = "http://localhost:3000";
const MAX_TURNS = 8;
const CONCURRENCY = 5; // Gemini Flash handles high concurrency
const BATCH_DELAY_MS = 500; // Light delay between batches
const CHECKPOINT_EVERY = 25; // Print mid-run analysis every N scenarios

interface ConversationResult {
  scenario: GiftScenario;
  turns: number;
  messages: { role: string; content: string }[];
  finalContext: Record<string, unknown> | null;
  recommendations: RecommendationResult[];
  reachedComplete: boolean;
  gotRecommendations: boolean;
  errors: string[];
  durationMs: number;
}

interface RecommendationResult {
  name: string;
  brand: string;
  price: number;
  category: string;
  matchScore: number;
  whyThisFits: string;
  giftAngle: string;
  buyUrl: string;
}

async function runScenario(scenario: GiftScenario): Promise<ConversationResult> {
  const start = Date.now();
  const messages: { role: string; content: string }[] = [];
  const errors: string[] = [];
  let context: Record<string, unknown> = {};
  let turnCount = 0;
  let reachedComplete = false;

  // Build initial message from scenario context
  let opener = `I need a gift for ${scenario.person}.`;
  if (scenario.occasion !== "unknown") opener += ` It's ${scenario.occasion}.`;
  if (scenario.context) opener += ` ${scenario.context}`;

  try {
    // Turn 1: Send opener
    const firstResponse = await chat(opener, [], { name: scenario.person, occasion: scenario.occasion }, null, 0);
    messages.push({ role: "user", content: opener });
    messages.push({ role: "assistant", content: firstResponse.response });
    context = firstResponse.context || {};
    turnCount = 1;

    // Turns 2+: Adaptive responses
    const REPLIES = buildReplies(scenario);
    let replyIndex = 0;

    for (let turn = 1; turn < MAX_TURNS; turn++) {
      const phase = (context as { phase?: string }).phase;
      if (phase === "complete") {
        reachedComplete = true;
        break;
      }

      // Pick next reply
      let reply: string;
      if (replyIndex < REPLIES.length) {
        reply = REPLIES[replyIndex++];
      } else {
        reply = "Sounds good, let's go with that direction.";
      }

      const res = await chat(
        reply,
        messages,
        { name: scenario.person, occasion: scenario.occasion },
        context,
        turn
      );

      messages.push({ role: "user", content: reply });
      messages.push({ role: "assistant", content: res.response });

      if (res.context) {
        context = mergeContext(context, res.context);
      }
      turnCount = turn + 1;
    }

    // Check if we reached complete
    if ((context as { phase?: string }).phase === "complete") {
      reachedComplete = true;
    }
  } catch (err) {
    errors.push(`Chat error: ${err}`);
  }

  // Fetch recommendations if we got a complete profile
  let recommendations: RecommendationResult[] = [];
  if (reachedComplete) {
    try {
      recommendations = await fetchRecommendations(context);
    } catch (err) {
      errors.push(`Recommendation error: ${err}`);
    }
  }

  return {
    scenario,
    turns: turnCount,
    messages,
    finalContext: context,
    recommendations,
    reachedComplete,
    gotRecommendations: recommendations.length > 0,
    errors,
    durationMs: Date.now() - start,
  };
}

function buildReplies(s: GiftScenario): string[] {
  const replies: string[] = [];

  // Reply 1: Interests + relationship depth
  const parts: string[] = [];
  if (s.interests.length > 0 && s.interests[0] !== "unknown") {
    parts.push(`${s.relationship === "partner" ? "She" : "They"} love${s.relationship === "partner" ? "s" : ""} ${s.interests.slice(0, 3).join(", ")}.`);
  }
  if (s.relationship) parts.push(`${s.relationship === "partner" ? "We're partners" : `They're my ${s.relationship}`}.`);
  if (s.budget && s.budget !== "unknown" && s.budget !== "no idea") parts.push(`Budget: ${s.budget}.`);
  if (parts.length > 0) replies.push(parts.join(" "));

  // Reply 2: Direction + what to express
  if (s.giftDirection && s.giftDirection !== "unknown" && s.giftDirection !== "no idea") {
    replies.push(`I'm thinking ${s.giftDirection}. ${s.budget && s.budget !== "unknown" ? `Budget around ${s.budget}.` : ""}`);
  }

  // Reply 3: Confirmation
  replies.push("That direction sounds perfect. Let's go with it.");

  // Reply 4: Fallback
  replies.push("Yes, show me recommendations.");

  return replies;
}

async function chat(
  message: string,
  history: { role: string; content: string }[],
  recipientContext: Record<string, unknown> | null,
  accumulatedContext: Record<string, unknown> | null,
  turnCount: number,
  retries = 2
): Promise<{ response: string; context: Record<string, unknown> | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          recipientContext: recipientContext || {},
          accumulatedContext: accumulatedContext || undefined,
          turnCount,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 529 || res.status === 429) {
          // Rate limited — wait and retry
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
            continue;
          }
        }
        throw new Error(`Chat API ${res.status}: ${text}`);
      }
      return res.json();
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Exhausted retries");
}

async function fetchRecommendations(context: Record<string, unknown>): Promise<RecommendationResult[]> {
  const res = await fetch(`${BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });

  if (!res.ok) throw new Error(`Recommend API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.recommendations || [];
}

function mergeContext(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  return { ...prev, ...next };
}

function printCheckpoint(results: ConversationResult[], done: number) {
  const gotRecs = results.filter(r => r.gotRecommendations);
  const failed = results.filter(r => !r.reachedComplete);
  const errored = results.filter(r => r.errors.length > 0);

  console.log(`\n  ── CHECKPOINT @ ${done} scenarios ──`);
  console.log(`  Complete: ${results.length - failed.length}/${results.length} | Recs: ${gotRecs.length} | Errors: ${errored.length}`);

  // Product concentration
  const productCounts: Record<string, number> = {};
  for (const r of gotRecs) {
    for (const rec of r.recommendations) {
      const key = `${rec.name}`;
      productCounts[key] = (productCounts[key] || 0) + 1;
    }
  }
  const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
  const totalRecs = Object.values(productCounts).reduce((a, b) => a + b, 0);
  const uniqueProducts = sorted.length;
  const maxFreq = sorted.length > 0 ? sorted[0][1] : 0;

  console.log(`  Products: ${uniqueProducts} unique / ${totalRecs} total | Max freq: ${maxFreq}x (${sorted[0]?.[0] || 'n/a'})`);

  // Category balance
  const cats: Record<string, number> = {};
  for (const r of gotRecs) {
    for (const rec of r.recommendations) {
      cats[rec.category] = (cats[rec.category] || 0) + 1;
    }
  }
  const catStr = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join(" ");
  console.log(`  Categories: ${catStr}`);

  // Budget adherence
  let budgetHits = 0, budgetTotal = 0;
  for (const r of gotRecs) {
    const budgetStr = r.scenario.budget;
    if (!budgetStr || budgetStr === "unknown" || budgetStr === "no idea") continue;
    const nums = budgetStr.match(/\d+/g)?.map(Number) || [];
    if (nums.length === 0) continue;
    const hi = nums.length >= 2 ? nums[1] : nums[0];
    const lo = nums.length >= 2 ? nums[0] : Math.max(0, nums[0] - 50);
    for (const rec of r.recommendations) {
      budgetTotal++;
      if (lo * 0.7 <= rec.price && rec.price <= hi * 1.3) budgetHits++;
    }
  }
  if (budgetTotal > 0) {
    console.log(`  Budget adherence: ${budgetHits}/${budgetTotal} (${Math.round(budgetHits * 100 / budgetTotal)}%)`);
  }

  // Recent errors
  const recentErrors = errored.slice(-3);
  if (recentErrors.length > 0) {
    console.log(`  Recent errors: ${recentErrors.map(r => `#${r.scenario.id}:${r.errors[0]?.slice(0, 60)}`).join(" | ")}`);
  }
  console.log("");
}

// Run with concurrency control
async function runAll() {
  console.log(`\n🎁 Running 100 gift scenarios against Present Agent...\n`);

  const results: ConversationResult[] = [];
  const startTime = Date.now();

  // Process in batches with delay to avoid API rate limits
  for (let i = 0; i < SCENARIOS.length; i += CONCURRENCY) {
    const batch = SCENARIOS.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(runScenario));
    results.push(...batchResults);

    // Progress
    const done = Math.min(i + CONCURRENCY, SCENARIOS.length);
    const successCount = results.filter(r => r.gotRecommendations).length;
    const failCount = results.filter(r => !r.reachedComplete).length;
    process.stdout.write(
      `\r  [${done}/${SCENARIOS.length}] ✅ ${successCount} got recs | ❌ ${failCount} stuck | ⏱️ ${Math.round((Date.now() - startTime) / 1000)}s`
    );

    // Pause between batches to avoid rate limiting
    if (i + CONCURRENCY < SCENARIOS.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    // Mid-run checkpoint analysis
    if (done > 0 && done % CHECKPOINT_EVERY === 0) {
      printCheckpoint(results, done);
    }
  }

  console.log(`\n\n${"═".repeat(60)}`);

  // ── Analysis ──────────────────────────────────────────────────
  const totalTime = Date.now() - startTime;
  const completed = results.filter(r => r.reachedComplete);
  const gotRecs = results.filter(r => r.gotRecommendations);
  const failed = results.filter(r => !r.reachedComplete);
  const errored = results.filter(r => r.errors.length > 0);
  const avgTurns = results.reduce((sum, r) => sum + r.turns, 0) / results.length;
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

  console.log(`\n📊 RESULTS SUMMARY`);
  console.log(`${"─".repeat(40)}`);
  console.log(`  Total scenarios:     ${results.length}`);
  console.log(`  Reached complete:    ${completed.length} (${pct(completed.length, results.length)})`);
  console.log(`  Got recommendations: ${gotRecs.length} (${pct(gotRecs.length, results.length)})`);
  console.log(`  Stuck/incomplete:    ${failed.length} (${pct(failed.length, results.length)})`);
  console.log(`  Had errors:          ${errored.length}`);
  console.log(`  Avg turns to complete: ${avgTurns.toFixed(1)}`);
  console.log(`  Avg duration/convo:  ${(avgDuration / 1000).toFixed(1)}s`);
  console.log(`  Total time:          ${(totalTime / 1000).toFixed(0)}s`);

  // Turn distribution
  console.log(`\n📈 TURNS DISTRIBUTION`);
  console.log(`${"─".repeat(40)}`);
  for (let t = 1; t <= MAX_TURNS; t++) {
    const count = completed.filter(r => r.turns === t).length;
    const bar = "█".repeat(Math.round(count / 2));
    console.log(`  ${t} turns: ${String(count).padStart(3)} ${bar}`);
  }

  // Recommendation patterns
  console.log(`\n🏷️ PRODUCT FREQUENCY (top 10)`);
  console.log(`${"─".repeat(40)}`);
  const productCounts: Record<string, number> = {};
  for (const r of gotRecs) {
    for (const rec of r.recommendations) {
      const key = `${rec.name} (${rec.brand})`;
      productCounts[key] = (productCounts[key] || 0) + 1;
    }
  }
  const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
  for (const [product, count] of sortedProducts.slice(0, 10)) {
    console.log(`  ${String(count).padStart(3)}x  ${product}`);
  }

  // Category distribution
  console.log(`\n📦 CATEGORY DISTRIBUTION`);
  console.log(`${"─".repeat(40)}`);
  const categoryCounts: Record<string, number> = {};
  for (const r of gotRecs) {
    for (const rec of r.recommendations) {
      categoryCounts[rec.category] = (categoryCounts[rec.category] || 0) + 1;
    }
  }
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    const bar = "█".repeat(Math.round(count / 3));
    console.log(`  ${cat.padEnd(15)} ${String(count).padStart(3)} ${bar}`);
  }

  // Price distribution
  console.log(`\n💰 PRICE DISTRIBUTION`);
  console.log(`${"─".repeat(40)}`);
  const priceBuckets: Record<string, number> = { "under $50": 0, "$50-100": 0, "$100-200": 0, "$200+": 0 };
  for (const r of gotRecs) {
    for (const rec of r.recommendations) {
      if (rec.price < 50) priceBuckets["under $50"]++;
      else if (rec.price < 100) priceBuckets["$50-100"]++;
      else if (rec.price < 200) priceBuckets["$100-200"]++;
      else priceBuckets["$200+"]++;
    }
  }
  for (const [bucket, count] of Object.entries(priceBuckets)) {
    const bar = "█".repeat(Math.round(count / 3));
    console.log(`  ${bucket.padEnd(15)} ${String(count).padStart(3)} ${bar}`);
  }

  // Relationship breakdown
  console.log(`\n👥 SUCCESS BY RELATIONSHIP`);
  console.log(`${"─".repeat(40)}`);
  const relGroups: Record<string, { total: number; success: number }> = {};
  for (const r of results) {
    const rel = r.scenario.relationship;
    if (!relGroups[rel]) relGroups[rel] = { total: 0, success: 0 };
    relGroups[rel].total++;
    if (r.gotRecommendations) relGroups[rel].success++;
  }
  for (const [rel, { total, success }] of Object.entries(relGroups).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${rel.padEnd(20)} ${success}/${total} (${pct(success, total)})`);
  }

  // Failures
  if (failed.length > 0) {
    console.log(`\n❌ STUCK SCENARIOS (did not reach "complete")`);
    console.log(`${"─".repeat(40)}`);
    for (const r of failed) {
      console.log(`  #${r.scenario.id} ${r.scenario.person} (${r.scenario.occasion}) — ${r.turns} turns, phase: ${(r.finalContext as Record<string, unknown>)?.phase || "unknown"}`);
      if (r.errors.length > 0) console.log(`     Error: ${r.errors[0]}`);
    }
  }

  // UX issues / patterns
  console.log(`\n🔍 UX PATTERNS & ISSUES`);
  console.log(`${"─".repeat(40)}`);

  const slowConvos = results.filter(r => r.turns > 4);
  console.log(`  Slow conversations (>4 turns): ${slowConvos.length}`);
  if (slowConvos.length > 0) {
    for (const r of slowConvos.slice(0, 5)) {
      console.log(`    #${r.scenario.id} ${r.scenario.person}: ${r.turns} turns`);
    }
  }

  const sameProduct3 = sortedProducts.filter(([, count]) => count > 15);
  if (sameProduct3.length > 0) {
    console.log(`  Over-recommended products (>15x):`);
    for (const [product, count] of sameProduct3) {
      console.log(`    ${count}x ${product}`);
    }
  }

  const lowMatch = gotRecs.filter(r => r.recommendations.some(rec => rec.matchScore < 0.6));
  console.log(`  Low-confidence recs (<60% match): ${lowMatch.length} conversations`);

  const noDirection = gotRecs.filter(r => {
    const ctx = r.finalContext as Record<string, { direction?: string }>;
    return !ctx?.gift?.direction;
  });
  console.log(`  Completed without gift direction: ${noDirection.length}`);

  // Save full results
  mkdirSync("/Volumes/SSD/Code SSD/present-agent/test/results", { recursive: true });
  writeFileSync(
    "/Volumes/SSD/Code SSD/present-agent/test/results/100-run-latest.json",
    JSON.stringify(results, null, 2)
  );
  console.log(`\n💾 Full results saved to test/results/100-run-latest.json`);
  console.log(`${"═".repeat(60)}\n`);
}

function pct(n: number, total: number): string {
  return `${Math.round((n / total) * 100)}%`;
}

runAll().catch(console.error);
