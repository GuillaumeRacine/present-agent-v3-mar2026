# Present Agent v3 — Bar Raiser Review

> Reviewer: Claude Opus 4.6 (built and tested the codebase hands-on)
> Date: 2026-03-25
> Context: Full session — security hardening, recommendation engine, UX redesign, testing harness, admin replay, doc cleanup

---

## Executive Summary

Present Agent v3 is a **strong MVP with a clear, defensible product insight**: gift-giving anxiety is an emotional problem, not a search problem. The 3-turn chat → 3-option recommendation → card message flow is well-designed and psychologically grounded.

**However, the app is stuck between prototype and product.** The core AI pipeline works, but the UX doesn't match the quality of the AI output. The recommendations are good — the way they're presented doesn't help the user decide. That's the #1 blocker to conversion.

**Overall score: 6.5/10** — strong foundation, significant gaps before real users.

---

## 1. What Actually Works Well

### The AI pipeline is genuinely good
- **Gemini Flash for chat** is the right call. Sub-second responses, context extraction works 96-100% across 10 diverse personas. The system prompt is tight — 3 turns to completion, directions framed as emotional messages, suggested replies as pills.
- **Claude Sonnet for recommendations** produces personalized, emotionally resonant copy. The "why this fits" and "what this gift says" sections are the standout feature. No competitor does this.
- **Interest-first prefiltering** (added this session) improved relevance from 0.50 to 0.83. The hybrid DB query → Claude scoring pipeline is architecturally sound.

### The data foundation is solid
- 171K enriched products with psychological fit, relationship fit, occasion fit, usage signals
- SQLite with WAL mode handles the read-heavy workload fine for MVP scale
- Enrichment pipeline (Shopify crawl → Claude enrichment → quality audit) is complete and reproducible

### The testing infrastructure is unusually good for an MVP
- 10 realistic personas with multi-turn conversations, post-recommendation behavior, and decision journeys
- Automated scoring across 5 dimensions (conversation quality, context extraction, relevance, budget, turns)
- Full E2E Playwright tests (21 passing)
- Admin replay page that shows the complete user journey

---

## 2. What's Broken (Honest Assessment)

### Budget compliance is the worst metric: 47% average
This is the most embarrassing number. Nearly half of recommendations exceed the user's stated budget. The causes are layered:
- The prefilter uses ±10% tolerance, but Claude often ignores budget constraints when it finds an emotionally compelling product
- Single-number budgets ("$150") are treated as ceilings but the post-filter allows 5% over
- The scoring harness reveals this consistently but the prompt hasn't been fixed to treat budget as a HARD constraint

**My take**: This would be the #1 reason a real user loses trust. "I said $75 and you showed me a $99 item" breaks the entire value proposition of reducing anxiety.

### The UX is functional but not delightful
I redesigned the cards 3 times during this session and they're still not right. The core problem:
- The gift flow page is **1,100 lines of React in a single file**. It's doing too much — chat, recommendations, profile card, purchase modal, voice mode, reactions, quick-pick, refinement. This makes iteration slow and error-prone.
- The compact+expand card pattern I implemented is better than the original full-height cards, but it still doesn't feel like a shopping experience. It feels like a test result.
- Product images from Shopify CDN work 93% of the time. The 7% with broken/missing images look bad — gray boxes with emoji fallbacks undermine trust.

### Auth is theatrical, not real
I added `requireAdmin()` and `requireAuth()` middleware, but the underlying auth is still "trust whatever x-user-id header the client sends." The Google OAuth endpoint accepts any `googleId` without token verification. This is fine for prototype testing but would be a security incident in production.

### The admin replay page is useful but incomplete
I built the session replay to show chat bubbles, gift profile, recommendations, card message, presentation guide, and decision journey timeline. But:
- The recommendation cards in admin still use the old layout (not synced with latest gift flow changes)
- There's no way to compare sessions side-by-side
- No aggregate analytics across sessions (just individual replay)
- The "Decision Journey" timeline depends on events being tracked — if any event tracking fails silently, the timeline has gaps

---

## 3. Architecture Concerns

### Single-file component problem
`app/gift/[sessionId]/page.tsx` is 1,100+ lines with:
- RecommendationCard component (200 lines)
- GiftProfileCard component (150 lines)
- sendFeedback helper
- Main page with 15+ state variables
- Voice mode integration
- Purchase modal logic

This needs to be broken into components. Every time I edited the recommendation card, I risked breaking the chat flow because they're in the same file.

### SQLite is fine for now, dangerous at scale
Gemini and Codex both flagged this. For an MVP with <100 concurrent users, SQLite with WAL mode is perfectly adequate. The catalog is read-only (171K products don't change during a session) and session writes are low-frequency. But:
- No backup strategy for session/event data
- Container restarts on Railway lose WAL data
- Can't horizontally scale without DB migration

### LLM latency is the UX bottleneck
- Chat: ~0.5s (Gemini Flash) — great
- Recommendations: 12-15s (Claude Sonnet scoring 50 products) — bad
- Card generation: 2-3s (Claude Sonnet) — acceptable

The 12-15s recommendation wait is where users will drop off. The loading state ("Finding perfect gifts...") is a spinner with no progress indication. Need to either stream results or show intermediate states.

### No caching
Every recommendation request hits Claude fresh, even for identical context. A user who refreshes the page generates a new $0.02-0.05 API call. No deduplication, no caching, no memoization.

---

## 4. Product Gaps

### The conversation ends when it shouldn't
After recommendations appear, the chat input disappears. The user can only react with +/- buttons or click "Not quite right" (which restarts the whole flow). This is the biggest UX gap — the user should be able to say "something more personal" or "she already has one of those" and get refined recommendations inline.

### No recipient memory across sessions
If I search for a gift for "Lisa" today and come back next month for her birthday, the system doesn't remember. Each session is independent. The `recipients` table exists but isn't populated from conversation data automatically.

### No price comparison or availability
We link to the retailer's site but have no idea if the product is in stock, what shipping costs, or if there's a better price elsewhere. The user clicks "Buy" and might land on a 404.

### No post-purchase loop
The feedback link system exists but has never been tested with real recipients. The learning loop (recipient reaction → better future recommendations) is wired but unvalidated.

---

## 5. What I'd Fix First (Prioritized)

### Tier 1: Fix before any real user touches this

| # | Fix | Why | Effort |
|---|-----|-----|--------|
| 1 | **Budget compliance** — make it a hard constraint, not a suggestion | 47% compliance = trust killer | 2 hours |
| 2 | **Break up page.tsx** — extract RecommendationCard, GiftProfileCard, PurchaseModal into separate files | Blocks all future UX iteration | 2 hours |
| 3 | **shadcn/ui** — replace hand-rolled components with production-quality ones | Current UI doesn't match AI quality | 3 hours |
| 4 | **Real OAuth** — validate Google ID tokens server-side | Security baseline | 2 hours |

### Tier 2: Fix before showing to investors/beta users

| # | Fix | Why | Effort |
|---|-----|-----|--------|
| 5 | **Stream recommendations** — show cards as they're generated, not all-at-once after 15s | 15s blank screen = abandonment | 4 hours |
| 6 | **Chat persists after recs** — inline refinement loop | Core differentiator, biggest UX gap | 4 hours |
| 7 | **Horizontal card comparison** — ChatGPT-style side-by-side on desktop | Can't compare products currently | 3 hours |
| 8 | **Deploy full catalog to Railway** — connect GitHub, get 171K products live | Prod has only 94 products | 30 min |

### Tier 3: Fix before paid launch

| # | Fix | Why | Effort |
|---|-----|-----|--------|
| 9 | **Conversion analytics dashboard** — measure the funnel | Can't improve what you can't measure | 4 hours |
| 10 | **Product availability checking** — verify links before showing | Dead links kill trust | 8 hours |
| 11 | **Recipient memory** — auto-populate profiles from conversation data | Repeat users = retention | 4 hours |
| 12 | **Recommendation caching** — don't re-call Claude for identical context | Cost + latency reduction | 2 hours |

---

## 6. Competitive Assessment

| Dimension | Present Agent | ChatGPT Shopping | Perplexity Shopping |
|-----------|--------------|-----------------|-------------------|
| **Gift-specific UX** | Purpose-built | Generic shopping + AI labels | Generic shopping |
| **Emotional framing** | "What this gift says" — unique | None | None |
| **ADHD design** | 3 options, 3 turns, decision relief | Infinite scroll, no limits | Grid of results |
| **Card message** | AI-generated, personalized | None | None |
| **Presentation guide** | Wrapping, timing, what to say | None | None |
| **Catalog size** | 171K (Shopify niche) | Millions (Google Shopping feed) | Millions |
| **Product freshness** | Static (crawled once) | Real-time | Real-time |
| **Comparison UX** | Stacked cards (needs work) | Horizontal carousel | Grid |
| **Price comparison** | Single source | Multi-merchant | Multi-merchant |
| **Conversation refinement** | Not yet (planned) | Tags + "More like this" | Follow-up questions |

**Present Agent's moat**: No competitor frames gifts as emotional messages or generates presentation guides. ChatGPT Shopping is transactional — it helps you find a product. Present Agent helps you express a feeling through a gift. That's a different product category.

**Present Agent's weakness**: Catalog freshness and breadth. ChatGPT has millions of real-time products. We have 171K static ones, some with dead links.

---

## 7. Scores by Dimension

| Dimension | Score | Notes |
|-----------|-------|-------|
| **AI quality** | 8.5/10 | Conversation + recommendation pipeline is genuinely good |
| **Code architecture** | 6/10 | Works but single-file components, no caching, prototype auth |
| **UX design** | 5/10 | Functional but not delightful. Cards need major work. |
| **Security** | 4/10 | Rate limiting + sanitization done, but auth is fake |
| **Testing** | 8/10 | Persona harness + E2E is unusually strong for an MVP |
| **Data quality** | 7/10 | 171K enriched products, but 7% missing images, no freshness checks |
| **Documentation** | 7/10 | Clean after today's reorg. STATUS.md is excellent. |
| **Deployment readiness** | 4/10 | Prod has 94 products, no CI/CD, no monitoring |
| **Overall** | **6.5/10** | Strong MVP foundation. Needs UX + security + deployment work before real users. |

---

## 8. The One Thing That Matters Most

If I could only fix one thing: **make the 3 product cards help the user decide in under 10 seconds.**

Right now the cards present information. They don't guide a decision. The user has to read whyThisFits for all 3, compare prices mentally, parse the emotional messages, and then click. That's 60+ seconds of cognitive work — exactly what an ADHD user can't sustain.

The fix is progressive disclosure with a clear default: show all 3 at glance with price + match % + one-line differentiator, visually highlight the top pick, and let the user tap to expand. The compact+expand pattern I started is the right direction, but it needs to be polished with shadcn/ui components and tested against real user behavior.

The AI is ready. The UX isn't. That's the gap.
