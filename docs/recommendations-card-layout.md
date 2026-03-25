# Recommendations: Gift Product Card Layout

**Status**: Proposed — awaiting approval before implementation
**Date**: 2026-03-24
**Scope**: The 3-recommendation screen in `app/gift/[sessionId]/page.tsx`
**Author**: Recommendations Writer Agent

---

## Request Summary

Replace the current full-width stacked card layout with a design that:
- Reduces scrolling and cognitive load on 430px mobile
- Makes all 3 options scannable without jumping between cards
- Respects the ADHD design constraint (minimize overwhelm, clear hierarchy)
- Preserves all required data fields without hiding them permanently

---

## Current State Analysis

### What exists today

`RecommendationCard` in `app/gift/[sessionId]/page.tsx` (lines 73–263) renders each of the 3 gifts as a standalone full-width card stacked vertically. Each card is approximately 600–700px tall on mobile, meaning:

- All 3 cards together require ~1,800–2,100px of scroll on a 430px screen (~4.5 full screens)
- User must scroll past card 1 entirely to see card 2 — no peripheral visibility
- No visual shortcut to compare price, match %, or slot label across options
- The `RecommendationItem` interface holds all required fields: `name`, `brand`, `price`, `imageUrl`, `buyUrl`, `matchScore`, `whyThisFits`, `giftAngle`, `whatThisSays`, `usageSignal`
- Slot labels and differentiator tags are generated inline via `SLOT_CONFIG` array

### Key constraints from codebase

- Tailwind CSS (standard config, no custom theme extensions beyond color vars)
- Next.js App Router, `"use client"` component
- `globals.css` already defines `.no-scrollbar`, `.animate-in`, `.safe-area-bottom`
- Images from Shopify CDN, square aspect ratio, `object-contain` rendering
- CTA button per card triggers `handleChoose()` which sets `confirmed` state and calls `onSelected()`
- Reaction buttons (thumbs up/down/too pricey) are per-card, non-blocking
- `<details>` element handles "How to give it" collapse natively
- ADHD design constraint is documented in `docs/discovery/PRODUCT_BRIEF.md`: the core ask is "here are 3 options, pick one" — not exploration, not comparison for its own sake

---

## The Real Problem to Solve

Before evaluating layouts, be precise about what is broken:

| Symptom | Root Cause |
|---------|------------|
| Too much scrolling | Cards are 600-700px tall; content density is low relative to height |
| Hard to compare | No shared visual anchor — each card is fully self-contained with no summary strip |
| Information hierarchy unclear | 7+ visual zones per card (image, product info, personalized context, usage signal, how-to, reactions, CTA) with inconsistent weight |
| Decision fatigue | User reads all 14+ data fields per card before seeing next option — high cognitive debt |

The fix is primarily an **information hierarchy problem**, not a layout problem. A different layout without re-prioritizing content will just move the problem elsewhere.

---

## Options

### Option A: Horizontal Swipe Carousel (Tinder-style)

**Approach**: One card visible at a time, full-width. Swipe or arrow buttons to advance. Pagination dots below.

**Effort**: Medium
**Pros**:
- Zero horizontal space constraint — card has full 430px
- Familiar pattern (Tinder, Instagram Stories, App Store carousels)
- Natural on touch mobile

**Cons**:
- Eliminates comparison entirely — user must hold options in working memory
- Working memory load is exactly what ADHD users cannot sustain: "I need to pick one but I can't remember card 1 while I'm on card 3"
- 3 options is the worst case for this pattern — carousels work at 10+ where you expect to not remember
- Scroll depth for full card content unchanged (still 600–700px per card)
- Implementing swipe on mobile with correct gesture handling in Next.js requires either `react-swipeable` or manual pointer events — medium complexity
- Breaks the "see all 3 options at a glance" moment the product needs to deliver ADHD relief

**Verdict**: Eliminates the comparison benefit. Wrong direction for ADHD users specifically.

---

### Option B: Side-by-Side Grid (Pricing page style)

**Approach**: 3 columns on desktop (each ~140px on 430px mobile). Each column shows the full card content in a narrow strip.

**Effort**: Medium
**Pros**:
- All 3 options visible simultaneously — best for comparison
- Widely understood pattern (pricing pages, product comparisons)

**Cons**:
- On 430px: each column is ~130px wide after gaps. Product images at 130px are too small to read brand/product name without zooming
- Price, brand, match % all become illegible at this width
- Touch targets for reaction buttons and CTA shrink below 44px accessibility minimum
- Horizontally scrollable version (overflow-x: scroll) creates discoverability problems — users on mobile rarely scroll content horizontally except for chips/carousels with visual affordance
- Works well on 1024px+ desktop; fails on the primary 430px target

**Verdict**: Desktop-first logic. Fails the primary viewport.

---

### Option C: Comparison Table

**Approach**: Rows of attributes (image, price, match %, why it fits), columns of products.

**Effort**: Large
**Pros**:
- Best for attribute-by-attribute comparison (price vs price, match vs match)
- Common in tech/e-commerce (Wirecutter, consumer reports)

**Cons**:
- Completely wrong for emotional/personalized content: "Why they'll love this" cannot be meaningfully displayed in a 130px table cell
- Images in table cells are awkward (thumbnails only)
- Eliminates the narrative arc that makes gifting feel personal — the product's whole value prop
- The personalized "why" text is the core differentiator of Present Agent. A table treats all attributes as equal data
- High implementation complexity: custom table with mixed content types (images, text blocks, reactions, CTAs) in aligned rows is non-trivial CSS
- Accessibility concerns: complex tables require ARIA headers per row/column

**Verdict**: Wrong paradigm. This app is selling emotional resonance, not specs comparison.

---

### Option D: Stacked Cards with Sticky Comparison Bar

**Approach**: Vertical stack of compressed cards. A sticky bar at top (or bottom) shows a 3-column summary: slot label + product name + price + match % for all 3. Tapping a summary column smooth-scrolls to that card.

**Effort**: Medium
**Pros**:
- Summary strip gives peripheral comparison without working memory load
- Each card has full width for content — no compression
- Scroll position preserved — user can read card 2 in detail while knowing what cards 1 and 3 are
- Works naturally on 430px and 1024px+
- The compressed strip has small touch targets but only needs to navigate, not trigger primary actions

**Cons**:
- Still requires scrolling to read full cards (problem only partially solved)
- Sticky bar adds ~72px of persistent chrome — reduces card viewport
- Implementation requires `useRef` scroll targets + `scrollIntoView` per card — low complexity but adds state
- If the user has already read all 3 cards, the sticky bar becomes noise

**Assessment**: Improves comparison without solving the core height problem.

---

### Option E: Progressive Disclosure — Compressed Summary + Expandable Detail

**Approach**: Each card starts in a compressed state (~120px tall) showing only the highest-signal information. A single tap expands to full detail. Only one card expanded at a time (accordion behavior optional).

**Effort**: Small-Medium
**Pros**:
- All 3 cards fit in ~360px combined — all visible on screen simultaneously on 430px
- Compressed view forces information hierarchy decision: what are the 4-5 fields that drive the selection?
- Expanded view can contain all current content without redesigning it
- Matches ADHD mental model exactly: scan all 3 first, drill into the one that catches eye
- Implementation is `useState` + height transition — 30 lines of new code
- Least risk: existing `RecommendationCard` component becomes the expanded state; only need to build the compressed header
- Can be shipped incrementally: compressed view ships first, expansion behavior ships after

**Cons**:
- Compressed state requires a clear, opinionated information hierarchy decision (this is actually a pro, not a con)
- Requires `overflow-hidden` height animation — `max-height` transition in CSS or `react-spring`/`framer-motion` for smooth feel; plain CSS `max-height` transition has a known jank problem when content height is unknown
- If user expands card 1 and wants to expand card 2, scrolling behavior can be confusing — needs scroll-to on expand
- First-time users may not know cards are expandable — needs clear visual affordance

**Verdict**: Best fit. Solves the core problem directly.

---

## Recommendation

**Recommended**: Option E — Progressive Disclosure with compressed header + expandable full detail

**Rationale**:

The ADHD design constraint defines the requirement precisely: "here are 3 options, pick one." The bottleneck is not the amount of information — it is the order in which information is presented. Users need to orient across all 3 options before committing attention to any single one. Option E solves this by separating the orienting phase (scan 3 compressed cards) from the evaluating phase (expand one card to read the full personalized context).

The other options either eliminate comparison (A), break on mobile (B, C), or only partially solve the problem (D). Option E is also the least disruptive to the existing codebase — the expanded state is the existing card, requiring no refactor of `RecommendationCard` business logic.

**Critical information hierarchy decision** (must be made before implementation):

The compressed view must answer one question: which of these 3 is worth expanding? The minimum viable signal set is:

1. Product image (square thumbnail, 64px)
2. Slot label + differentiator tag ("Top pick · Best match")
3. Product name + brand
4. Price
5. Match percentage (as a colored badge)

Everything else (whyThisFits, whatThisSays, usageSignal, giftAngle, reactions, CTA) lives in the expanded state.

---

## Wireframe Description

### Overall screen structure (430px mobile)

```
┌─────────────────────────────────────┐  ← 430px wide
│                                     │
│  [Header: "3 picks for Sarah"]      │  24px, font-semibold
│  [Subtitle: "Tap a card to see why"]│  13px, text-gray-400
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [CARD 1 — COMPRESSED]          │ │  ~96px tall
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [CARD 2 — COMPRESSED]          │ │  ~96px tall
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [CARD 3 — COMPRESSED]          │ │  ~96px tall
│ └─────────────────────────────────┘ │
│                                     │
│  All 3 cards visible on screen. ↓   │
│  No scroll required to orient.      │
│                                     │
└─────────────────────────────────────┘
```

### Compressed card (collapsed state, ~96px)

```
┌─────────────────────────────────────────────────────┐
│ [64x64 img] │ [TOP PICK] [Best match]    [87% match] │  row 1: 20px
│             │ Ceramic Cookware Duo                   │  row 2: 18px font-semibold
│             │ Caraway · $175                         │  row 3: 13px text-gray-400
│             │                              [↓ See why]│  row 4: 13px text-blue-500
└─────────────────────────────────────────────────────┘
  px-4 py-3   gap-3
```

- Image: `w-16 h-16 rounded-xl object-contain bg-gray-50 flex-shrink-0`
- Slot label: `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full` (color per SLOT_CONFIG)
- Differentiator tag: `text-[10px] px-2 py-0.5 rounded-full border` (color per SLOT_CONFIG)
- Match badge: `text-xs font-bold px-2 py-0.5 rounded-full` (green/blue/gray per threshold)
- Product name: `text-base font-semibold leading-tight`
- Brand + price: `text-[13px] text-gray-400`
- Expand affordance: `text-[13px] text-blue-500 flex items-center gap-1` + chevron-down icon, rotates to chevron-up when expanded

### Expanded card (full detail state)

Same as current `RecommendationCard` content, minus the hero image section which was full-width. In the expanded state, the image area shifts to a 2-column layout: image left (160px), product info right.

```
┌─────────────────────────────────────────────────────┐
│ [TOP PICK] [Best match]                 [87% match] │  ← compressed header stays
│ [64x64 img] │ Ceramic Cookware Duo                  │
│             │ Caraway · $175 · carawayhome.com       │
│             │ View product ↗                         │
├─────────────────────────────────────────────────────┤
│ [Why Sarah will love this — blue block]             │
│ 2-3 sentences personalized text                     │
│ ─────                                               │
│ "What this gift says" — italic violet               │
├─────────────────────────────────────────────────────┤
│ [clock] She'll use this every morning               │  usageSignal
│ [details] How to give it ▼                          │  collapsed
├─────────────────────────────────────────────────────┤
│ This pick: [👍] [👎] [$$$]             [Choose →]  │
└─────────────────────────────────────────────────────┘
```

The expanded CTA row keeps reaction buttons + "Choose this for Sarah" as a full-width button below, not inline. This prevents touch target crowding.

### Responsive breakpoints

| Viewport | Layout |
|----------|--------|
| < 640px (mobile) | Compressed cards stacked, full width, expand in-place |
| 640px–1023px (tablet) | Compressed cards stacked, max-w-lg centered |
| 1024px+ (desktop) | 3-column grid, each card always expanded (no compression needed — screen real estate solves the problem) |

Desktop class: `md:grid md:grid-cols-3 md:gap-4` on the wrapper. At `md:` breakpoint, cards skip the compressed/expanded state and render fully expanded by default.

---

## Implementation Plan

If approved:

1. **Add expanded state to card component** — add `isExpanded: boolean` prop and `useState` in parent to track which card is expanded (`expandedIndex: number | null`). Only one expanded at a time.

2. **Build `CompressedCardHeader` sub-component** — renders the 96px row with image, slot label, differentiator tag, match badge, name, brand/price, and expand chevron. Extract `SLOT_CONFIG` to its own constant so both sub-components can use it.

3. **Wrap content in conditional render** — `isExpanded ? <FullCardContent ... /> : null`. Use CSS `max-height` transition OR a lightweight `useAutoAnimate` hook (already in many Next.js stacks) for smooth expand. If neither is available, a simple `transition-all duration-200` on a `max-h-0 overflow-hidden` / `max-h-[2000px]` toggle works without dependencies, though the easing is imperfect on unknown heights.

4. **Auto-expand first card on mount** — `useEffect(() => setExpandedIndex(0), [])`. This gives ADHD users immediate content without requiring an interaction.

5. **Scroll-to on expand** — when user taps a compressed card to expand it, `scrollIntoView({ behavior: 'smooth', block: 'start' })` via a `ref` on the card. Prevents the expanded content from appearing off-screen.

6. **Desktop override** — wrap the `isExpanded` gate with a `useMediaQuery('(min-width: 1024px)')` hook (or a Tailwind JS approach). At 1024px+, all cards render expanded and the compress/expand interaction is disabled.

7. **Add instructional subtitle** — one line below the section header: "Tap to see why it fits" (or similar). Remove once analytics show >80% expansion rate, meaning the affordance is understood.

8. **Analytics event** — fire a `card.expanded` event via the existing `trackEvent` / PostHog infrastructure when a card is expanded, with `{ slot: 0|1|2, productId }`. This confirms the UX assumption that users are actually reading the detail.

### Files modified

| File | Change |
|------|--------|
| `app/gift/[sessionId]/page.tsx` | Add `expandedIndex` state, pass to `RecommendationCard`, add instructional subtitle |
| `app/gift/[sessionId]/page.tsx` | Add `CompressedCardHeader` sub-component (~60 lines) |
| `app/gift/[sessionId]/page.tsx` | Wrap `RecommendationCard` full content in `isExpanded` conditional |
| `globals.css` | Optional: add `.card-expand` keyframe if CSS transition approach chosen |

No new files, no new dependencies (unless opting for Framer Motion for animation quality).

### Tailwind classes — compressed header

```
// Card wrapper
className="bg-white rounded-2xl border overflow-hidden animate-in transition-all cursor-pointer
           border-green-300 shadow-md ring-1 ring-green-100  ← top pick only
           border-gray-200 shadow-sm                         ← others"

// Inner layout
className="flex items-center gap-3 px-4 py-3"

// Image
className="w-16 h-16 rounded-xl object-contain bg-gray-50 flex-shrink-0 p-1.5"

// Text column
className="flex-1 min-w-0"

// Top row (labels + match badge)
className="flex items-center gap-1.5 flex-wrap mb-1"

// Slot label
className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
// (colors from existing SLOT_CONFIG)

// Match badge
className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
// green-500/bg-green-50 ≥85%, blue-500/bg-blue-50 ≥70%, gray-600/bg-gray-100 otherwise

// Name line
className="font-semibold text-sm leading-tight truncate"

// Brand + price row
className="flex items-center justify-between mt-0.5"
// brand: text-[12px] text-gray-400
// price: text-sm font-bold text-gray-900

// Expand affordance
className="text-[12px] text-blue-500 flex items-center gap-0.5 mt-1"
// ChevronDownIcon w-3.5 h-3.5, rotate-180 when expanded
```

### Desktop 3-column expanded layout

```
// Wrapper at md+
className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4"

// At md+, remove compression: all cards render isExpanded=true, no compressed header shown
// Image area in expanded desktop: use aspect-video instead of aspect-square to reduce height
className="hidden md:block aspect-video relative w-full bg-gray-50"
className="block md:hidden aspect-square relative w-full bg-gray-50"
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CSS max-height animation jank on unknown content height | Medium | Low | Use `useAutoAnimate` or Framer Motion `AnimatePresence`; both are small deps |
| Users don't discover expansion (low expand rate) | Low-Medium | High | Auto-expand first card; add instructional subtitle; run analytics |
| CTA button in compressed state (user wants to choose without reading) | Low | Medium | Not needed — the compressed state doesn't have a CTA. User must expand to choose. This is intentional. |
| Screen scroll position confusion after expand | Medium | Medium | `scrollIntoView` on expand event (Step 5 above) |
| Desktop layout regression | Low | Low | Media query guard on compression logic |

---

## Open Questions

- Should expanding card 2 auto-collapse card 1, or allow multiple cards expanded simultaneously? Accordion (single-expand) reduces scroll length but may frustrate users who want to compare two expanded cards side-by-side on tablet. Recommend: accordion on mobile (`< 768px`), multi-expand on tablet/desktop (`≥ 768px`).

- What animation library is preferred for expand/collapse? The codebase currently uses no animation library — only the custom `slideUp` keyframe in `globals.css`. For MVP, CSS `max-height` transition is sufficient. For polish pass, Framer Motion `AnimatePresence` is the standard choice in Next.js.

- The `RecommendationItem` interface doesn't include a `differentiatorTag` field — it's currently hardcoded to `SLOT_CONFIG[rank].tag`. Is this always correct, or should the AI model be able to override the differentiator tag per recommendation? If so, add `differentiatorTag?: string` to the interface and fall back to `SLOT_CONFIG[rank].tag`.

- Analytics: what is the target expand rate before removing the "Tap to see why it fits" instructional subtitle? Suggest: remove when 7-day expand rate exceeds 75%.

---

## Next Steps

- [ ] Review this document
- [ ] Approve approach (or specify adjustments)
- [ ] Decision on accordion vs multi-expand behavior
- [ ] Decision on animation approach (CSS vs Framer Motion)
- [ ] Begin implementation in `app/gift/[sessionId]/page.tsx`
