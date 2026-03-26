# Present Agent

> AI gift concierge for ADHD adults. 171K products, 236K real customer reviews, Shopify checkout, Claude Code CLI.

Find the perfect gift in 2 minutes from your terminal. Tell it who you're shopping for, get 3 personalized recommendations with real customer reviews and social proof, then checkout in one click.

## Quick Start (Claude Code)

```bash
# 1. Clone and install
git clone https://github.com/GuillaumeRacine/present-agent-v3-mar2026.git
cd present-agent-v3-mar2026
npm install

# 2. Add your API key
echo 'OPENAI_API_KEY=your-key-here' > .env.local

# 3. Install Claude Code skills
cp docs/commands/gift.md ~/.claude/commands/gift.md
cp docs/commands/buy.md ~/.claude/commands/buy.md
cp docs/commands/remind.md ~/.claude/commands/remind.md

# 4. Start the app
npm run dev

# 5. In Claude Code, run:
/gift
```

## How It Works

```
You: /gift
Agent: Who's the gift for and what's the occasion?
You: My partner Sarah, birthday next month. She's into yoga and cooking. $75-100.

Agent:
  1. TOP PICK: Heart Padlock Necklace — $75
     Rated 5/5 by 25 verified buyers
     "Sarah loves yoga and cooking, and this elegant necklace
      adds sophistication to her daily outfits..."

  2. GREAT MATCH: Brightland Olive Oil Set — $62
     Rated 4.9/5 by 515 buyers
     "Perfect for someone who loves cooking..."

  3. WILD CARD: Daily Driver Kit — $99
     "Combines practicality with creativity..."

  Like one of these?

You: #1

Agent: [Opens Shopify checkout in your browser]
  Checkout ready! Heart Padlock Necklace for $75 CAD.
```

## Skills

| Skill | What It Does |
|-------|-------------|
| `/gift` | Conversational gift finder → 3 personalized recommendations |
| `/buy` | Create Shopify cart → open checkout in browser |
| `/remind` | Scan calendar for upcoming gift occasions |

## Architecture

```
/remind (calendar scan)
    → /gift (chat → context → recommend 3)
        → /buy (Shopify cart → checkout)
            → Webhooks (order tracking)
                → Feedback (learning loop)
```

| Layer | Technology |
|-------|-----------|
| CLI Interface | Claude Code skills |
| Web App | Next.js 14, Tailwind CSS |
| Chat | Gemini 2.5 Flash |
| Recommendations | OpenAI gpt-4o-mini (ranking) |
| Cards | Claude Sonnet (personalized messages) |
| Catalog | SQLite, 171K enriched products |
| Commerce | Shopify (Storefront API + Admin API) |
| Reviews | Okendo API (free) + Firecrawl |
| Voice | Web Speech API + Whisper + OpenAI TTS |
| Auth | Google OAuth |

## Data Pipeline

5 layers of enrichment on every product:

| Layer | What | Coverage | Source |
|-------|------|----------|--------|
| **Product catalog** | Name, brand, price, images | 171,450 | Shopify stores API |
| **Gift intelligence** | Psychological fit, relationship fit, occasions, traits | 171,450 (100%) | Claude Sonnet |
| **Customer reviews** | Ratings, review text, star breakdown | 12,652 (236K reviews) | Okendo API + Firecrawl |
| **Review intelligence** | Themes, gift signals, quality notes | 9,686 | OpenAI gpt-4o-mini |
| **Gift dimensions** | Suitability score, relationships, occasions, uniqueness | 171,020 (99.7%) | OpenAI gpt-4o-mini |

### Sample Enriched Product

```
Cashmere Crewneck by Todd Snyder — $328

Gift Intelligence:
  Mood: luxurious, thoughtful, practical
  For: partner, parent, close_family, friend
  Occasions: birthday, christmas, fathers_day, mothers_day

Reviews: 4.8/5 (25 reviews, 92% five-star)
  "Unbelievably comfortable" — Richard R. (verified)
  "Super cozy and soft right out of the box" — Matt J. (verified)

Review Intelligence:
  Themes: luxurious comfort, great quality, versatile style
  Gift Signals: frequently bought as a gift, great for winter holidays
  Quality Note: one reviewer noted shrinkage in wash

Gift Dimensions:
  Suitability: 0.85/1.0  |  Gift-proven: YES
  Given to: wife, mother, friend  |  For: birthday, christmas
  Uniqueness: medium  |  Unboxing: premium  |  Regift risk: low
```

## Recommendation Engine

```
Gift Context (recipient, occasion, budget, interests)
    │
    ├─ SQL Prefilter (150 candidates)
    │   ├─ Price range, occasion, relationship matching
    │   ├─ Rating filter (>= 3.5 stars)
    │   └─ Boost: gift-proven (+3), suitability (+2), matching occasions (+2),
    │           matching relationships (+2), review count (+2), uniqueness (+1)
    │
    ├─ Diversity: max 2/brand, max 12/category → 50 candidates
    │
    ├─ LLM Ranking (OpenAI gpt-4o-mini)
    │   ├─ Slot 1: TOP PICK (highest confidence)
    │   ├─ Slot 2: GREAT MATCH (sentimental, different category)
    │   └─ Slot 3: WILD CARD (surprising, high uniqueness)
    │
    └─ Output: whyThisFits, giftAngle, whatThisSays, usageSignal,
              socialProof, qualityCaveat, shopify variantId
```

### Context Accumulation (Gets Smarter Over Time)

Each gift session feeds back into the system:
- Recipient profile updated with new interests
- User preferences tracked (categories, budget patterns)
- Gift outcomes recorded (loved it / meh / returned)
- Next recommendation uses all accumulated context

## Shopify Integration

Products are synced to a Shopify store with 16 metafields of gift intelligence. Checkout happens via Shopify's hosted checkout (secure, PCI-compliant).

```
Product sync (SQLite → Shopify Admin API)
    → Published to Online Store
    → Queryable via Storefront API (with metafields)
    → Cart creation → checkout URL → payment
    → Webhooks: orders/create, orders/paid, fulfillments
    → Session tracking → delivery status → feedback trigger
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/dashboard` | Contacts, occasions, recipients |
| `/dashboard/profile` | User profile, gift history, learned preferences |
| `/dashboard/settings` | AI behavior sliders, privacy controls, data management |
| `/gift/[sessionId]` | Chat → recommendations → card |
| `/admin` | Product browser |
| `/admin/reviews` | Review browser with live customer reviews |
| `/admin/analytics` | Session funnel, recommendation metrics |

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gift/recommend` | POST | Get 3 recommendations (main entry point) |
| `/api/chat` | POST | Conversational profiling |
| `/api/recommend` | POST | Legacy recommendation endpoint |
| `/api/cards/generate` | POST | AI card message |
| `/api/admin/reviews` | GET | Review browser with filters |
| `/api/admin/reviews/[productId]` | GET | Live reviews from Okendo |
| `/api/admin/reviews/stats` | GET | Review coverage statistics |
| `/api/user/insights` | GET | User patterns and history |
| `/api/user/settings` | GET/PUT | Privacy and AI behavior settings |
| `/api/user/data-export` | GET/DELETE | GDPR data export/deletion |
| `/api/webhooks/shopify` | POST | Order lifecycle webhooks |
| `/api/v1/gift` | POST | Public REST API |

## Scripts

```bash
# Core
npm run dev                          # Start dev server
npm run build                        # Production build

# Data pipeline
npx tsx scripts/crawl-stores.ts           # Crawl Shopify stores
npx tsx scripts/enrich-products.ts        # Gift intelligence (Claude)
npx tsx scripts/scrape-reviews.ts         # Okendo review scraper (free)
npx tsx scripts/scrape-reviews-firecrawl.ts discover  # Find review platforms
npx tsx scripts/enrich-from-reviews.ts    # Review intelligence (OpenAI)
npx tsx scripts/enrich-gift-dimensions.ts # Gift dimensions (OpenAI)
npx tsx scripts/sync-to-shopify.ts        # Sync to Shopify store
npx tsx scripts/simulate-gift-journey.ts  # Test with simulated users

# Database
npm run db:stats                     # Catalog statistics
npm run db:quality                   # Data quality audit
```

## Environment Variables

```bash
# Required (recommendation engine)
OPENAI_API_KEY=sk-proj-...           # For recommendation ranking

# Shopify (for checkout)
SHOPIFY_STORE_DOMAIN=store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_STOREFRONT_PUBLIC_TOKEN=...

# Optional
GEMINI_API_KEY=...                   # For chat (Gemini Flash)
RECOMMEND_MODEL=gpt-4o-mini         # Override ranking model
GOOGLE_CREDENTIALS_PATH=...         # Google OAuth
GOOGLE_TOKEN_PATH=...               # Google OAuth token
```

## Testing

```bash
# E2E tests
npx playwright test

# Simulated user journeys (5 personas)
npx tsx scripts/simulate-gift-journey.ts --verbose

# Test specific persona
npx tsx scripts/simulate-gift-journey.ts --persona=1 --with-checkout
```

## Project Status

See [docs/STATUS.md](docs/STATUS.md) for deployment status and roadmap.

Full technical architecture: [briefs/01_present_agent.md](https://github.com/GuillaumeRacine/ensemble_prototypes/blob/main/briefs/01_present_agent.md)
