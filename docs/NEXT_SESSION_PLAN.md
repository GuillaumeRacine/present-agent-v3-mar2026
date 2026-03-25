# Next Session Plan: Conversational Commerce UX Rebuild

> Saved: 2026-03-25
> Context: Present Agent v3 — gift recommendation app for ADHD adults

---

## North Star

**Maximize % of sessions that end in a purchase.**

Every UX decision is measured against this. The simulation harness (10 personas) provides the test loop.

---

## Architecture: Chat + Shopping Hybrid

The app blends conversational AI with ecommerce browsing. The user flows between modes:

```
CHAT MODE                    SHOPPING MODE                 TRACK MODE
(narrow intent)              (compare + decide)            (relationship over time)

"I need a gift for..."  →   [Card] [Card] [Card]     →   Saved recipients
  ↕ follow-up questions      ↕ react +/- on cards         Past gifts + reactions
  ↕ refine direction         ↕ type "more personal"        Upcoming occasions
  ↕ suggested replies        ↕ expand for detail           Gift history
                             ↕ buy CTA                     Learning loop
```

**Key UX principle**: Chat and product cards coexist. After recs appear, the input stays active. User can react to cards AND type follow-ups. The system refines recommendations in real-time based on both.

---

## Phase 1: shadcn/ui Setup + Component Rebuild

### 1.1 Install shadcn/ui
```bash
npx shadcn@latest init
# Select: Tailwind CSS, app directory, default style
```

### 1.2 Install core components
```bash
npx shadcn@latest add card badge button accordion tabs avatar separator skeleton dialog scroll-area
```

### 1.3 Rebuild recommendation cards
- Use `Card` + `CardHeader` + `CardContent` + `CardFooter`
- Side-by-side layout: 3 cards in a horizontal scroll on mobile, grid on desktop
- Each card: product image, name, brand, price, match %, slot badge
- Expand via `Accordion` or `Dialog` for full detail
- Reaction buttons as `Badge` variants (+Good / -Not for them / $$$)

### 1.4 Rebuild admin replay
- Use same card components as gift flow (single source of truth)
- Decision Journey as a `Timeline` component
- Session list with proper `Table` or card grid

---

## Phase 2: Horizontal Comparison Cards (ChatGPT-style)

### Layout on mobile (430px)
```
[  Card 1  ] [  Card 2  ] [  Card 3  ]
  ←  horizontal scroll, snap to card  →
```

### Layout on desktop (>768px)
```
[  Card 1  ] [  Card 2  ] [  Card 3  ]
      3-column grid, all visible
```

### Each card at glance level (~200px wide, ~280px tall)
- Product image (square, 160px)
- Slot badge overlay ("Top pick" / "Great match" / "Wild card")
- Match % overlay ("95%")
- Product name (1-2 lines, truncated)
- Brand
- Price (bold)
- [👍] [👎] reaction buttons

### Expanded state (tap card or "See details")
- Opens as bottom sheet (mobile) or side panel (desktop)
- Full product image
- Description
- "Why [name] will love this" personalized context
- "What this gift says" emotional message
- Usage signal
- "How to give it" guide
- "View on [retailer]" link
- "Choose this for [name]" CTA

---

## Phase 3: Inline Chat + Shopping Coexistence

After recommendations appear:
- Chat input stays at bottom
- User can type: "something more personal" or "cheaper options" or "she already has a diffuser"
- System processes the refinement and regenerates recs inline
- Previous recs fade/slide out, new ones slide in
- Reaction history persists (if user liked slot 1, similar items prioritized)

This is the killer feature -- the chat doesn't end when recs appear. It becomes a refinement loop.

---

## Phase 4: Conversion Analytics Dashboard

### Funnel metrics
```
Sessions started          → 100%
Conversation completed    → ?%
Recommendations viewed    → ?%
Card reaction given       → ?%
Product selected          → ?%
Card generated            → ?%
Purchase confirmed        → ?% ← NORTH STAR
Feedback link shared      → ?%
Recipient feedback        → ?%
```

### Factor analysis
For each session, track:
- Conversation turns (fewer = better?)
- Number of interests extracted
- Budget stated vs actual price of selection
- Recommendation relevance score
- Which slot selected (Top/Great/Wild)
- Card reactions before selection
- Time from recs shown to selection
- Whether user refined recommendations
- Card message: used AI-generated or wrote own

Correlate factors with purchase conversion to find:
- What conversation patterns lead to purchase?
- What recommendation attributes drive selection?
- Where do users drop off?

### Implementation
- New admin page: `/admin/analytics/conversion`
- Reads from events + gift_sessions + recommendation_logs
- Computed metrics with charts (use Tremor or Recharts)

---

## Phase 5: Persona Simulation Enhancements

### Add non-converting personas
Current personas all convert. Need:
- **Browsing only** — looks at recs but doesn't buy (comparison shopping)
- **Abandoner** — starts chat, gives info, but drops off before recs
- **Price shocker** — all 3 recs are too expensive, leaves
- **Wrong products** — none of the 3 feel right, refines once, still not happy, leaves
- **Returner** — comes back 3 days later and picks one

### Full journey simulation
Extend harness to simulate:
1. Chat (3 turns)
2. See recommendations
3. React to each (+/-)
4. Optionally refine ("not quite right")
5. See new recommendations
6. Select OR abandon
7. If selected: card generation, buy confirmation, feedback link
8. Track total journey time and all actions

### Conversion measurement
After running 20+ personas (10 converters + 10 non-converters):
- Calculate funnel conversion rates
- Identify drop-off points
- A/B test UX changes against conversion rate

---

## Technical Stack

| Component | Technology |
|-----------|-----------|
| UI Components | shadcn/ui (Radix + Tailwind) |
| Charts | Tremor or Recharts |
| Animations | Framer Motion (for card transitions) |
| State | React useState + Context (no Redux needed) |
| Data | SQLite (same as now) |
| Testing | Multi-turn harness (extended) |

---

## Priority Order

1. **shadcn/ui init + card rebuild** (biggest visual impact, 2-3 hours)
2. **Horizontal comparison layout** (1-2 hours)
3. **Chat stays active after recs** (2-3 hours, architectural change)
4. **Conversion dashboard** (2-3 hours)
5. **Non-converting personas + full simulation** (2-3 hours)

---

## Files Modified in This Session (for reference)

### New files created
- `lib/admin-auth.ts` — Auth middleware
- `lib/rate-limit.ts` — Rate limiter
- `lib/sanitize.ts` — Prompt sanitization
- `test/score-harness.ts` — Quality scoring
- `test/multi-turn-harness.ts` — Full conversation simulation
- `test/realistic-personas.json` — 10 diverse personas
- `app/admin/sessions/[sessionId]/page.tsx` — Session replay
- `app/api/admin/sessions/[sessionId]/messages/route.ts` — Messages API
- `docs/recommendations-card-layout.md` — Card layout research

### Key files modified
- `app/gift/[sessionId]/page.tsx` — Recommendation card redesign
- `app/api/chat/route.ts` — Sanitization + rate limiting
- `app/api/recommend/route.ts` — Interest prefiltering + rate limiting
- `lib/recommend.ts` — Interest-first prefilter + prompt improvements
- `next.config.mjs` — Fixed for Next.js 14.x
- `e2e/gift-flow.spec.ts` — Updated for new landing page
- `e2e/ux-quality.spec.ts` — Updated for new landing page

### Git commits
1. `573cf81` — Security hardening, recommendation quality, UX redesign, admin replay
2. `0f87bfa` — Make product cards clickable in admin replay
3. `e6e1cf1` — Redesign recommendation cards: compact+expand with reactions
4. `1447601` — Decision Journey timeline + 10 personas + reaction tracking
