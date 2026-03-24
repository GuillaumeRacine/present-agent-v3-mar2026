# Present Agent — Project Status

> Last updated: 2026-03-24
> Live: https://present-agent-production.up.railway.app
> Repo: https://github.com/GuillaumeRacine/present-agent-v2

---

## What It Is

AI-powered gift recommendation app for ADHD adults. Conversational chat builds a recipient profile in 2-3 turns, then delivers 3 psychology-informed gift recommendations with personalized explanations, card messages, and presentation guides.

**Core insight**: The problem isn't "what to get" — it's anxiety and execution. We reduce decisions (3 options, not 3,000) and explain why each works (confidence, not guesswork).

---

## Current State: MVP Live, Needs Catalog Fix for Production Quality

### What Works

| Feature | Status | Quality |
|---------|--------|---------|
| Landing page (ADHD messaging) | Live | 7/10 — clean, functional, needs visual warmth |
| 2-3 turn conversation (Gemini Flash) | Live | 9/10 — fast, natural, extracts context well |
| Gift profile card with effort reflection | Live | 9/10 — standout feature |
| 3-card recommendations (Claude Sonnet) | Live | 6/10 — slot 1 strong, slots 2-3 often weak |
| Card message + presentation guide | Live | 8/10 — highest rated in testing |
| Voice mode (STT/TTS) | Live | 7/10 — works, niche usage |
| Recipient profiles + persistence | Live | Working |
| Gift history + learning loop | Live | Wired but untested with real data |
| Admin dashboard (products/analytics/sessions) | Live | Working, awaiting real traffic |
| PostHog analytics + session recording | Live | Needs PostHog project key configured |
| Full conversation + recommendation logging | Live | Every message and rec permanently stored |
| Event tracking (30+ event types) | Live | Server-side SQLite + client-side PostHog |
| "Just Pick For Me" button | Live | Decision paralysis reducer |
| "Mark as Purchased" modal | Live | Closes the learning loop |
| Waitlist email capture | Live | /api/waitlist endpoint |

### What's Broken / Weak

| Issue | Impact | Root Cause | Fix |
|-------|--------|-----------|-----|
| **Slot 2-3 recommendations often generic** | High — users see boilerplate "I was thinking of you" | Claude picks irrelevant products, fallback copy triggers | Improve recommendation prompt, add product-description validation |
| **Budget violations on single numbers** | Medium — "$75" yielded $85-95 recs | Fixed in code but deployed version may still have old logic | Deploy latest code |
| **Age-inappropriate recs** | Medium — candle for a 5-year-old | No age filtering in prefilter query | Add recipient_age to SQL WHERE clause |
| **Product-description mismatch** | Medium — diffuser described as "knife" | Enrichment data errors in catalog | Data quality audit needed |
| **Le Labo + Airbnb overrepresented** | Low — appear in 30% of test conversations | Brand diversity cap too loose | Tighten brand cap to max 1 per recommendation set |
| **Railway deployment needs GitHub connection** | Blocker for production catalog | CLI upload times out with 38MB compressed DB | Connect Railway to GitHub repo (one-click in dashboard) |

---

## Architecture

```
User → Landing Page (/) → Gift Flow (/gift/new)
                               ↓
                    Gemini Flash (2-3 turns)
                               ↓
                    Gift Profile Card
                               ↓
                    Claude Sonnet (3-card recs)
                    ├── SQLite: 171K enriched products
                    ├── Pre-filter: budget, occasion, relationship, urgency
                    └── Post-filter: budget ceiling, category diversity, brand diversity
                               ↓
                    Recommendation Cards (Top Pick / Great Match / Wild Card)
                               ↓
                    Buy Link → Mark as Purchased → Recipient Feedback → Learning Loop
```

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Chat AI | Gemini 2.5 Flash |
| Recommendation AI | Claude Sonnet 4 |
| Card generation | Claude Sonnet 4 |
| Database | SQLite (better-sqlite3) |
| Voice | Web Speech API + Whisper + OpenAI TTS |
| Analytics | PostHog (client) + SQLite events (server) |
| Hosting | Railway (Docker, persistent filesystem) |

---

## Catalog

| Metric | Value |
|--------|-------|
| Total products | 171,450 |
| Enriched | 171,450 (100%) |
| Categories | practical (86K), artisan (40K), kids (19K), consumable (12K), wellness (9K), experiential (5K) |
| Price range | $1 — $1,000 |
| Sources | 600+ Shopify stores |
| Top stores | BURGA, Paper Source, Everlane, Cratejoy, Mohawk General Store |

### Known catalog gaps
- Fishing / woodworking / hobby-specific tools
- Scandinavian / minimalist home design objects
- Prenatal / pregnancy comfort items
- Local Montreal experiences
- Digital gift cards for specific services

---

## Testing Results (10 Personas, 2026-03-24)

| Dimension | Score |
|-----------|-------|
| Conversation flow | 5.0/5 |
| Context extraction | 4.6/5 |
| Explanation quality | 4.6/5 |
| Budget compliance | 3.8/5 |
| Category diversity | 3.8/5 |
| Recommendation relevance | 3.3/5 |
| **Overall** | **4.18/5** |

Full transcripts: `test-results/full-transcripts-20260324-102634.md`
Scored report: `test-results/persona-tests-20260324-101535.md`

---

## Gui's Gift Dashboard (Real Occasions)

| Person | Occasion | Date | Days Away | Top Pick | Status |
|--------|----------|------|-----------|----------|--------|
| Lisa | Late birthday | Mar 8 | -16 | Prenatal massage / "I see you" gesture | NOT BOUGHT |
| Cécile | Birthday + Mother's Day | May 8-10 | 45 | Calm 1-year subscription ($85) | RECOMMENDED |
| Lisa | Mother's Day | May 10 | 47 | Slip Silk Pillowcase ($150) | RECOMMENDED |
| Theodore | 5th birthday | Jul 28 | 126 | LEGO T. Rex 3-in-1 ($58) | RECOMMENDED |

Recipients created in system: Lisa, Theodore, Cécile, Barbara, John, Ian, Janet, Valerie

---

## Deployment

### Railway

| Component | Value |
|-----------|-------|
| Project | https://railway.com/project/5c408bc7-1f0f-461c-8ae1-8af79c70ec45 |
| Service | `present-agent` (service ID: `f013ff2b-b265-4872-bd0d-da35d8bfb7e2`) |
| Domain | https://present-agent-production.up.railway.app |
| Build | Dockerfile (node:20-slim, decompresses catalog.db.gz during build) |
| Catalog on prod | **94 products** — NEEDS UPDATE to 171K (see steps below) |
| GitHub connection | **NOT YET CONNECTED** — blocking full catalog deploy |

### Env vars set on Railway

```
ANTHROPIC_API_KEY=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
GEMINI_API_KEY=AIzaSyBghihUC3FVFym_rgP3AiVNS5MESaFUhwo
OPENAI_API_KEY=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
GOOGLE_CLIENT_ID=201127769489-iji0u25kqtq8bd2k31m54e06v5uocsm4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
NEXT_PUBLIC_APP_URL=https://present-agent-production.up.railway.app
GOOGLE_REDIRECT_URI=https://present-agent-production.up.railway.app/api/auth/google
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NODE_ENV=production
```

**Still needs:** `NEXT_PUBLIC_POSTHOG_KEY` (create free account at posthog.com)

### To deploy full 171K catalog (PRIORITY):
1. Go to https://railway.com/project/5c408bc7-1f0f-461c-8ae1-8af79c70ec45
2. Click the **present-agent** service
3. **Settings** → **Source** → **Connect Repo**
4. Select `GuillaumeRacine/present-agent-v2`, branch `main`
5. Railway pulls from GitHub (includes catalog.db.gz at 38MB), decompresses during build
6. Every future `git push origin main` auto-deploys

### Local dev setup
```bash
cd present-agent-v2
npm install
# .env.local is already included with API keys
npm run dev
# → http://localhost:3000 with 171K products
```

### Railway CLI (installed on Mac Mini)
```bash
railway login                    # Browser auth
railway status                   # Check project
railway logs                     # View logs
railway variables set KEY=VALUE  # Set env vars
railway up --detach              # Deploy (fails >50MB, use GitHub connection instead)
```

---

## Next Steps (Priority Order)

### P0 — This Week (Blocking Quality)
1. **Connect Railway to GitHub** — one click in dashboard. Deploys 171K catalog.
2. **Set PostHog project key** — create free account, add NEXT_PUBLIC_POSTHOG_KEY to Railway env
3. **Fix age filtering** — add recipient_age to prefilter SQL so 5-year-olds don't get candles
4. **Improve slot 2-3 quality** — refine Claude recommendation prompt, add product validation

### P1 — Next 2 Weeks (User Experience)
5. **Onboarding flow** — first-visit explanation, Google sign-in, calendar connect
6. **Gift history page** — see past gifts per recipient
7. **Recipient profile editor** — view/edit interests, notes, memories
8. **"Not quite right" → re-enter chat** — full refinement loop
9. **Year-round idea capture** — quick-capture flow for gift ideas
10. **Late gift de-stigmatization** — reframe late gifts with research backing

### P2 — Month 2 (Revenue + Growth)
11. **ChatAds affiliate integration** — immediate revenue per recommendation
12. **In-chat checkout (ACP/Stripe)** — buy without leaving the app
13. **Proactive "Gift Radar"** — calendar-based reminders 3 weeks out
14. **Share recommendations** — public link for co-gifting decisions
15. **Premium subscription** — $4.99/mo for unlimited recipients + priority AI

### P3 — Month 3+ (Scale)
16. **Experience catalog expansion** — Airbnb Experiences, ClassPass, local classes
17. **B2B white-label API** — corporate gifting market ($274B)
18. **Group gifting** — create group → split cost → coordinate
19. **Mobile app** (React Native or PWA)

---

## Key Metrics to Track (Once Live)

| Metric | Target | Current |
|--------|--------|---------|
| Landing → Start conversation | >30% | Unknown |
| Conversation completion | >40% | 100% in testing |
| Recommendation selection | >50% | Unknown |
| "Just Pick For Me" usage | Track | New feature |
| Budget compliance | >95% | 80% in testing |
| Slot 3 personalization | >90% | ~30% in testing |
| Waitlist conversion | >15% | No traffic yet |
| Time to gift (median) | <5 min | ~3 min in testing |

---

## File Structure

```
present-agent-v2/
├── app/                        # Next.js pages + API routes
│   ├── (marketing)/page.tsx    # Landing page (/)
│   ├── dashboard/page.tsx      # Contact search + occasions (/dashboard)
│   ├── gift/[sessionId]/       # Chat → recs → card flow
│   ├── admin/                  # Products, analytics, sessions
│   └── api/                    # 20+ API endpoints
├── components/                 # React components
├── lib/                        # Core logic
│   ├── recommend.ts            # 3-card recommendation engine
│   ├── catalog.ts              # Static product catalog (94 items)
│   ├── db.ts                   # SQLite schema + queries
│   ├── feedback.ts             # Feedback system + quality scoring
│   ├── events.ts               # Event tracking (30+ types)
│   ├── analytics.ts            # Computed metrics
│   ├── posthog.ts              # Client-side analytics
│   ├── profiles.ts             # Recipient profile management
│   └── prompts/                # AI system prompts
├── data/
│   ├── catalog.db              # 171K enriched products (local)
│   └── catalog.db.gz           # Compressed for deployment (38MB)
├── scripts/                    # Data pipeline
│   ├── crawl-stores.ts         # Shopify store crawler
│   ├── enrich-products.ts      # LLM enrichment (Claude)
│   ├── enrich-batch-quick.ts   # Fast enrichment (Gemini Flash)
│   ├── seed-existing.ts        # Seed from static catalog
│   └── data-quality.ts         # Data quality audit
├── docs/
│   ├── STATUS.md               # THIS FILE — single source of truth
│   ├── NEXT_STEPS.md           # Feature roadmap (from Mar 21)
│   ├── product-taxonomy.md     # Catalog strategy + gift psychology
│   ├── discovery/              # Original product discovery docs
│   └── research/               # Psychology + competitive research
├── test-results/               # Persona test transcripts + scores
├── mcp/                        # Claude Code MCP server
├── cli/                        # Command-line interface
├── e2e/                        # Playwright E2E tests
├── Dockerfile                  # Railway deployment
└── railway.json                # Railway config
```

---

## Agents & Tools

| Agent/Tool | Location | Purpose |
|-----------|----------|---------|
| VoC Agent | `~/.claude/agents/present-agent-voc.md` | Analyze conversations, map issues, steer features |
| MCP Server | `mcp/server.ts` | Use Present Agent from Claude Code |
| CLI | `cli/present.ts` | Command-line gift finding |
| Persona Tester | `test/run-personas.ts` | Automated conversation testing |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| GEMINI_API_KEY | Yes | Chat conversation (Gemini Flash) |
| ANTHROPIC_API_KEY | Yes | Recommendations + cards (Claude Sonnet) |
| OPENAI_API_KEY | Optional | Voice STT/TTS |
| GOOGLE_CLIENT_ID | Optional | Google OAuth (calendar/contacts) |
| GOOGLE_CLIENT_SECRET | Optional | Google OAuth |
| NEXT_PUBLIC_POSTHOG_KEY | Recommended | Client-side analytics + session recording |
| NEXT_PUBLIC_POSTHOG_HOST | Recommended | PostHog instance URL |
| NEXT_PUBLIC_APP_URL | Yes | App base URL |
