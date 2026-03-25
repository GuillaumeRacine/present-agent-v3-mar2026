# Implementation Specs -- Top 3 JTBD Fixes

Source: JTBD analysis + voice memos (2026-03-25)
Repo: `present-agent3`

---

## Spec 1: Fix Budget Compliance

**Job:** 3.1 -- "Set a budget (soft, not hard)" + trust issue
**Impact:** High | **Effort:** Low (1-2 hours)
**Test score:** 3.8/5 -- "$75" yields $85-95 products

### Root Cause

The system has 3 layers of budget enforcement, but they fight each other:

1. **SQL pre-filter** (`recommend.ts:207-218`): Uses `budgetRange.max * 1.1` (110% ceiling) for ranges, `* 1.05` for "under" budgets. But for a single number like "$75", `parseBudgetRange` returns `{min: 45, max: 75}` -- the floor is 60% and ceiling is exact. Good.

2. **Claude prompt** (`recommend.ts:463`): Says "Do not exceed the budget ceiling by even $1." Good instruction.

3. **Post-filter** (`recommend.ts:570-605`): Uses `hardMax = budgetRange.max` for single numbers (no tolerance), `* 1.05` for ranges. But the replacement logic (`recommend.ts:585-599`) uses the same pool that was pre-filtered at 110%, so replacements can still be 10% over.

**The bug:** When Claude picks products at 105-110% of budget (within pre-filter range but above post-filter ceiling), the post-filter replaces them with random candidates using `buildFallbackCopy`. These replacements have generic copy ("A thoughtful practical pick...") -- this is why slots 2-3 feel irrelevant. It's not just a budget bug; it cascades into quality.

### Fix

**File: `lib/recommend.ts`**

#### Change 1: Tighten pre-filter to match post-filter

```typescript
// Line 207-218: Change pre-filter ceiling to match post-filter exactly
if (budgetRange) {
  const isUnderBudget = budgetRange.min === 0;
  const isSingleNumber = !context.gift?.budget?.includes("-");
  conditions.push("price >= ? AND price <= ?");
  params.push(
    isUnderBudget ? 0 : budgetRange.min * 0.85,
    isSingleNumber ? budgetRange.max : budgetRange.max * 1.05
  );
}
```

This ensures Claude only sees products that will pass the post-filter. No more replacements needed for budget violations.

#### Change 2: If replacement is needed, call Claude again for just that slot

When a post-filter replacement is needed (rare after Change 1), instead of using `buildFallbackCopy`, make a targeted Claude call:

```typescript
// After line 599, instead of buildFallbackCopy:
if (replacement) {
  // Quick Claude call for just this product's copy
  const slotCopy = await generateSlotCopy(replacement, context, slotIndex);
  compliant.push({
    product: replacement,
    matchScore: bad.matchScore * 0.85,
    ...slotCopy,
  });
}
```

Add a lightweight `generateSlotCopy` function that takes one product + context and returns whyThisFits/giftAngle/whatThisSays/usageSignal. ~200 tokens, fast.

#### Change 3: Add budget to the 3-card UI

Show the budget range the user stated above the cards. "Your budget: $50-100" makes violations obvious and builds trust. Users feel validated when every card is within range.

### Validation

```bash
# Run the multi-turn harness with budget-focused personas
npx tsx test/multi-turn-harness.ts --personas budget-strict
# Check: budget_compliant should be 1 for all 10 sessions
```

---

## Spec 2: Surface Past Gifts in New Sessions

**Job:** 2.3 -- "Remember past gifts and how they landed"
**Impact:** Medium | **Effort:** Low (1-2 hours)
**Current state:** `buildRecipientBrief()` exists and works well (`profiles.ts:142-199`). It's already injected into the chat system prompt (`chat/route.ts:172-178`). But it's only used when `recipientId` is passed.

### Root Cause

The brief is built and injected correctly, but:

1. **recipientId often missing at session start.** The chat starts before the user selects a recipient. The frontend sends `recipientId: null` until a match is found.

2. **No re-injection after match.** When the chat extracts a name (turn 1), it could match against known recipients, but doesn't trigger a re-injection of the brief.

3. **Past gifts not passed to recommender context.** `GiftContext.pastGifts` has `worked` and `failed` arrays (`recommend.ts:72-75`), but the chat never populates them. The recommender uses `getRecipientHistory` separately (`recommend.ts:355-381`) to exclude bad products, but doesn't tell Claude "she loved the yoga mat last year."

### Fix

**File: `app/api/chat/route.ts`**

#### Change 1: Auto-match recipient by name after turn 1

After extracting the context JSON from Gemini's response, fuzzy-match the recipient name against the user's saved recipients:

```typescript
// After parsing context from Gemini response (around line 200+)
if (!recipientId && extractedContext?.recipient?.name && userId) {
  const { findRecipientByName } = await import("@/lib/profiles");
  const match = findRecipientByName(userId, extractedContext.recipient.name);
  if (match) {
    recipientId = match.id;
    // Re-inject brief for next turn
    const brief = buildRecipientBrief(match.id);
    if (brief) {
      // Append to accumulated context so next turn sees it
      accumulatedContext._recipientBrief = brief;
    }
  }
}
```

**File: `lib/profiles.ts`**

#### Change 2: Add fuzzy name matching

```typescript
export function findRecipientByName(userId: string, name: string): Recipient | null {
  const db = getDb();
  // Exact match first
  let match = db.prepare(
    "SELECT * FROM recipients WHERE user_id = ? AND LOWER(name) = LOWER(?)"
  ).get(userId, name.trim()) as Recipient | undefined;
  if (match) return match;

  // Partial match (first name)
  const firstName = name.trim().split(" ")[0];
  match = db.prepare(
    "SELECT * FROM recipients WHERE user_id = ? AND LOWER(name) LIKE LOWER(?)"
  ).get(userId, `${firstName}%`) as Recipient | undefined;
  return match || null;
}
```

**File: `lib/recommend.ts`**

#### Change 3: Pass past gift context to Claude prompt

Around line 397-422 where `insightsBlock` is built, also inject recipient-specific history:

```typescript
// After the user insights block, add recipient history
if (recipientId) {
  try {
    const history = getRecipientHistory(recipientId);
    if (history.length > 0) {
      const loved = history.filter(h => h.recipient_reaction === "loved_it");
      const meh = history.filter(h => h.recipient_reaction === "meh" || h.recipient_reaction === "returned");
      const historyParts: string[] = [];
      if (loved.length > 0) {
        historyParts.push(`- Past gifts ${context.recipient?.name} LOVED: ${loved.map(h => h.product_name).join(", ")}`);
        historyParts.push(`  → Pick products in similar categories or that complement these`);
      }
      if (meh.length > 0) {
        historyParts.push(`- Past gifts that fell flat: ${meh.map(h => h.product_name).join(", ")}`);
        historyParts.push(`  → AVOID similar products or categories`);
      }
      if (historyParts.length > 0) {
        insightsBlock += `\n## Gift history for ${context.recipient?.name}\n${historyParts.join("\n")}\n`;
      }
    }
  } catch { /* non-critical */ }
}
```

### Validation

- Create a test recipient with 2+ past gifts
- Run a new session for that recipient
- Verify: chat references past gifts naturally, recommendations avoid "meh" products and align with "loved" categories

---

## Spec 3: Add Refinement Loop ("Not Quite Right")

**Job:** 4.3 -- "Say 'not quite' and refine without starting over"
**Impact:** High | **Effort:** Medium (3-4 hours)
**Current state:** The data model supports it (`feedback.ts:37` has `refinementRounds`, `events.ts:23` has `recs.refinement`, analytics track `refinementRate`). The chat prompt has a `refine` phase (`chat/route.ts:102`). The UI has a `refinementRounds` state variable (`page.tsx:53`). But the actual loop isn't wired up.

### What Exists (scaffolding)

| Piece | Location | Status |
|-------|----------|--------|
| `refinementRounds` state | `page.tsx:53` | Declared, never incremented |
| `phase: "refine"` in context | `chat/route.ts:102` | Defined in schema, never triggered by refinement |
| "Not quite right" button | `page.tsx:680` | Sets phase to `refine`, but doesn't pass rejection context |
| `recs.refinement` event type | `events.ts:23` | Defined, never emitted |
| `refinementRate` analytics | `analytics.ts:62-68` | Computed from events that don't exist yet |
| PostHog `not_quite_right` | `posthog.ts:170` | Ready |

### Design

When user clicks "Not quite right" on a recommendation set:

1. **Capture what's wrong** -- Quick options: "Too generic", "Wrong vibe", "Too expensive", "Already have something like this", or free text
2. **Return to chat** with context preserved + rejection reason
3. **Chat acknowledges and pivots** -- "Got it, those felt too generic. Let me think about [name] differently..."
4. **New recommendations** exclude rejected products + incorporate feedback
5. **Track as refinement round** in events + feedback

### Implementation

**File: `app/gift/[sessionId]/page.tsx`**

#### Change 1: Replace simple "Not quite right" with feedback capture

Current (line ~680):
```tsx
setContext((prev) => ({ ...prev, phase: "refine", readiness: 0.7 }));
```

Replace with a quick modal/dropdown:

```tsx
const [showRefineOptions, setShowRefineOptions] = useState(false);
const refineReasons = [
  { id: "generic", label: "Too generic" },
  { id: "vibe", label: "Wrong vibe" },
  { id: "expensive", label: "Too expensive" },
  { id: "cheap", label: "Too cheap" },
  { id: "have_it", label: "Already have something similar" },
  { id: "other", label: "Let me explain..." },
];

function handleRefine(reason: typeof refineReasons[0]) {
  const rejectedProducts = recommendations.map(r => ({
    id: r.product.id,
    name: r.product.name,
    reason: reason.id,
  }));

  // Track event
  trackEvent(sessionId, userId, "recs.refinement", {
    reason: reason.id,
    rejected: rejectedProducts,
    round: refinementRounds + 1,
  });

  setRefinementRounds(prev => prev + 1);
  setRecommendations(null); // Clear current recs
  setShowProfileCard(false);

  // Inject rejection context as a user message
  const refinementMessage = reason.id === "other"
    ? "" // Let user type freely
    : `These didn't feel right — ${reason.label.toLowerCase()}. Can we try a different direction?`;

  if (refinementMessage) {
    // Auto-send as user message
    handleSendMessage(refinementMessage, {
      _refinement: true,
      _rejectedProducts: rejectedProducts,
      _reason: reason.id,
    });
  } else {
    // Focus input, let user type
    setContext(prev => ({ ...prev, phase: "refine", readiness: 0.7 }));
    inputRef.current?.focus();
  }
}
```

**File: `app/api/chat/route.ts`**

#### Change 2: Handle refinement context in chat

When the chat receives a message with `_refinement: true` metadata:

```typescript
// Around line 160, after building contextParts
if (body._refinement) {
  const rejected = body._rejectedProducts || [];
  const reason = body._reason || "unknown";
  contextParts.push(`\n## Refinement Round ${body._refinementRound || 1}`);
  contextParts.push(`User rejected the previous recommendations.`);
  contextParts.push(`Reason: ${reason}`);
  if (rejected.length > 0) {
    contextParts.push(`Rejected products: ${rejected.map((r: any) => r.name).join(", ")}`);
  }
  contextParts.push(`\nAcknowledge briefly (1 sentence), then show 2-3 NEW directions that address the rejection reason. Do NOT repeat the same directions.`);
  contextParts.push(`If reason is "too expensive": suggest more affordable directions.`);
  contextParts.push(`If reason is "too generic": dig deeper into their specific interests.`);
  contextParts.push(`If reason is "wrong vibe": ask what vibe they're going for.`);
}
```

**File: `lib/recommend.ts`**

#### Change 3: Exclude rejected products in next recommendation round

```typescript
// In getRecommendations(), around line 352, after recipientId filtering:
// Also exclude products rejected in refinement
if (context._rejectedProductIds) {
  const rejectedIds = new Set(context._rejectedProductIds as string[]);
  candidates = candidates.filter(p => !rejectedIds.has(p.id));
}
```

The `GiftContext` type needs a new optional field:

```typescript
// Line 51-78, add to GiftContext:
_rejectedProductIds?: string[];  // Products user rejected in refinement
_refinementReason?: string;      // Why they rejected
```

#### Change 4: Cap refinement rounds

Max 2 refinement rounds. After that, show all remaining options and a "Just pick for me" escape hatch.

```typescript
// In the UI, after round 2:
if (refinementRounds >= 2) {
  // Show expanded view with 6+ options instead of 3
  // Add prominent "Just pick the best one for me" CTA
}
```

### Validation

1. Start a gift session, get recommendations
2. Click "Not quite right" → "Too generic"
3. Verify: chat acknowledges, shows new directions
4. Get new recommendations → verify none are from the rejected set
5. Check events table: `recs.refinement` event recorded with reason + rejected products
6. Check analytics dashboard: refinement rate computes correctly

---

## Implementation Order

```
1. Budget fix          (1-2h)  → Immediate trust improvement
2. Past gifts surface  (1-2h)  → AI feels smarter on second use
3. Refinement loop     (3-4h)  → Biggest UX gap closed
```

Total: ~6-8 hours of focused work. All three changes are backward-compatible and deploy independently.

---

## Files Modified (Summary)

| File | Spec 1 | Spec 2 | Spec 3 |
|------|--------|--------|--------|
| `lib/recommend.ts` | Pre-filter tightening, `generateSlotCopy` | Past gift injection to Claude | Rejected product exclusion |
| `lib/profiles.ts` | -- | `findRecipientByName` | -- |
| `app/api/chat/route.ts` | -- | Auto-match recipient | Refinement context handling |
| `app/gift/[sessionId]/page.tsx` | Budget display | -- | Refinement UI + flow |
| `lib/feedback.ts` | -- | -- | (already scaffolded) |
| `lib/events.ts` | -- | -- | (already scaffolded) |
