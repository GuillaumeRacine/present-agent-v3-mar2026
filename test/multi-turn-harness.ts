#!/usr/bin/env npx tsx
// ── Multi-Turn Conversation Quality Harness ────────────────────────
// Simulates realistic back-and-forth conversations with the AI,
// then fetches recommendations, and scores the full journey.
//
// Usage: npx tsx test/multi-turn-harness.ts [--base-url http://localhost:3000]

import * as fs from "fs";

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3000";

// ── Types ──────────────────────────────────────────────────────────

interface PersonaTurn {
  message: string;
  intent: string;
  expect_ai: string;
}

interface PersonaScoring {
  context_should_have: {
    name: string;
    relationship: string;
    occasion: string;
    interests_any: string[];
    budget_contains: string;
  };
  conversation_should: string[];
  recs_should: string[];
}

interface PostRecsConfig {
  behavior: string;
  reactions: Record<string, string>;
  decision: string;
  cardEdit: string;
  wouldRefine: string;
  buyBehavior: string;
}

interface Persona {
  id: string;
  title: string;
  description: string;
  turns: PersonaTurn[];
  scoring: PersonaScoring;
  postRecs?: PostRecsConfig;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  context?: Record<string, unknown>;
  turnCount?: number;
}

interface Recommendation {
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

interface TurnScore {
  turn: number;
  userMessage: string;
  aiResponse: string;
  suggestedReplies: string[];
  phase: string;
  readiness: number;
  scores: {
    responseLength: "pass" | "fail";    // Max 2 sentences
    asksOneQuestion: "pass" | "fail" | "na";  // Only 1 question per turn
    noRepeatQuestions: "pass" | "fail";  // Doesn't re-ask known info
    showsDirections: "pass" | "fail" | "na";  // Shows directions by turn 2-3
    pillsShort: "pass" | "fail" | "na"; // Suggested replies < 20 chars
    acknowledgesContext: "pass" | "fail"; // References what user said
  };
  issues: string[];
}

interface PersonaResult {
  id: string;
  title: string;
  turns: TurnScore[];
  finalContext: Record<string, unknown>;
  recommendations: Recommendation[];
  overallScores: {
    conversationQuality: number;  // 0-1
    contextExtraction: number;    // 0-1
    recommendationRelevance: number; // 0-1
    budgetCompliance: number;     // 0-1
    turnsToComplete: number;      // actual turn count
    totalDurationMs: number;
  };
  issues: string[];
  transcript: string;  // Full readable transcript
}

// ── Scoring helpers ────────────────────────────────────────────────

function countSentences(text: string): number {
  // Split on sentence-ending punctuation followed by space or end
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  return sentences.length;
}

function countQuestions(text: string): number {
  return (text.match(/\?/g) || []).length;
}

function hasDirections(text: string): boolean {
  // Directions are framed as quoted messages with emoji
  return /['"][^'"]{10,}['"]/.test(text) || /[🧘🎨☕🔧✨🎁💪🍳🎸📸]/.test(text);
}

function scoreTurn(
  turn: number,
  userMsg: string,
  aiResponse: string,
  context: Record<string, unknown>,
  prevContext: Record<string, unknown>,
  suggestedReplies: string[],
): TurnScore {
  const issues: string[] = [];

  // Response length: max 2 sentences
  const sentenceCount = countSentences(aiResponse);
  const responseLength = sentenceCount <= 3 ? "pass" : "fail"; // 3 = generous
  if (responseLength === "fail") issues.push(`Response too long: ${sentenceCount} sentences`);

  // One question per turn
  const questionCount = countQuestions(aiResponse);
  const asksOneQuestion = questionCount <= 1 ? "pass" : questionCount === 0 ? "na" : "fail";
  if (asksOneQuestion === "fail") issues.push(`Asked ${questionCount} questions (max 1)`);

  // No repeat questions
  const noRepeatQuestions = "pass"; // Would need NLP to properly check

  // Shows directions by turn 2-3
  const showsDirections = turn >= 1 && turn <= 2
    ? (hasDirections(aiResponse) ? "pass" : "fail")
    : "na";
  if (turn >= 2 && showsDirections === "fail" && (context as { phase?: string }).phase !== "complete") {
    issues.push(`Turn ${turn + 1}: Should show gift directions by now`);
  }

  // Suggested replies under 20 chars
  const longPills = suggestedReplies.filter(r => r.length > 20);
  const pillsShort = suggestedReplies.length === 0 ? "na" :
    longPills.length === 0 ? "pass" : "fail";
  if (pillsShort === "fail") {
    issues.push(`Pills too long: ${longPills.map(p => `"${p}" (${p.length})`).join(", ")}`);
  }

  // Acknowledges context (references something user said)
  const userWords = userMsg.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const aiLower = aiResponse.toLowerCase();
  const matchedWords = userWords.filter(w => aiLower.includes(w));
  const acknowledgesContext = matchedWords.length >= 1 ? "pass" : "fail";
  if (acknowledgesContext === "fail") {
    issues.push(`AI doesn't reference user's message`);
  }

  return {
    turn,
    userMessage: userMsg,
    aiResponse,
    suggestedReplies,
    phase: (context as { phase?: string }).phase || "unknown",
    readiness: (context as { readiness?: number }).readiness || 0,
    scores: {
      responseLength,
      asksOneQuestion,
      noRepeatQuestions,
      showsDirections,
      pillsShort,
      acknowledgesContext,
    },
    issues,
  };
}

function scoreContextExtraction(
  finalContext: Record<string, unknown>,
  expected: PersonaScoring["context_should_have"],
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let hits = 0;
  let checks = 0;

  // Name extracted
  checks++;
  const recipient = finalContext.recipient as Record<string, unknown> | undefined;
  const extractedName = String(recipient?.name || "").toLowerCase();
  if (extractedName.includes(expected.name.toLowerCase())) {
    hits++;
  } else {
    issues.push(`Name: expected "${expected.name}", got "${recipient?.name || "null"}"`);
  }

  // Relationship
  checks++;
  const extractedRel = String(recipient?.relationship || "").toLowerCase();
  if (extractedRel.includes(expected.relationship.toLowerCase()) ||
      expected.relationship.toLowerCase().includes(extractedRel)) {
    hits++;
  } else {
    issues.push(`Relationship: expected "${expected.relationship}", got "${recipient?.relationship || "null"}"`);
  }

  // Occasion
  checks++;
  const occasion = finalContext.occasion as Record<string, unknown> | undefined;
  const extractedOcc = String(occasion?.type || "").toLowerCase();
  if (extractedOcc.includes(expected.occasion.toLowerCase()) ||
      expected.occasion.toLowerCase().includes(extractedOcc)) {
    hits++;
  } else {
    issues.push(`Occasion: expected "${expected.occasion}", got "${occasion?.type || "null"}"`);
  }

  // At least one interest extracted
  checks++;
  const interests = (recipient?.interests || []) as string[];
  const interestsLower = interests.map((i: string) => i.toLowerCase());
  const matchedInterest = expected.interests_any.some(ei =>
    interestsLower.some(i => i.includes(ei.toLowerCase()) || ei.toLowerCase().includes(i))
  );
  if (matchedInterest) {
    hits++;
  } else {
    issues.push(`Interests: expected any of [${expected.interests_any.join(", ")}], got [${interests.join(", ")}]`);
  }

  // Budget captured
  checks++;
  const gift = finalContext.gift as Record<string, unknown> | undefined;
  const extractedBudget = String(gift?.budget || "");
  if (extractedBudget.includes(expected.budget_contains)) {
    hits++;
  } else {
    issues.push(`Budget: expected to contain "${expected.budget_contains}", got "${extractedBudget}"`);
  }

  return { score: checks > 0 ? hits / checks : 0, issues };
}

// Interest expansion for relevance scoring
const INTEREST_EXPANSIONS: Record<string, string[]> = {
  cooking: ["cooking", "cook", "kitchen", "chef", "spoon", "pan", "knife", "culinary", "recipe", "food", "grill", "bake", "spice"],
  coffee: ["coffee", "espresso", "brew", "roast", "latte", "café", "mug", "grinder", "bean"],
  hiking: ["hiking", "hike", "trail", "outdoor", "trek", "camp", "nature", "backpack"],
  tea: ["tea", "loose leaf", "steep", "infuse", "kettle", "ceremony", "matcha"],
  photography: ["photography", "photo", "camera", "film", "lens", "analog", "darkroom", "instant"],
  food: ["food", "foodie", "restaurant", "dining", "culinary", "gourmet", "tasting", "chef"],
  restaurant: ["restaurant", "dining", "reservation", "tasting", "food experience", "supper"],
  pottery: ["pottery", "ceramic", "clay", "kiln", "glaze", "handmade"],
  reading: ["reading", "book", "read", "literary", "novel", "library", "fiction"],
  sneakers: ["sneakers", "shoes", "kicks", "footwear", "nike", "jordan"],
  streetwear: ["streetwear", "fashion", "style", "clothing", "apparel", "wear"],
  gaming: ["gaming", "game", "console", "controller", "play", "gamer"],
  garden: ["garden", "plant", "grow", "seed", "herb", "green", "soil"],
};

function scoreRecommendationRelevance(
  recs: Recommendation[],
  expectedInterests: string[],
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let totalScore = 0;

  const expandedKeywords = new Set<string>();
  for (const interest of expectedInterests) {
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
      issues.push(`No interest match: "${rec.name}" (expected: ${expectedInterests.join(", ")})`);
    }
  }

  return { score: recs.length > 0 ? totalScore / recs.length : 0, issues };
}

// ── Main runner ────────────────────────────────────────────────────

async function runPersona(persona: Persona): Promise<PersonaResult> {
  const sessionId = `mtt-${persona.id}-${Date.now()}`;
  const startMs = Date.now();
  const history: ConversationMessage[] = [];
  const turnScores: TurnScore[] = [];
  let context: Record<string, unknown> = {};
  let prevContext: Record<string, unknown> = {};
  let turnCount = 0;
  let transcript = `# ${persona.title}\n_${persona.description}_\n\n`;

  // Create a gift_session row with our custom ID so the admin replay page works
  try {
    await fetch(`${BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        recipientName: persona.scoring.context_should_have.name,
      }),
    });
  } catch { /* non-critical */ }

  // Run each turn
  for (const turn of persona.turns) {
    const chatRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: turn.message,
        history: history.map(m => ({ role: m.role, content: m.content })),
        accumulatedContext: Object.keys(context).length > 0 ? context : null,
        turnCount,
        sessionId,
      }),
    });

    const data = await chatRes.json();

    if (data.error) {
      transcript += `**USER (turn ${turnCount + 1})**: ${turn.message}\n\n`;
      transcript += `**ERROR**: ${data.error}\n\n`;
      turnCount++;
      continue;
    }

    const aiResponse = data.response || "";
    const newContext = data.context || {};
    const suggestedReplies = newContext.suggestedReplies || [];

    // Update history
    history.push({ role: "user", content: turn.message });
    history.push({ role: "assistant", content: aiResponse, context: newContext });

    // Score this turn
    const turnScore = scoreTurn(turnCount, turn.message, aiResponse, newContext, context, suggestedReplies);
    turnScores.push(turnScore);

    // Build transcript
    transcript += `**USER (turn ${turnCount + 1})**: ${turn.message}\n`;
    transcript += `_Intent: ${turn.intent}_\n\n`;
    transcript += `**AI (turn ${turnCount + 1})**: ${aiResponse}\n`;
    transcript += `> Phase: ${newContext.phase || "?"} | Readiness: ${newContext.readiness || 0}\n`;
    if (suggestedReplies.length > 0) {
      transcript += `> Pills: ${suggestedReplies.map((r: string) => `[${r}]`).join(" ")}\n`;
    }
    if (turnScore.issues.length > 0) {
      transcript += `> Issues: ${turnScore.issues.join("; ")}\n`;
    }
    transcript += "\n";

    prevContext = context;
    context = newContext;
    turnCount = data.turnCount || turnCount + 1;
  }

  // Save conversation context to gift_session
  try {
    await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gift_context: context }),
    });
  } catch { /* non-critical */ }

  // Now fetch recommendations if conversation completed
  let recs: Recommendation[] = [];
  if ((context as { phase?: string }).phase === "complete" || turnCount >= 3) {
    transcript += `---\n\n### Fetching recommendations...\n\n`;

    const recRes = await fetch(`${BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, sessionId }),
    });
    const recData = await recRes.json();
    recs = recData.recommendations || [];

    for (let i = 0; i < recs.length; i++) {
      const slot = ["TOP PICK", "GREAT MATCH", "WILD CARD"][i] || `SLOT ${i}`;
      const r = recs[i];
      transcript += `**${slot}**: ${r.name} by ${r.brand} — $${r.price} [${r.category}]\n`;
      transcript += `- Why: ${r.whyThisFits}\n`;
      transcript += `- Says: ${r.whatThisSays}\n`;
      transcript += `- Usage: ${r.usageSignal}\n\n`;
    }
  } else {
    transcript += `\n**WARNING**: Conversation did not reach "complete" phase after ${turnCount} turns (phase: ${(context as { phase?: string }).phase})\n`;
  }

  // ── Post-Recommendation Simulation ───────────────────────────────
  const postRecs = (persona as unknown as { postRecs?: PostRecsConfig }).postRecs;
  let selectedRec: Recommendation | null = null;
  let cardMessage: string | null = null;

  if (recs.length > 0 && postRecs) {
    transcript += `\n---\n\n### Post-Recommendation Simulation\n`;
    transcript += `_Persona behavior: ${postRecs.behavior}_\n\n`;

    // 1. Simulate card reactions
    if (postRecs.reactions) {
      transcript += `**Reactions:**\n`;
      for (const [slot, reaction] of Object.entries(postRecs.reactions)) {
        const slotIdx = parseInt(slot.replace("slot", ""));
        if (recs[slotIdx]) {
          transcript += `- ${recs[slotIdx].name}: ${reaction}\n`;
          // Send reaction to API
          await fetch(`${BASE_URL}/api/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "card_reaction",
              sessionId,
              data: { productId: recs[slotIdx].id, reaction },
            }),
          }).catch(() => {});
        }
      }
      transcript += "\n";
    }

    // 2. Decide which product to pick (or refine)
    transcript += `**Decision logic:** ${postRecs.decision}\n\n`;

    // Find the best matching rec based on persona behavior
    if (postRecs.behavior === "quick_decider") {
      selectedRec = recs[0]; // Always picks first
    } else if (postRecs.behavior === "urgent") {
      // Picks first experiential/digital item, or first item if none
      selectedRec = recs.find(r => r.category === "experiential" || r.category === "consumable") || recs[0];
    } else {
      // Analytical/emotional/indecisive: pick the one with best reaction
      const goodSlots = Object.entries(postRecs.reactions || {})
        .filter(([, r]) => r === "relevant")
        .map(([s]) => parseInt(s.replace("slot", "")));
      selectedRec = goodSlots.length > 0 ? recs[goodSlots[0]] : recs[0];
    }

    if (selectedRec) {
      transcript += `**Selected:** ${selectedRec.name} by ${selectedRec.brand} ($${selectedRec.price})\n`;
      transcript += `_Reason: Persona would pick this because: ${postRecs.decision}_\n\n`;

      // 3. Generate card message
      transcript += `**Card generation:**\n`;
      if (postRecs.cardEdit === "Skips the card entirely — it's a secret santa, no card needed." ||
          postRecs.cardEdit?.startsWith("Skips card")) {
        transcript += `_Persona skips card._\n\n`;
      } else {
        try {
          const cardRes = await fetch(`${BASE_URL}/api/cards/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              context,
              product: {
                id: selectedRec.id,
                name: selectedRec.name,
                brand: selectedRec.brand,
                price: selectedRec.price,
                category: selectedRec.category,
              },
              sessionId,
            }),
          });
          const cardData = await cardRes.json();
          if (cardData.card?.message) {
            cardMessage = cardData.card.message;
            transcript += `AI card: "${cardMessage}"\n`;
            if (postRecs.cardEdit) {
              transcript += `_Persona would: ${postRecs.cardEdit}_\n`;
            }
            if (cardData.presentation) {
              transcript += `\n**Presentation guide:**\n`;
              if (cardData.presentation.wrappingIdea) transcript += `- Wrapping: ${cardData.presentation.wrappingIdea}\n`;
              if (cardData.presentation.timingAdvice) transcript += `- Timing: ${cardData.presentation.timingAdvice}\n`;
              if (cardData.presentation.whatToSay) transcript += `- Say: ${cardData.presentation.whatToSay}\n`;
            }

            // Persist card + presentation + selected product to gift_session for admin replay
            await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                selected_product_id: selectedRec.id,
                selected_product_data: {
                  id: selectedRec.id,
                  name: selectedRec.name,
                  brand: selectedRec.brand,
                  price: selectedRec.price,
                  category: selectedRec.category,
                  buyUrl: selectedRec.id, // placeholder
                },
                card_content: cardData.card,
                presentation_guide: cardData.presentation,
                gift_context: context,
                status: "completed",
              }),
            }).catch(() => {});
          }
        } catch {
          transcript += `_Card generation failed._\n`;
        }
        transcript += "\n";
      }

      // 4. Buy behavior
      transcript += `**Buy behavior:** ${postRecs.buyBehavior}\n\n`;
    }

    // 5. Would they refine?
    transcript += `**Would refine?** ${postRecs.wouldRefine}\n\n`;
  }

  const durationMs = Date.now() - startMs;

  // Score conversation quality
  const turnPassRates = turnScores.map(t => {
    const checks = Object.values(t.scores).filter(s => s !== "na");
    const passes = checks.filter(s => s === "pass").length;
    return checks.length > 0 ? passes / checks.length : 1;
  });
  const conversationQuality = turnPassRates.length > 0
    ? turnPassRates.reduce((a, b) => a + b, 0) / turnPassRates.length
    : 0;

  // Score context extraction
  const extraction = scoreContextExtraction(context, persona.scoring.context_should_have);

  // Score recommendation relevance
  const relevance = scoreRecommendationRelevance(recs, persona.scoring.context_should_have.interests_any);

  // Budget compliance
  const budgetNum = parseFloat(persona.scoring.context_should_have.budget_contains);
  const budgetMax = budgetNum * 1.15; // 15% tolerance
  const budgetMin = budgetNum * 0.3;  // reasonable floor
  const budgetCompliant = recs.filter(r => r.price >= budgetMin && r.price <= budgetMax).length;
  const budgetScore = recs.length > 0 ? budgetCompliant / recs.length : 0;

  const allIssues = [
    ...turnScores.flatMap(t => t.issues),
    ...extraction.issues,
    ...relevance.issues,
  ];

  // Add to transcript
  transcript += `\n---\n\n### Scores\n`;
  transcript += `| Dimension | Score |\n|-----------|-------|\n`;
  transcript += `| Conversation quality | ${(conversationQuality * 100).toFixed(0)}% |\n`;
  transcript += `| Context extraction | ${(extraction.score * 100).toFixed(0)}% |\n`;
  transcript += `| Recommendation relevance | ${(relevance.score * 100).toFixed(0)}% |\n`;
  transcript += `| Budget compliance | ${(budgetScore * 100).toFixed(0)}% |\n`;
  transcript += `| Turns to complete | ${turnCount} |\n`;
  transcript += `| Duration | ${durationMs}ms |\n`;

  if (allIssues.length > 0) {
    transcript += `\n### Issues\n`;
    for (const issue of allIssues) {
      transcript += `- ${issue}\n`;
    }
  }

  return {
    id: persona.id,
    title: persona.title,
    turns: turnScores,
    finalContext: context,
    recommendations: recs,
    overallScores: {
      conversationQuality: Math.round(conversationQuality * 100) / 100,
      contextExtraction: Math.round(extraction.score * 100) / 100,
      recommendationRelevance: Math.round(relevance.score * 100) / 100,
      budgetCompliance: Math.round(budgetScore * 100) / 100,
      turnsToComplete: turnCount,
      totalDurationMs: durationMs,
    },
    issues: allIssues,
    transcript,
  };
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const personas: Persona[] = JSON.parse(fs.readFileSync("test/realistic-personas.json", "utf-8"));

  console.log(`\n=== Multi-Turn Conversation Quality Test ===`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Personas: ${personas.length}\n`);

  const results: PersonaResult[] = [];
  let fullTranscript = `# Multi-Turn Conversation Test Results\n_${new Date().toISOString()}_\n\n`;

  for (const persona of personas) {
    process.stdout.write(`  ${persona.id}... `);
    try {
      const result = await runPersona(persona);
      results.push(result);
      fullTranscript += result.transcript + "\n\n---\n\n";
      console.log(`OK (conv=${result.overallScores.conversationQuality} ctx=${result.overallScores.contextExtraction} rel=${result.overallScores.recommendationRelevance} budget=${result.overallScores.budgetCompliance})`);
    } catch (err) {
      console.log(`FAILED: ${err}`);
    }
  }

  // Summary table
  console.log(`\n=== SCORES ===\n`);
  const dims = ["conversationQuality", "contextExtraction", "recommendationRelevance", "budgetCompliance", "turnsToComplete", "totalDurationMs"] as const;
  console.log(`| Dimension | ${results.map(r => r.id.slice(0, 12).padEnd(12)).join(" | ")} | AVG |`);
  console.log(`|-----------|${results.map(() => "-".repeat(12)).join("|")}|-----|`);

  for (const dim of dims) {
    const values = results.map(r => r.overallScores[dim]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const format = dim === "totalDurationMs"
      ? (v: number) => `${(v / 1000).toFixed(1)}s`.padStart(12)
      : dim === "turnsToComplete"
        ? (v: number) => String(v).padStart(12)
        : (v: number) => v.toFixed(2).padStart(12);
    console.log(`| ${dim.padEnd(25)} | ${values.map(format).join(" | ")} | ${dim === "totalDurationMs" ? `${(avg / 1000).toFixed(1)}s` : dim === "turnsToComplete" ? avg.toFixed(1) : avg.toFixed(2)} |`);
  }

  // All issues
  const allIssues = results.flatMap(r => r.issues.map(i => `[${r.id}] ${i}`));
  if (allIssues.length > 0) {
    console.log(`\n=== ISSUES (${allIssues.length}) ===\n`);
    for (const issue of allIssues.slice(0, 20)) {
      console.log(`  - ${issue}`);
    }
    if (allIssues.length > 20) console.log(`  ... and ${allIssues.length - 20} more`);
  }

  // Write full transcript
  fs.writeFileSync("test/multi-turn-transcripts.md", fullTranscript);
  console.log(`\nFull transcripts: test/multi-turn-transcripts.md`);

  // Write JSON results
  fs.writeFileSync("test/multi-turn-results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    personas: results.map(r => ({
      id: r.id,
      title: r.title,
      scores: r.overallScores,
      issueCount: r.issues.length,
      recCount: r.recommendations.length,
    })),
    averageScores: Object.fromEntries(
      (["conversationQuality", "contextExtraction", "recommendationRelevance", "budgetCompliance"] as const).map(dim => {
        const values = results.map(r => r.overallScores[dim]);
        return [dim, Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100];
      })
    ),
    totalIssues: allIssues.length,
  }, null, 2));
  console.log(`JSON results: test/multi-turn-results.json`);
}

main().catch(console.error);
