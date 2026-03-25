# Review Synthesis: All Three Perspectives

> Synthesized from: Gemini, Codex (GPT-5.4), Claude Opus 4.6 bar raiser reviews
> Date: 2026-03-25

---

## Consensus Findings (All 3 agree)

| Finding | Gemini | Codex | Claude | Priority |
|---------|--------|-------|--------|----------|
| **Auth is broken** — no real OAuth validation, x-user-id trusted from client | Critical | Critical | Critical | **P0** |
| **Budget compliance failing** — recs exceed stated budget ~50% of the time | — | — | Critical (47%) | **P0** |
| **SQLite LIKE queries are slow + semantically fragile** on 171K rows | High | High | High | **P1** |
| **15s recommendation latency** — blank spinner, no streaming | High | High | High | **P1** |
| **Product freshness** — 171K static products, dead links, no stock checks | Medium | High | Medium | **P1** |
| **UX doesn't match AI quality** — cards need major redesign | — | — | Critical (5/10) | **P0** |

## Unique Findings (Only one reviewer caught)

| Finding | Reviewer | Impact | Action |
|---------|----------|--------|--------|
| **Google contacts/calendar uses shared server token** — privacy violation | Codex | Critical | Fix: per-user OAuth token storage |
| **Session PATCH endpoint has no auth** — anyone can modify sessions by ID | Codex | High | Fix: add session ownership check |
| **Context passed in URL params** when navigating to card page | Codex | Medium | Fix: use session storage or server state |
| **Event ingestion is unauthenticated** — metrics can be polluted | Codex | Medium | Fix: add session token validation |
| **Feedback stored as JSON files on disk** — lost on container restart | Codex | Medium | Fix: move to SQLite |
| **No DB migration discipline** — schema created at runtime | Codex | Low | Accept for MVP |
| **Vector search would improve prefilter relevance** | Gemini | Medium | SQLite FTS5 as step 1 |
| **Turso migration enables serverless deployment** | Gemini | Medium | Defer — Railway works for now |
| **1100-line single-file component blocks iteration** | Claude | High | Fix: extract components |
| **No recommendation caching** — duplicate calls to Claude on refresh | Claude | Medium | Fix: cache by context hash |

## Prioritized Action Plan

### Sprint 1: Trust & Correctness (do before ANY real user)

| # | Action | Source | Effort | GH Issue |
|---|--------|--------|--------|----------|
| 1 | **Fix budget compliance** — hard constraint in prompt + post-filter reject >105% | Claude | 2h | #5 |
| 2 | **Real OAuth** — validate Google ID tokens, issue JWTs/sessions | All 3 | 3h | #7 (expand) |
| 3 | **Add auth to session endpoints** — session GET/PATCH require owner | Codex | 1h | New |
| 4 | **Fix Google contacts/calendar** — per-user token, not shared server token | Codex | 2h | New |
| 5 | **Break up page.tsx** — extract into components | Claude | 2h | New |

### Sprint 2: UX & Performance (do before beta users)

| # | Action | Source | Effort | GH Issue |
|---|--------|--------|--------|----------|
| 6 | **shadcn/ui** — install, rebuild cards | Claude, Gemini | 3h | #1 |
| 7 | **Stream recommendations** — show cards as generated, not 15s blank | Gemini, Claude | 4h | New |
| 8 | **Chat persists after recs** — inline refinement | Claude | 4h | #3 |
| 9 | **Horizontal card comparison** — side-by-side on desktop | Claude | 3h | #1 |
| 10 | **Deploy full catalog** — connect Railway to GitHub | Claude | 30m | #6 |

### Sprint 3: Data & Defensibility (do before launch)

| # | Action | Source | Effort | GH Issue |
|---|--------|--------|--------|----------|
| 11 | **SQLite FTS5** for interest matching (replace LIKE) | Gemini | 3h | New |
| 12 | **Product freshness checks** — validate URLs before showing | Gemini, Codex | 4h | New |
| 13 | **Move feedback to SQLite** — JSON files lost on restart | Codex | 2h | New |
| 14 | **Recommendation caching** — hash context, serve from cache | Claude | 2h | New |
| 15 | **Conversion analytics dashboard** | Claude | 4h | #2 |

---

## Scores Comparison

| Dimension | Gemini | Codex | Claude | Consensus |
|-----------|--------|-------|--------|-----------|
| AI pipeline | Excellent | Strong concept | 8.5/10 | **Best-in-class for gifting** |
| Architecture | Good (stateful concern) | Simple but coupled | 6/10 | **Fine for MVP, refactor at scale** |
| Security | Critical gaps | Fundamentally broken | 4/10 | **Must fix before real users** |
| UX | Good concept, rigid | — | 5/10 | **Core blocker to conversion** |
| Testing | World-class for MVP | — | 8/10 | **Unusually strong** |
| Data | Good enrichment | Fragile queries | 7/10 | **Solid foundation, needs freshness** |
| Overall | Strong prototype | Prototype, not product | 6.5/10 | **6-7/10 — strong AI, weak shell** |

---

## The Moat Assessment

All three reviewers agree: **the emotional framing is the moat**. No competitor generates "what this gift says" or "how to give it" guidance. ChatGPT Shopping is transactional. Present Agent is relational.

But the moat only works if users trust the product enough to reach the recommendation step. Right now, broken auth + budget violations + 15s latency + weak UX erode trust before the moat kicks in.

**Fix the trust layer first. Then polish the UX. The AI is already there.**
