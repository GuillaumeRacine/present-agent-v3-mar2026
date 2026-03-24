# Present Agent — Next Steps & Feature Roadmap

*Generated 2026-03-21 from market research, internal analysis, and testing data.*

---

## Current State

- 171K enriched products (cleaned from 254K), all $1-$1000, USD normalized
- Full chat → recs → card → presentation → feedback loop working
- 11/11 Playwright UX tests passing, 7/7 API tests passing
- Persistent users, recipients, sessions, gift history, events
- MCP server + CLI + REST API
- Voice mode (browser + Whisper/OpenAI TTS fallback)
- Analytics dashboard

## Key Metrics (from testing)

- **Recommendation quality:** 3.3/5 avg (up from 1.9 after two fix rounds)
- **Card quality:** 4.2/5 avg — strongest feature
- **Presentation guides:** 4.7/5 avg — standout differentiator
- **Price compliance:** Much improved but still leaks on edge cases
- **Biggest funnel drop:** 86% get recs → only 14% click through to buy

---

## Tier 1: Ship This Week (High Impact, Low Effort)

### 1. "Just Pick For Me" Mode — DONE (2026-03-24)
Implemented. Subtle dashed button below 3 cards, auto-selects top pick.

### 2. "Mark as Purchased" Flow — DONE (2026-03-24)
Implemented. Bottom sheet modal appears 3s after buy link click. Tracks via PostHog.

### 3. Wire the Disconnected Learning Loop — DONE (2026-03-24)
`extractRecommenderInsights()` now called in getRecommendations when userId present.

### 4. ChatAds Affiliate Integration
**Why:** Immediate revenue on every recommendation. 100% commission retention. 5-minute integration.
**What:** Install ChatAds SDK. Insert affiliate links into buy URLs on recommendation cards.
**Effort:** ~30 minutes. SDK integration.
**Revenue:** 1-30% per purchase depending on merchant category.

### 5. Fix the "Refine Profile" Dead Button — DONE (2026-03-24)
Wired to reopen chat with context preserved. Tracked via PostHog.

---

## Tier 2: Ship Next 2-4 Weeks (Medium Effort, Strategic)

### 6. Year-Round Idea Capture
**Why:** The #1 ADHD coping strategy for gifting. "My sister mentioned she loves that author" — capture NOW, use LATER.
**What:** Quick-capture flow (text or voice): log a gift idea → stores against a recipient. Accessible from home page and as a floating action button.
**Research:** Every ADHD coach recommends an external capture system. No competitor has this.
**Effort:** ~1 day. New component + recipient note API.

### 7. Gift History Page
**Why:** Users can't see "What have I given Sarah before?" Tables and API exist, no frontend.
**What:** `/gifts` page showing past gifts by recipient, with reactions and satisfaction scores. Link from home page "Your people" section.
**Effort:** ~1 day. New page consuming existing API.

### 8. Recipient Profile Viewer/Editor
**Why:** API supports PATCH but no UI lets users edit profiles, add notes, or see history per person.
**What:** Click a person in "Your people" → see full profile, interests, gift history, inside jokes, memories. Edit inline.
**Effort:** ~1 day. New page/modal + existing API.

### 9. Onboarding Flow
**Why:** New users see "Who needs a gift?" with zero explanation. No sign-up prompt. No value prop.
**What:** First-visit: brief explanation ("Present Agent remembers everyone you gift and gets smarter each time"), Google sign-in prompt, calendar connection.
**Effort:** ~1 day. New onboarding page + auth UI.

### 10. Late Gift De-stigmatization
**Why:** ADHD users experience shame spirals when they miss deadlines, often abandoning the gift entirely. Research (Givi & Haltman 2025) proves late gifts actually strengthen relationships.
**What:** When a reminder fires AFTER the occasion date, show: "A late gift strengthens your relationship — research proves it. Here are 3 ideas that still work." Remove urgency pressure. Reframe as opportunity.
**Effort:** ~2 hours. Conditional copy in reminders + occasion page.

### 11. Share Recommendations
**Why:** Co-gifting is common. No way to ask "What do you think of these 3 for Mom?"
**What:** "Share these picks" button → generates a public link showing the 3 cards (read-only, no auth required). Short URL for texting.
**Effort:** ~1 day. New public page + share link generation.

---

## Tier 3: Ship in 1-3 Months (High Effort, Transformative)

### 12. In-Chat Checkout (ACP/Stripe)
**Why:** Multi-tab checkout causes ADHD users to lose focus and abandon. The Agentic Commerce Protocol (OpenAI + Stripe, live since Sep 2025) enables in-chat purchasing.
**What:** Integrate ACP so users can buy without leaving Present Agent. Payment via Stripe, fulfillment via merchant.
**Revenue:** 4% transaction fee (ACP) on top of affiliate commissions.
**Effort:** ~2 weeks. ACP SDK integration + payment flow.

### 13. Proactive "Gift Radar"
**Why:** No competitor does proactive gifting well. ADHD users don't plan ahead.
**What:** AI monitors calendar + contacts. 3 weeks before an occasion: "Your friend's birthday is coming. Based on what you know about them, here's an idea." Push notification or email.
**Effort:** ~1 week. Cron job + notification system + prompt engineering.

### 14. Experience-Based Catalog Expansion
**Why:** Only 2.7% of catalog is experiential. Research shows experience gifts build stronger relationships.
**What:** Source from Airbnb Experiences, ClassPass, Masterclass, local cooking/art class platforms. Add as a first-class category.
**Effort:** ~1 week. New data source + enrichment.

### 15. Collaborative/Group Gifting
**Why:** GyftPro's fastest-growing feature (800+ events in 90 days). Organic viral growth.
**What:** Create a group gift → invite contributors → split cost → track who's in. One person manages, everyone contributes.
**Effort:** ~2 weeks. New data model + group page + payment splitting.

### 16. B2B White-Label API
**Why:** Corporate gifting is a $274B+ market growing at 4-10% CAGR. Present Agent's MCP + REST API is already built for this.
**What:** Package as a white-label service. Custom branding, CRM integration, branded merchandise sourcing.
**Revenue:** SaaS subscription ($500-2000/mo per client) + per-gift commission.
**Effort:** ~1 month. API keys, rate limiting, custom branding, documentation.

### 17. Premium Subscription Tier
**Why:** Sustainable revenue beyond affiliates. Value-clear for power users.
**What:** $4.99/mo or $39.99/yr. Unlimited recipients, priority AI model (Opus), advanced analytics, exclusive experience partners, ad-free.
**Effort:** ~2 weeks. Stripe subscription + tier gating.

---

## What NOT to Build

- **AR gift preview** — No consumer demand signal. Too early.
- **Full marketplace with inventory** — Affiliate + ACP model avoids all inventory risk.
- **Infinite browsing/discovery feeds** — Actively harmful for ADHD users. The 3-card constraint is a feature.
- **Social media integration** — Gift anxiety + social pressure is the problem, not the solution.
- **Price tracking/deal alerts** — Commoditizes the experience. Present Agent is about thoughtfulness, not bargain hunting.

---

## Data & Tech Debt to Address

| Issue | Impact | Effort |
|-------|--------|--------|
| 82K un-enriched products | 32% of catalog invisible | Run enrichment batch |
| File-based feedback storage | Won't scale past 100s of sessions | Migrate to SQLite |
| Brand name inconsistency (ARHAUS vs arhaus) | Degrades diversity filter | Normalize in DB |
| 3 brands = 24.5% of catalog (BURGA, Ring Concierge, Lulu & Georgia) | Noise in prefilter | Cap per brand or down-weight |
| No unit tests | Zero coverage on core logic | Add vitest for recommend, profiles, feedback |
| URL-encoded JSON in card page params | Will hit URL length limits | Use sessionStorage or DB lookup |
| No recommendation caching | Every request = Claude API call | Cache by context hash for 24h |
| Etsy OAuth exists but unused | Wasted code | Activate or remove |
| Currency type says CAD but data is USD | Misleading | Fix type definition |

---

## Revenue Projection (Conservative)

| Channel | Timeline | Est. Monthly Revenue |
|---------|----------|---------------------|
| ChatAds affiliate | Week 1 | $50-500 (scales with traffic) |
| Premium subscription | Month 2 | $200-2000 (40-400 subscribers) |
| ACP transaction fees | Month 3 | $500-5000 (4% of GMV) |
| B2B white-label | Month 6 | $2000-10000 (4-10 clients) |

---

## Competitive Moat

No competitor combines ALL of:
1. Conversational AI with persistent memory
2. Calendar/contacts integration
3. Voice-first interaction
4. AI-generated cards + presentation guides
5. Recipient feedback loop with learning
6. ADHD-specific design (3 choices, progress indicators, pause/resume)
7. MCP server for Claude Code integration
8. REST API for B2B

**GyftPro** is closest (social + AI + rewards) but lacks calendar integration, voice, ADHD design, and technical depth. **GiftAdvisor** is form-fill only, no memory. **Giftpack** is enterprise-only. Present Agent is the most technically complete product in the space — the gap is distribution and monetization.
