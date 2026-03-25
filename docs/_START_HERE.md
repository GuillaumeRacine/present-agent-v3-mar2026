# Present Agent — Start Here

> AI-powered gift recommendation app for ADHD adults.
> Conversational chat → 3 personalized products → card message → buy.

## Quick Links

| What | Where |
|------|-------|
| **Current state** | [STATUS.md](./STATUS.md) |
| **Roadmap** | [ROADMAP.md](./ROADMAP.md) |
| **Product taxonomy** | [product-taxonomy.md](./product-taxonomy.md) |
| **Card layout research** | [recommendations-card-layout.md](./recommendations-card-layout.md) |
| **Research archive** | [archive/research/](./archive/research/) |
| **Discovery archive** | [archive/discovery/](./archive/discovery/) |

## Local Dev

```bash
cd present-agent3
npm install
# .env.local should exist with API keys (see .env.example)
npm run dev
# → http://localhost:3000
```

## Key Commands

| Command | What |
|---------|------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npx tsc --noEmit` | Type check |
| `npx playwright test` | E2E tests |
| `npx tsx test/multi-turn-harness.ts` | Run 10-persona conversation test |
| `npx tsx test/score-harness.ts` | Run quality scoring |
| `npm run db:stats` | Catalog statistics |

## Architecture

```
User → Landing (/) → Chat (/gift/new) → 3 Recommendations → Card + Buy
         ↓                 ↓                    ↓
      Waitlist       Gemini Flash         Claude Sonnet
                     (2-3 turns)          (scoring 171K products)
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Chat AI | Gemini 2.5 Flash |
| Recommendations | Claude Sonnet 4 |
| Database | SQLite (better-sqlite3), 171K enriched products |
| Voice | Web Speech API + Whisper + OpenAI TTS |
| Analytics | PostHog (client) + SQLite events (server) |
| Hosting | Railway (Docker) |

## Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| Products | `/admin` | Browse 171K product catalog |
| Analytics | `/admin/analytics` | Funnel metrics, satisfaction |
| Sessions | `/admin/sessions` | Session explorer + replay |
| Session replay | `/admin/sessions/[id]` | Full conversation + recommendations + decision journey |

## GitHub

- **Repo:** `GuillaumeRacine/present-agent-v2`
- **Issues:** Feature backlog + user stories
- **Branch:** `main`
