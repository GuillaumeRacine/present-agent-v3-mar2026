// ── Feedback System ───────────────────────────────────────────────
// Captures signals at every stage of the gift journey to improve
// recommendations over time. Two types of signals:
//
// 1. IMPLICIT — captured automatically from user behavior
// 2. EXPLICIT — captured via lightweight UI prompts
//
// Feedback flows into the recommender via the /api/feedback endpoint
// and is stored per-session for analysis + per-user for personalization.

import { getDb } from "./db";

// ── Signal Types ─────────────────────────────────────────────────

/**
 * Implicit signals — captured without asking the user anything.
 * These are the highest-volume, lowest-friction signals.
 */
export interface ImplicitSignals {
  // Conversation quality
  conversationTurns: number;          // Fewer = better (user gave clear context)
  suggestedRepliesUsed: number;       // Did they tap pills or type freely?
  totalSuggestedReplies: number;      // Denominator for pill usage rate
  conversationDurationMs: number;     // Time from first message to profile complete
  abandonedAtPhase?: string;          // If they left, which phase?

  // Recommendation engagement
  recommendationViewDurationMs: number; // Time spent looking at cards
  cardsExpanded: string[];              // Which "How to give it" details were opened
  cardScrollDepth: number;              // 0-1, how far they scrolled through cards

  // Selection behavior
  selectedProductId: string | null;     // Which product they chose (null = none)
  selectedSlot: number | null;          // 0=Top Pick, 1=Great Match, 2=Wild Card
  timeToSelectMs: number | null;        // Time from cards shown to CTA click
  usedNotQuiteRight: boolean;           // Did they click "Not quite right?"
  refinementRounds: number;             // How many times they re-entered conversation

  // Post-selection
  returnedAfterSelection: boolean;      // Came back to pick another?
  selectedMultiple: string[];           // All products opened (not just first)
}

/**
 * Explicit signals — lightweight UI prompts at natural moments.
 * These are lower-volume but higher-signal.
 */
export interface ExplicitFeedback {
  // Quick reaction (shown after CTA click, before redirect)
  quickReaction?: "perfect" | "good_enough" | "not_great" | null;

  // Per-card feedback (optional, shown as subtle thumbs)
  cardReactions: {
    productId: string;
    reaction: "relevant" | "irrelevant" | "already_have" | "too_expensive" | "too_cheap" | "wrong_vibe";
  }[];

  // Post-purchase follow-up (sent via email/push 7 days later)
  postPurchase?: {
    didBuy: boolean;                    // Did they actually complete the purchase?
    recipientReaction?: "loved_it" | "liked_it" | "meh" | "returned" | null;
    wouldUseAgain: boolean;
    freeformNote?: string;              // "She actually cried when she opened it"
  };

  // Conversation quality (shown at profile card stage)
  conversationFelt?: "too_many_questions" | "just_right" | "too_few_questions" | null;
}

/**
 * The complete feedback record for one gift session.
 */
export interface SessionFeedback {
  sessionId: string;
  userId?: string;                      // For cross-session learning
  timestamp: string;
  recipientName?: string;
  occasion?: string;
  relationship?: string;

  // The full context the recommender worked with
  giftContext: Record<string, unknown>;

  // What was recommended
  recommendations: {
    productId: string;
    slot: number;                       // 0, 1, 2
    matchScore: number;
    category: string;
  }[];

  // Signals
  implicit: ImplicitSignals;
  explicit: ExplicitFeedback;

  // Computed quality scores (filled by analysis)
  qualityScores?: {
    conversationEfficiency: number;     // 0-1: fewer turns = higher
    recommendationRelevance: number;    // 0-1: based on selection + reactions
    userSatisfaction: number;           // 0-1: composite of explicit signals
    overallSessionQuality: number;      // 0-1: weighted composite
  };
}

// ── Storage (SQLite) ─────────────────────────────────────────────

export function saveFeedback(feedback: SessionFeedback): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO session_feedback (session_id, user_id, feedback_data, quality_scores, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(
    feedback.sessionId,
    feedback.userId || null,
    JSON.stringify(feedback),
    feedback.qualityScores ? JSON.stringify(feedback.qualityScores) : null,
  );
}

export function loadFeedback(sessionId: string): SessionFeedback | null {
  const db = getDb();
  const row = db
    .prepare("SELECT feedback_data FROM session_feedback WHERE session_id = ?")
    .get(sessionId) as { feedback_data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.feedback_data);
}

export function loadUserHistory(userId: string): SessionFeedback[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT feedback_data FROM session_feedback WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as { feedback_data: string }[];
  const sessions: SessionFeedback[] = [];
  for (const row of rows) {
    try {
      sessions.push(JSON.parse(row.feedback_data));
    } catch { /* skip corrupted files */ }
  }
  return sessions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ── Quality Scoring ──────────────────────────────────────────────

export function computeQualityScores(feedback: SessionFeedback): SessionFeedback["qualityScores"] {
  const { implicit, explicit } = feedback;

  // Conversation efficiency: 3 turns = 1.0, 6+ turns = 0.3
  const conversationEfficiency = Math.max(0.3, 1 - (implicit.conversationTurns - 3) * 0.175);

  // Recommendation relevance: did they pick one? which slot? any negative reactions?
  let recommendationRelevance = 0.5; // baseline
  if (implicit.selectedProductId) {
    recommendationRelevance = 0.8;
    if (implicit.selectedSlot === 0) recommendationRelevance = 0.95; // picked top pick = strong signal
    if (implicit.selectedSlot === 2) recommendationRelevance = 0.85; // picked wild card = system showed range
  }
  if (implicit.usedNotQuiteRight) recommendationRelevance -= 0.2;
  // Card reactions
  const negativeReactions = explicit.cardReactions.filter(r =>
    ["irrelevant", "wrong_vibe"].includes(r.reaction)
  ).length;
  recommendationRelevance -= negativeReactions * 0.15;
  recommendationRelevance = Math.max(0, Math.min(1, recommendationRelevance));

  // User satisfaction: composite of explicit signals
  let userSatisfaction = 0.5;
  if (explicit.quickReaction === "perfect") userSatisfaction = 1.0;
  else if (explicit.quickReaction === "good_enough") userSatisfaction = 0.7;
  else if (explicit.quickReaction === "not_great") userSatisfaction = 0.3;
  if (explicit.postPurchase?.recipientReaction === "loved_it") userSatisfaction = Math.max(userSatisfaction, 0.95);
  else if (explicit.postPurchase?.recipientReaction === "returned") userSatisfaction = 0.1;
  if (explicit.conversationFelt === "just_right") userSatisfaction = Math.min(1, userSatisfaction + 0.1);

  // Overall: weighted composite
  const overallSessionQuality =
    conversationEfficiency * 0.2 +
    recommendationRelevance * 0.4 +
    userSatisfaction * 0.4;

  return {
    conversationEfficiency,
    recommendationRelevance,
    userSatisfaction,
    overallSessionQuality,
  };
}

// ── Recommender Feedback Loop ────────────────────────────────────
// These functions extract learnings from feedback history to improve
// future recommendations for the same user or similar contexts.

export interface RecommenderInsights {
  // Per-user patterns
  preferredCategories: { category: string; score: number }[];
  preferredPriceTier: string | null;
  avoidProducts: string[];              // Products with negative reactions
  preferredSlot: number | null;         // Do they usually pick Top Pick or Wild Card?

  // Per-relationship patterns
  relationshipPreferences: {
    relationship: string;
    preferredCategories: string[];
    avgBudget: number;
    avgSatisfaction: number;
  }[];

  // Global patterns (for cold start)
  topPerformingProducts: { productId: string; avgScore: number; pickCount: number }[];
  worstPerformingProducts: { productId: string; avgScore: number; negativeCount: number }[];
  categoryPerformance: { category: string; avgSatisfaction: number; pickRate: number }[];
}

export function extractRecommenderInsights(sessions: SessionFeedback[]): RecommenderInsights {
  const categoryCounts: Record<string, { picks: number; total: number; satisfaction: number }> = {};
  const productScores: Record<string, { picks: number; negatives: number; totalScore: number }> = {};
  const relationshipMap: Record<string, { categories: string[]; budgets: number[]; satisfactions: number[] }> = {};
  const slotPicks = [0, 0, 0]; // count of picks per slot

  for (const session of sessions) {
    const scores = session.qualityScores ?? computeQualityScores(session)!;

    // Track which slot the user picked
    if (session.implicit.selectedSlot !== null) {
      slotPicks[session.implicit.selectedSlot]++;
    }

    // Track category performance
    for (const rec of session.recommendations) {
      if (!categoryCounts[rec.category]) categoryCounts[rec.category] = { picks: 0, total: 0, satisfaction: 0 };
      categoryCounts[rec.category].total++;
      if (session.implicit.selectedProductId === rec.productId) {
        categoryCounts[rec.category].picks++;
        categoryCounts[rec.category].satisfaction += scores.userSatisfaction;
      }
    }

    // Track product-level performance
    for (const rec of session.recommendations) {
      if (!productScores[rec.productId]) productScores[rec.productId] = { picks: 0, negatives: 0, totalScore: 0 };
      if (session.implicit.selectedProductId === rec.productId) {
        productScores[rec.productId].picks++;
        productScores[rec.productId].totalScore += scores.recommendationRelevance;
      }
      const negReaction = session.explicit.cardReactions.find(
        r => r.productId === rec.productId && ["irrelevant", "wrong_vibe"].includes(r.reaction)
      );
      if (negReaction) productScores[rec.productId].negatives++;
    }

    // Track relationship patterns
    const rel = session.relationship || "unknown";
    if (!relationshipMap[rel]) relationshipMap[rel] = { categories: [], budgets: [], satisfactions: [] };
    if (session.implicit.selectedProductId) {
      const selectedRec = session.recommendations.find(r => r.productId === session.implicit.selectedProductId);
      if (selectedRec) relationshipMap[rel].categories.push(selectedRec.category);
    }
    relationshipMap[rel].satisfactions.push(scores.userSatisfaction);
    const budgetStr = (session.giftContext?.gift as Record<string, string>)?.budget;
    if (budgetStr) {
      const nums = budgetStr.match(/\d+/g)?.map(Number) || [];
      if (nums.length > 0) relationshipMap[rel].budgets.push(nums.reduce((a, b) => a + b) / nums.length);
    }
  }

  // Build sorted outputs
  const preferredCategories = Object.entries(categoryCounts)
    .map(([category, { picks, total }]) => ({ category, score: total > 0 ? picks / total : 0 }))
    .sort((a, b) => b.score - a.score);

  const topPerformingProducts = Object.entries(productScores)
    .filter(([, s]) => s.picks > 0)
    .map(([productId, s]) => ({ productId, avgScore: s.totalScore / s.picks, pickCount: s.picks }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const worstPerformingProducts = Object.entries(productScores)
    .filter(([, s]) => s.negatives > 0)
    .map(([productId, s]) => ({ productId, avgScore: s.totalScore / Math.max(s.picks, 1), negativeCount: s.negatives }))
    .sort((a, b) => b.negativeCount - a.negativeCount);

  const relationshipPreferences = Object.entries(relationshipMap)
    .map(([relationship, data]) => ({
      relationship,
      preferredCategories: Array.from(new Set(data.categories)),
      avgBudget: data.budgets.length > 0 ? data.budgets.reduce((a, b) => a + b) / data.budgets.length : 0,
      avgSatisfaction: data.satisfactions.length > 0 ? data.satisfactions.reduce((a, b) => a + b) / data.satisfactions.length : 0,
    }));

  const maxSlot = slotPicks.indexOf(Math.max(...slotPicks));

  return {
    preferredCategories,
    preferredPriceTier: null, // TODO: derive from budget patterns
    avoidProducts: worstPerformingProducts.filter(p => p.negativeCount >= 2).map(p => p.productId),
    preferredSlot: slotPicks[maxSlot] > 0 ? maxSlot : null,
    relationshipPreferences,
    topPerformingProducts,
    worstPerformingProducts,
    categoryPerformance: preferredCategories.map(pc => ({
      category: pc.category,
      avgSatisfaction: categoryCounts[pc.category]?.satisfaction / Math.max(categoryCounts[pc.category]?.picks, 1) || 0,
      pickRate: pc.score,
    })),
  };
}
