# Present Agent: Product Brief

> **Status**: Discovery Complete → Prototype Sprint Ready
> **Last Updated**: 2026-03-16
> **Business Model**: Curated Marketplace (see [13_business_model.md](./13_business_model.md))
> **Research Quality**: All phases passed bar raiser (82.5-92/100)

---

## The Opportunity

An AI-powered gifting assistant that solves the **anxiety and execution burden** of gift-giving, targeting **ADHD adults** as the initial segment.

### Why This, Why Now

**The problem isn't "what to get"—it's anxiety and execution.**

| What We Assumed | What Research Showed |
|-----------------|----------------------|
| Gifters need help with ideation | Anxiety (fear of judgment) is primary pain |
| AI should pick the perfect gift | AI should be a "thinking partner" |
| Focus on recipient preferences | Giver-centric gifts produce more closeness |
| Any gifter is our customer | ADHD adults are optimal segment |

**Why 2026**:
- 80% AI cost reduction enables freemium
- 1M token context windows load full user history
- 95% tool-use reliability makes automation work

---

## Target Segment: ADHD Adults

### Why ADHD Won (Segment Score: 26/30)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Pain intensity | 5/5 | Gifting requires exactly what ADHD brains struggle with |
| Willingness to pay | 5/5 | Already pay $79-130/mo for ADHD services |
| Reachability | 4/5 | 2.4B TikTok views on #ADHD, 2M r/ADHD members |
| Competition | 5/5 | Zero direct competition in gifting |
| AI fit | 5/5 | End-to-end delegation is the ask |

### ADHD + Gifting = Perfect Storm

Gifting requires:
- **Remember** → Working memory deficits
- **Decide** → Decision paralysis
- **Purchase** → Executive function load
- **Ship** → Time blindness
- **Wrap** → Multi-step tasks
- **Time correctly** → Deadline awareness

**Quote from research**: "Reminders remind me without reducing the complexity. I need 'here are 3 options, pick one' not just 'birthday in 2 weeks'."

---

## Core Insight: The Psychology of Gifting

### Dual Motives Framework

Every gift is evaluated on two dimensions:

| Motive | Definition | Dominates When |
|--------|------------|----------------|
| **Relational signaling** | Show I care through effort | Close relationships |
| **Preference matching** | Match recipient's tastes | Distant relationships |

**Critical tension**: These motives conflict. Easy-to-find gifts may signal low effort.

### Counterintuitive Finding #1

**Giver-centric gifts produce more closeness than recipient-centric gifts** (Aknin & Human, 2015)

Despite everyone preferring to give/receive recipient-focused gifts, 6 studies show gifts that reflect the GIVER create more relationship closeness. Self-disclosure through gifts is intrinsically rewarding.

**Implication**: Help users share themselves, not just satisfy.

### Counterintuitive Finding #2

**Close friends reject AI most** (Fu et al., 2024)

5 studies confirm: social closeness negatively predicts AI tool usage.

- Using AI signals "I outsourced caring about you"
- The people with highest pain are least likely to accept help

**Implication**: Position as "thinking partner" not "decision maker." Focus on execution first.

### The Anxiety Hierarchy

| Rank | Pain Point | Score |
|------|------------|-------|
| 1 | Fear of giving wrong gift / being judged | 25 |
| 2 | Financial stress / budget pressure | 25 |
| 3 | Time pressure / too many people | 20 |
| 4 | Forgetting dates (esp. ADHD) | 20 |
| 5 | Decision paralysis / too many options | 16 |

**Surprising finding**: 52% said wrapping was the worst part of holidays. "Arrive ready" is a significant differentiator.

---

## Competitive Position

### Where We Play

**"Relationship-context AI for ADHD gifters"**

| Competitor Type | Examples | Their Focus | Our Gap |
|----------------|----------|-------------|---------|
| Product-focused AI | Amazon Rufus, Pinterest | Product attributes | No relationship context |
| Wishlist tools | Elfster, Giftful | Recipient preferences | No AI, feels transactional |
| Corporate gifting | Sendoso, Goody | B2B logistics | Not personal, $20K+ minimum |
| Curated marketplaces | Uncommon Goods | Human curation | Generic, not personalized |

### Differentiation

| Them | Us |
|------|-----|
| "Find the perfect gift" | "Feel confident about your gift" |
| Product discovery | Relationship understanding |
| More options | 3 options (decision reduction) |
| You figure out logistics | Arrives ready (wrapped, carded, on time) |

---

## Product Vision

### MVP Core Loop

```
Calendar reminder (2 weeks out)
    ↓
Conversational profile builder ("Tell me about your sister")
    ↓
3 curated options with confidence scores
    ↓
One-tap purchase
    ↓
We handle: wrapping, card message, scheduled delivery
    ↓
Arrives ready
```

### Phase 1 Features (MVP)

| Feature | Purpose |
|---------|---------|
| Recipient Profile Builder | Conversational, not forms |
| Curated Catalog (200 items) | Constrained quality beats open-ended |
| 3-Option Recommendation | Decision reduction |
| "Why this?" Explanations | Preserve giver agency |
| Confidence Scoring | Address anxiety directly |
| Calendar Integration | Proactive reminders |
| Fulfillment (wrap, card, ship) | The "arrive ready" promise |

### What NOT to Build (Yet)

- Social media integration (privacy nightmare)
- Open-ended product search (cold-start problem)
- B2B features (different GTM)
- International shipping (complexity)
- Recipient-side app (Phase 2)

---

## Key Assumptions

### Validated (High Confidence)

| ID | Assumption | Evidence |
|----|------------|----------|
| F001 | AI generates better suggestions than random | Empirical: 7/10 with context vs 3/10 cold |
| D007 | Giver-centric framing increases closeness | Aknin 2015: 6 studies |
| D008 | Turn-taking increases AI acceptance | Fu 2024: 5 studies |
| D009 | Close friends resist AI most | Fu 2024: confirmed across contexts |
| D011 | Givers overweight monetary value | Baskin 2014, Givi 2021 |

### Partially Validated (Medium Confidence)

| ID | Assumption | Status |
|----|------------|--------|
| D002 | Trust AI for gift selection | ADHD pays for AI help already |
| D003 | Recipients reject wishlists | "Transactional feel" mentioned |
| V002 | Subscription economics work | $0.02/recommendation cost |

### Untested (Must Validate)

| ID | Assumption | Test Method |
|----|------------|-------------|
| D004 | ADHD pays $10-20/month | Fake door / prototype waitlist |
| D005 | "Arrive ready" is high-value | Feature preference toggle |
| D010 | "Partner" positioning wins | A/B headline test |
| F003 | Curated beats open-ended | User preference test |

### Invalidated (Pivoted From)

| ID | Assumption | What We Learned |
|----|------------|-----------------|
| D001 | Ideation is primary pain | Anxiety > ideation |
| F002 | AI infers without data | Cold start = generic results |
| V001 | B2B has higher WTP | ADHD personal WTP rivals B2B |

---

## DVF Assessment

### Desirability: 7/10
- ✅ Clear pain identified (anxiety + execution)
- ✅ Underserved segment (ADHD)
- ✅ Proven WTP in adjacent services
- ❓ Not yet validated with real prototype
- ❓ AI acceptance barrier for close relationships

### Viability: 6/10
- ✅ Unit economics work at $10-20/month
- ✅ AI costs <1% of revenue
- ✅ Clear expansion path
- ❓ CAC unknown
- ❓ Retention/LTV unknown
- ❓ Fulfillment margins unclear

### Feasibility: 8/10
- ✅ AI capabilities validated empirically
- ✅ Standard tech stack
- ✅ 2026 cost economics enable freemium
- ✅ Solo founder can build MVP
- ⚠️ Fulfillment partnerships needed

### Overall: 7/10 — Proceed to Prototype

---

## Prototype Sprint (This Week)

### What We're Building

**"Gift Confidence Bot"** — Conversational AI prototype that:
1. ADHD-specific landing page
2. Turn-taking conversation (profile builder)
3. 3 curated recommendations with "why"
4. Confidence scoring
5. Waitlist capture

**Not building yet**: Checkout, fulfillment, calendar, accounts

### Success Criteria

| Outcome | Metric | Decision |
|---------|--------|----------|
| Strong | >40% completion, >30% waitlist | Proceed to MVP |
| Mixed | 20-40% completion, 15-30% waitlist | Iterate |
| Weak | <20% completion, <15% waitlist | Pivot |
| Kill | <10% completion, <5% waitlist | Reconsider |

### Distribution

| Channel | Expected Traffic | Cost |
|---------|-----------------|------|
| r/ADHD | 200-500 | $0 |
| TikTok ads | 500-1000 | $100 |
| Reddit ads | 300-500 | $100 |
| Personal network | 20-50 | $0 |

---

## Roadmap

### Phase 1: Validate Demand (Week 1)
- Ship prototype
- 1000+ visitors
- Measure: completion, waitlist, NPS
- Decision: proceed/iterate/pivot

### Phase 2: Build Core MVP (Weeks 2-4)
- Real checkout (Stripe)
- Curated catalog expansion (200 items)
- Basic fulfillment partner (1 vendor)
- Calendar integration

### Phase 3: Fulfillment & Retention (Weeks 5-8)
- Full "arrive ready" (wrap, card, timing)
- Recipient profiles that persist
- Proactive occasion reminders
- Retention measurement

### Phase 4: Scale (Months 3+)
- Expand catalog/partnerships
- Recipient-side experience
- Segment expansion (busy pros)
- B2B consideration

---

## Messaging Framework

### Positioning Statement

> For **ADHD adults** who **dread gift-giving anxiety**,
> **Present Agent** is an **AI thinking partner** that
> **reduces decisions and handles execution**,
> unlike **Amazon/wishlists** which give you **more options, not confidence**.

### Headlines to Test

| Focus | Headline |
|-------|----------|
| Anxiety | "Stop second-guessing every gift" |
| Delegation | "Gift giving without the mental load" |
| Partnership | "A thinking partner for thoughtful gifts" |

### What NOT to Say

| Don't | Do |
|-------|-----|
| "AI picks the perfect gift" | "We help you think through what matters" |
| "Never worry about gifts again" | "Feel confident about every gift" |
| "Save time on gift shopping" | "Show up for the people you care about" |

---

## Key Metrics

### Prototype Phase

| Metric | Target |
|--------|--------|
| Conversation completion | >40% |
| Recommendation selection | >50% |
| Waitlist conversion | >15% |
| Experience rating | >7/10 |

### MVP Phase

| Metric | Target |
|--------|--------|
| Purchase conversion | >5% of visitors |
| Time to gift | <5 minutes |
| NPS | >50 |
| Return rate | <10% |
| Monthly retention | >60% |

---

## Files Reference

### Discovery Documents

| File | Purpose |
|------|---------|
| [`00_discovery_canvas.md`](./00_discovery_canvas.md) | Initial problem framing, journey maps |
| [`01_discovery_workflow.md`](./01_discovery_workflow.md) | Research methodology, bar raiser rubrics |
| [`05_synthesis.md`](./05_synthesis.md) | Full discovery synthesis |

### Research

| File | Purpose |
|------|---------|
| [`research/01_competitive_raw.md`](./research/01_competitive_raw.md) | 14 competitor profiles, market sizing |
| [`research/02_pain_points_raw.md`](./research/02_pain_points_raw.md) | Pain point analysis, anxiety hierarchy |
| [`research/03_segment_analysis_raw.md`](./research/03_segment_analysis_raw.md) | ADHD segment deep dive |
| [`research/04_ai_feasibility_raw.md`](./research/04_ai_feasibility_raw.md) | AI capability tests, cost modeling |
| [`research/06_psychology_deep_dive.md`](./research/06_psychology_deep_dive.md) | Academic psychology synthesis |

### Planning & Architecture

| File | Purpose |
|------|---------|
| [`07_prototype_sprint.md`](./07_prototype_sprint.md) | This week's build plan |
| [`08_agent_architecture.md`](./08_agent_architecture.md) | Multi-agent context system design |
| [`assumptions.json`](./assumptions.json) | 16 tracked hypotheses with status |

### External Research (Vault)

| File | Key Finding |
|------|-------------|
| `3_Resources/Research/Gifts/Givi_2023_integrative_review.md` | Comprehensive gift-giving literature |
| `3_Resources/Research/Gifts/Aknin_2015_giver_centric.md` | Giver-centric gifts > recipient-centric |
| `3_Resources/Research/Gifts/Fu_2024_AI_gift_tools.md` | Social closeness → AI aversion |

---

## Open Questions

1. **Name**: Is "Present Agent" the right brand?
2. **Fulfillment**: Build partnerships now or fake door first?
3. **Recipient side**: When/how to include recipients?
4. **B2B**: Parallel track or pure B2C focus?
5. **Pricing**: $10/mo, $15/mo, or per-gift?

---

## Team & Resources

### Current
- Solo founder build
- ~34 hrs for prototype
- $200 ad budget

### Phase 2 Needs
- Fulfillment partnership (wrap/ship vendor)
- 200-item catalog curation
- Customer support approach

---

## Changelog

| Date | Update |
|------|--------|
| 2026-03-16 | Initial product brief consolidating all discovery |

---

*This document is the single source of truth for Present Agent product decisions.*
