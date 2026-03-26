# Present Agent — Claude Code Instructions

## What This Is

An AI gift recommendation engine with 171K products, 236K customer reviews, and Shopify checkout. Users interact via Claude Code CLI skills.

## Quick Setup

```bash
npm install
echo 'OPENAI_API_KEY=your-key' > .env.local
npm run dev
```

Then install skills: `cp docs/commands/*.md ~/.claude/commands/`

## Skills Available

- `/gift` — Find a gift (2-3 turn conversation → 3 recommendations)
- `/buy` — Create Shopify cart and open checkout
- `/remind` — Check upcoming gift occasions from calendar

## Key Files

| File | Purpose |
|------|---------|
| `lib/recommend.ts` | Recommendation engine (prefilter + LLM ranking) |
| `lib/shopify.ts` | Shopify API client (cart, checkout, product sync) |
| `lib/context-accumulator.ts` | Learning loop (session + feedback → preferences) |
| `lib/catalog.ts` | Product interface + static fallback catalog |
| `lib/db.ts` | SQLite schema + DbProduct interface |
| `app/api/gift/recommend/route.ts` | Main recommendation API endpoint |
| `app/api/webhooks/shopify/route.ts` | Order lifecycle webhook handler |
| `data/catalog.db` | SQLite database (171K products) |

## How the Recommendation API Works

```
POST /api/gift/recommend
Body: {
  recipient: { name, relationship, interests[] },
  occasion: { type },
  gift: { budget }
}
Returns: { recommendations: [{ slot, product, whyThisFits, socialProof, shopify }] }
```

The engine:
1. SQL prefilter (price, occasion, relationship, gift-proven boost)
2. 50 candidates → OpenAI gpt-4o-mini ranking
3. 3 picks with personalized copy + Shopify variant IDs

## Database Schema

Products have 40+ columns across 5 enrichment layers. Key fields:
- Gift intelligence: `psychological_fit`, `relationship_fit`, `occasion_fit`, `usage_signal`
- Reviews: `review_rating`, `review_count`, `review_excerpts`
- Review intelligence: `review_themes`, `gift_signals`, `quality_notes`
- Gift dimensions: `gift_suitability_score`, `gift_proven`, `relationships_mentioned`, `occasions_mentioned`, `uniqueness`

## When Working on This Code

- Recommendation engine is in `lib/recommend.ts` — changes here affect all gift picks
- Product sync to Shopify is in `scripts/sync-to-shopify.ts` — includes auto-publish
- Review data comes from Okendo API (free) — see `scripts/scrape-reviews.ts`
- All enrichment scripts are checkpoint-safe (resume from where they left off)
- The app uses OpenAI for recommendations, not Anthropic (API key reliability)
- Shopify credentials are in `.env.local` and 1Password vault "Agents"
