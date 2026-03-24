# Present Agent v2

An AI-powered gifting assistant designed for ADHD adults. Conversational chat builds a recipient profile in 2-3 turns, then delivers 3 psychology-informed gift recommendations with AI-generated cards and presentation guides.

## Architecture

```
Chat (Gemini Flash) → Gift Profile → SQLite Catalog (171K products) → Claude Sonnet Scoring → 3-Card Display → AI Card + Presentation Guide → Purchase → Recipient Feedback → Learning Loop
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, Tailwind CSS, React 18 |
| Chat | Gemini 2.5 Flash (fast conversational flow) |
| Recommendations | Claude Sonnet (nuanced matching, 3-slot strategy) |
| Cards | Claude Sonnet (personalized messages + presentation guides) |
| Catalog | SQLite (better-sqlite3), 171K enriched products |
| Voice STT | Web Speech API + Whisper fallback |
| Voice TTS | OpenAI TTS (server-side) |
| Auth | Google OAuth (profiles, calendar, contacts) |

## Features

### Core Gift Flow
- **3-turn conversational profiling** — extracts recipient, occasion, budget, interests
- **3-card recommendation engine** — Top Pick / Great Match / Wild Card slot strategy
- **AI-generated gift cards** — personalized messages that sound like the giver, not AI
- **Presentation guides** — wrapping ideas, timing advice, what to say
- **"Just Pick For Me"** — one-tap for decision-paralyzed users

### Persistent Memory
- **User accounts** — Google OAuth with persistent profiles
- **Recipient profiles** — interests, avoids, shared memories, inside jokes
- **Gift history** — what worked, what didn't, satisfaction tracking
- **Learning loop** — feedback from recipients improves future recommendations

### Intelligence
- **Budget compliance** — tight pre-filter + hard post-filter (95% floor, 110% ceiling)
- **Category diversity** — enforced in post-processing (no two same-category picks)
- **Recipient feedback** — shareable feedback links, reactions feed back into profiles
- **Urgency awareness** — last-minute filter for occasions within 3 days
- **Relationship normalization** — "best friend" → friend, "mother-in-law" → extended_family

### Voice Mode
- Browser Speech API with Whisper STT fallback
- OpenAI TTS for natural voice output
- Voice activity detection (auto-send after 1.5s silence)
- Persistent preference (localStorage)

### Instrumentation
- Full event taxonomy (session lifecycle, chat, recs, cards, delivery, voice)
- Analytics dashboard at `/admin/analytics`
- Session funnel, conversation metrics, recommendation accuracy, satisfaction

## Product Catalog

171K enriched products from 600+ Shopify stores, all $1-$1000 USD:

| Field | Description |
|-------|-------------|
| `category` | practical, experiential, consumable, artisan, wellness, kids |
| `psychological_fit` | practical, thoughtful, playful, luxurious, sentimental, adventurous |
| `relationship_fit` | partner, parent, child, close_family, friend, professional, acquaintance |
| `recipient_traits` | Free-form tags (coffee, outdoors, baking, gaming, etc.) |
| `occasion_fit` | birthday, mothers_day, christmas, wedding, etc. |
| `price_tier` | token, budget, moderate, premium, luxury |
| `usage_signal` | "She'll use this every morning" |
| `what_this_says` | "This says: 'I notice the little rituals that make your day better'" |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | ADHD-specific landing page with waitlist capture |
| `/dashboard` | Search contacts, upcoming occasions, "Your People" grid |
| `/gift/[sessionId]` | Chat → profile card → 3 recommendations → card page |
| `/gift/[sessionId]/card` | Card preview → presentation guide → summary → purchase → feedback link |
| `/feedback/[token]` | Public recipient feedback page (no auth required) |
| `/admin` | Product browser (filter, search, paginate) |
| `/admin/analytics` | Funnel, conversation, recommendation, satisfaction metrics |
| `/admin/sessions` | Per-session event timeline explorer |

## Project Status

See [docs/STATUS.md](docs/STATUS.md) for the complete project status, next steps, and deployment instructions.

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Conversational gift profiling (Gemini Flash) |
| `/api/recommend` | POST | 3-card recommendations (Claude Sonnet) |
| `/api/cards/generate` | POST | AI card message + presentation guide |
| `/api/auth/google` | POST | Google OAuth user creation |
| `/api/users/me` | GET/PATCH | Current user profile + preferences |
| `/api/recipients` | GET/POST | List/create recipients |
| `/api/recipients/[id]` | GET/PATCH | Single recipient + history |
| `/api/sessions` | POST | Create persistent gift session |
| `/api/sessions/[id]` | GET/PATCH | Session state management |
| `/api/events` | POST | Client-side event ingestion |
| `/api/analytics` | GET | Computed metrics |
| `/api/feedback` | POST | Session feedback (implicit/explicit) |
| `/api/feedback/recipient/[token]` | GET/POST | Recipient feedback submission |
| `/api/voice/stt` | POST | Whisper speech-to-text |
| `/api/voice/tts` | POST | OpenAI text-to-speech |
| `/api/v1/gift` | POST | Public REST API — get recommendations |
| `/api/v1/gift/[id]` | GET/PATCH | Public REST API — session details |
| `/api/v1/occasions` | GET | Public REST API — upcoming occasions |
| `/api/v1/recipients` | GET | Public REST API — user's recipients |
| `/api/occasions` | GET | Calendar occasions |
| `/api/contacts` | GET | Google Contacts search |
| `/api/catalog/stats` | GET | Catalog statistics |
| `/api/admin/products` | GET | Paginated product browser |

## MCP Server

Claude Code integration via `mcp/server.ts`:

| Tool | Purpose |
|------|---------|
| `present_find_gift` | Find gift recommendations |
| `present_occasions` | Get upcoming occasions |
| `present_recipient_profile` | Look up saved recipient |
| `present_generate_card` | Generate card message |
| `present_mark_given` | Mark gift as given + get feedback link |

## CLI

```bash
npx tsx cli/present.ts gift --for "Mom" --occasion birthday --budget "$50-100"
npx tsx cli/present.ts occasions --days 30
npx tsx cli/present.ts recipients
```

## Setup

```bash
npm install
cp .env.local.example .env.local  # Add API keys (see below)
npm run dev
```

Required environment variables:
- `ANTHROPIC_API_KEY` — Claude API
- `GEMINI_API_KEY` — Gemini Flash
- `OPENAI_API_KEY` — Whisper STT + TTS
- `GOOGLE_CREDENTIALS_PATH` — Google OAuth credentials
- `GOOGLE_TOKEN_PATH` — Google OAuth token

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run db:stats         # Catalog statistics
npm run db:enrich        # Run LLM enrichment
npm run db:quality       # Data quality audit
npm run db:import-shopify # Import from Shopify stores
```

## Testing

```bash
npx playwright test                    # All E2E tests
npx playwright test -g "API Routes"    # API tests only (7 tests)
npx playwright test -g "UX"            # Browser UX tests (11 tests)
```

## Data Pipeline

1. **Import**: `import-shopify.ts` crawls Shopify stores → SQLite
2. **Enrich**: `enrich-products.ts` adds gift intelligence via Claude
3. **Clean**: `data-quality.ts` removes junk prices, duplicates, missing data
4. **Tag**: Batch SQL updates for hobby traits (baking, last-minute, etc.)
5. **Serve**: Recommendation engine queries enriched products at runtime
