#!/usr/bin/env npx tsx
/**
 * Persona Test Runner for Present Agent
 *
 * Simulates full multi-turn conversations against the /api/chat endpoint
 * using diverse personas. Evaluates conversation quality, turn count,
 * context extraction accuracy, and UX issues.
 *
 * Usage: npx tsx test/run-personas.ts [--persona <id>] [--all] [--verbose]
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const BASE_URL = "http://localhost:3000";

interface Persona {
  id: string;
  name: string;
  description: string;
  opener: string;
  followUps: Record<string, string>;
  expectedExtraction: Record<string, unknown>;
}

interface TurnResult {
  turn: number;
  userMessage: string;
  botResponse: string;
  context: Record<string, unknown> | null;
  suggestedReplies: string[];
  phase: string;
  readiness: number;
  responseTimeMs: number;
}

interface TestResult {
  persona: string;
  personaId: string;
  totalTurns: number;
  reachedComplete: boolean;
  finalReadiness: number;
  finalPhase: string;
  totalTimeMs: number;
  avgResponseMs: number;
  contextAccuracy: Record<string, boolean>;
  turns: TurnResult[];
  issues: string[];
  suggestedRepliesQuality: string[];
}

// ── Chat API call ──────────────────────────────────────────────────
async function chat(
  message: string,
  history: { role: string; content: string }[],
  accumulatedContext: Record<string, unknown> | null,
  turnCount: number
): Promise<{
  response: string;
  context: Record<string, unknown> | null;
  turnCount: number;
  responseTimeMs: number;
}> {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      recipientContext: {},
      accumulatedContext,
      turnCount,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.detail || data.error);

  return {
    response: data.response,
    context: data.context,
    turnCount: data.turnCount || turnCount + 1,
    responseTimeMs: Date.now() - start,
  };
}

// ── Decide next user message based on conversation state ───────────
function decideNextMessage(
  persona: Persona,
  phase: string,
  readiness: number,
  suggestedReplies: string[],
  turnIndex: number,
  botResponse: string
): string | null {
  // If complete, stop
  if (phase === "complete") return null;

  // Conversation strategy: simulate a real user
  // Sometimes use suggested replies, sometimes type naturally

  // Turn 0 is the opener (already sent)
  // Turn 1: respond to the bot's first question
  if (turnIndex === 1) {
    // Bot usually asks about interests after extracting from opener
    return persona.followUps.interests;
  }

  // Turn 2: if bot shows directions, pick one. Otherwise give more info.
  if (turnIndex === 2) {
    if (phase === "directions" && suggestedReplies.length > 0) {
      // Use a suggested reply ~50% of the time, otherwise type naturally
      if (Math.random() > 0.5 && suggestedReplies.length > 0) {
        return suggestedReplies[0];
      }
    }
    // Give direction + budget together to speed things up
    return `${persona.followUps.direction}. Budget is ${persona.followUps.budget}`;
  }

  // Turn 3: expression / what the gift should say
  if (turnIndex === 3) {
    if (suggestedReplies.length > 0 && Math.random() > 0.6) {
      return suggestedReplies[Math.floor(Math.random() * suggestedReplies.length)];
    }
    return persona.followUps.expression;
  }

  // Turn 4+: use "not sure" to test fallback handling
  if (turnIndex === 4) {
    return persona.followUps.not_sure;
  }

  // Turn 5: just agree / wrap up
  if (turnIndex === 5) {
    return suggestedReplies.length > 0
      ? suggestedReplies[suggestedReplies.length - 1]
      : "Sounds good, let's go with that";
  }

  // Should not reach here (6-turn ceiling)
  return null;
}

// ── Quality checks ─────────────────────────────────────────────────
function evaluateConversation(result: TestResult, persona: Persona): void {
  const { turns, issues } = result;

  // 1. Turn count check
  if (result.totalTurns > 6) {
    issues.push(`EXCEEDED 6-TURN CEILING: took ${result.totalTurns} turns`);
  }

  // 2. Did it reach complete?
  if (!result.reachedComplete) {
    issues.push(`DID NOT REACH COMPLETE: ended at phase '${result.finalPhase}' (readiness: ${result.finalReadiness})`);
  }

  // 3. Response length check (max 2 sentences per response)
  for (const turn of turns) {
    if (turn.botResponse) {
      const sentences = turn.botResponse.split(/[.!?]+/).filter((s) => s.trim().length > 10);
      if (sentences.length > 4) {
        issues.push(`TURN ${turn.turn}: Bot response too long (${sentences.length} sentences)`);
      }
    }
  }

  // 4. Did bot ask something it should know?
  for (const turn of turns) {
    const r = turn.botResponse.toLowerCase();
    if (r.includes("when is mother") || r.includes("what date is mother")) {
      issues.push(`TURN ${turn.turn}: Asked Mother's Day date (should know)`);
    }
    if (r.includes("when is father") || r.includes("what date is father")) {
      issues.push(`TURN ${turn.turn}: Asked Father's Day date (should know)`);
    }
  }

  // 5. Did "not sure" cause a loop?
  for (let i = 1; i < turns.length; i++) {
    if (
      turns[i - 1].userMessage.toLowerCase().includes("not sure") &&
      turns[i].botResponse.toLowerCase().includes("not sure")
    ) {
      issues.push(`TURN ${turns[i].turn}: Possible "not sure" loop — bot echoed uncertainty back`);
    }
  }

  // 6. Suggested replies quality
  for (const turn of turns) {
    if (turn.suggestedReplies.length > 0) {
      // Check length (should be under 20 chars each)
      for (const reply of turn.suggestedReplies) {
        if (reply.length > 30) {
          result.suggestedRepliesQuality.push(
            `TURN ${turn.turn}: Reply too long (${reply.length} chars): "${reply}"`
          );
        }
      }
      // Check count (should be 2-3)
      if (turn.suggestedReplies.length > 5) {
        result.suggestedRepliesQuality.push(
          `TURN ${turn.turn}: Too many suggested replies (${turn.suggestedReplies.length})`
        );
      }
    }
  }

  // 7. Context extraction accuracy
  const finalContext = turns[turns.length - 1]?.context || {};
  const expected = persona.expectedExtraction;
  const recipient = (finalContext as Record<string, unknown>).recipient as Record<string, unknown> || {};
  const occasion = (finalContext as Record<string, unknown>).occasion as Record<string, unknown> || {};

  if (expected.recipientName) {
    const name = (recipient.name as string || "").toLowerCase();
    const expectedName = (expected.recipientName as string).toLowerCase();
    result.contextAccuracy.recipientName = name.includes(expectedName) || expectedName.includes(name);
  }
  if (expected.relationship) {
    const rel = (recipient.relationship as string || "").toLowerCase();
    const expectedRel = (expected.relationship as string).toLowerCase();
    result.contextAccuracy.relationship = rel.includes(expectedRel) || expectedRel.includes(rel);
  }
  if (expected.occasion) {
    const occ = JSON.stringify(occasion).toLowerCase();
    const expectedOcc = (expected.occasion as string).toLowerCase();
    result.contextAccuracy.occasion = occ.includes(expectedOcc.replace(/[_\s]/g, "")) || occ.includes(expectedOcc);
  }
  if (expected.interests) {
    const interests = (recipient.interests as string[] || []).map((s: string) => s.toLowerCase());
    const expectedInterests = (expected.interests as string[]);
    const matched = expectedInterests.filter((ei) =>
      interests.some((i: string) => i.includes(ei) || ei.includes(i))
    );
    result.contextAccuracy.interests = matched.length >= Math.ceil(expectedInterests.length * 0.5);
  }
}

// ── Run one persona ────────────────────────────────────────────────
async function runPersona(persona: Persona, verbose: boolean): Promise<TestResult> {
  const result: TestResult = {
    persona: persona.name,
    personaId: persona.id,
    totalTurns: 0,
    reachedComplete: false,
    finalReadiness: 0,
    finalPhase: "extract",
    totalTimeMs: 0,
    avgResponseMs: 0,
    contextAccuracy: {},
    turns: [],
    issues: [],
    suggestedRepliesQuality: [],
  };

  const history: { role: string; content: string }[] = [];
  let accumulatedContext: Record<string, unknown> | null = null;
  let turnCount = 0;
  let currentPhase = "extract";
  let currentReadiness = 0;
  let suggestedReplies: string[] = [];
  const startTime = Date.now();

  // Send opener
  let nextMessage: string | null = persona.opener;

  for (let i = 0; i < 8 && nextMessage; i++) {
    if (verbose) {
      console.log(`  [Turn ${i}] User: ${nextMessage.slice(0, 80)}${nextMessage.length > 80 ? "..." : ""}`);
    }

    try {
      const { response, context, turnCount: newTurnCount, responseTimeMs } = await chat(
        nextMessage,
        history,
        accumulatedContext,
        turnCount
      );

      // Update history
      history.push({ role: "user", content: nextMessage });
      history.push({ role: "assistant", content: response });

      // Update state
      turnCount = newTurnCount;
      if (context) {
        accumulatedContext = context;
        currentPhase = (context.phase as string) || currentPhase;
        currentReadiness = (context.readiness as number) || currentReadiness;
        suggestedReplies = (context.suggestedReplies as string[]) || [];
      }

      const turnResult: TurnResult = {
        turn: i,
        userMessage: nextMessage,
        botResponse: response,
        context,
        suggestedReplies,
        phase: currentPhase,
        readiness: currentReadiness,
        responseTimeMs,
      };
      result.turns.push(turnResult);

      if (verbose) {
        console.log(`  [Turn ${i}] Bot: ${response.slice(0, 100)}${response.length > 100 ? "..." : ""}`);
        console.log(`  [Turn ${i}] Phase: ${currentPhase} | Readiness: ${currentReadiness} | ${responseTimeMs}ms`);
        if (suggestedReplies.length > 0) {
          console.log(`  [Turn ${i}] Suggestions: [${suggestedReplies.join(" | ")}]`);
        }
        console.log();
      }

      // Check if complete
      if (currentPhase === "complete") {
        result.reachedComplete = true;
        break;
      }

      // Decide next message
      nextMessage = decideNextMessage(persona, currentPhase, currentReadiness, suggestedReplies, i + 1, response);
    } catch (error) {
      result.issues.push(`TURN ${i} ERROR: ${error}`);
      break;
    }
  }

  result.totalTurns = result.turns.length;
  result.finalReadiness = currentReadiness;
  result.finalPhase = currentPhase;
  result.totalTimeMs = Date.now() - startTime;
  result.avgResponseMs = result.totalTimeMs / Math.max(result.totalTurns, 1);

  // Evaluate quality
  evaluateConversation(result, persona);

  return result;
}

// ── Print summary ──────────────────────────────────────────────────
function printSummary(results: TestResult[]): void {
  console.log("\n" + "=".repeat(70));
  console.log("  PERSONA TEST RESULTS");
  console.log("=".repeat(70) + "\n");

  const table = results.map((r) => ({
    Persona: r.persona.slice(0, 35),
    Turns: r.totalTurns,
    Phase: r.finalPhase,
    Ready: `${Math.round(r.finalReadiness * 100)}%`,
    Time: `${(r.totalTimeMs / 1000).toFixed(1)}s`,
    Issues: r.issues.length,
  }));

  console.table(table);

  // Per-persona details
  for (const r of results) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`${r.persona} (${r.personaId})`);
    console.log(`  Turns: ${r.totalTurns} | Phase: ${r.finalPhase} | Readiness: ${Math.round(r.finalReadiness * 100)}%`);
    console.log(`  Complete: ${r.reachedComplete ? "YES" : "NO"} | Avg response: ${Math.round(r.avgResponseMs)}ms`);

    // Context accuracy
    const acc = Object.entries(r.contextAccuracy);
    if (acc.length > 0) {
      const hits = acc.filter(([, v]) => v).length;
      console.log(`  Context accuracy: ${hits}/${acc.length} (${acc.map(([k, v]) => `${k}:${v ? "✓" : "✗"}`).join(" ")})`);
    }

    // Issues
    if (r.issues.length > 0) {
      console.log(`  Issues:`);
      for (const issue of r.issues) {
        console.log(`    ⚠ ${issue}`);
      }
    }

    // Suggested reply quality
    if (r.suggestedRepliesQuality.length > 0) {
      console.log(`  Reply quality issues:`);
      for (const q of r.suggestedRepliesQuality) {
        console.log(`    • ${q}`);
      }
    }
  }

  // Overall stats
  console.log(`\n${"=".repeat(60)}`);
  const totalIssues = results.reduce((s, r) => s + r.issues.length, 0);
  const avgTurns = results.reduce((s, r) => s + r.totalTurns, 0) / results.length;
  const completionRate = results.filter((r) => r.reachedComplete).length / results.length;
  console.log(`Overall: ${results.length} personas | ${avgTurns.toFixed(1)} avg turns | ${Math.round(completionRate * 100)}% completion | ${totalIssues} issues`);
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose") || args.includes("-v");
  const personaFilter = args.includes("--persona") ? args[args.indexOf("--persona") + 1] : null;

  const personasPath = resolve(__dirname, "personas.json");
  const personas: Persona[] = JSON.parse(readFileSync(personasPath, "utf-8"));

  const toRun = personaFilter
    ? personas.filter((p) => p.id === personaFilter)
    : personas;

  if (toRun.length === 0) {
    console.error(`No persona found matching: ${personaFilter}`);
    console.error(`Available: ${personas.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`\nRunning ${toRun.length} persona(s)...\n`);

  const results: TestResult[] = [];
  for (const persona of toRun) {
    console.log(`▶ ${persona.name} — ${persona.description}`);
    const result = await runPersona(persona, verbose);
    results.push(result);
    console.log(`  → ${result.totalTurns} turns, ${result.finalPhase}, ${result.issues.length} issues\n`);
  }

  printSummary(results);

  // Save full results
  const outDir = resolve(__dirname, "results");
  mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = resolve(outDir, `run-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outPath}\n`);
}

main().catch(console.error);
