# Product Taxonomy & Recommendation System Design

> Informed by: 15+ academic papers, 100-scenario test run, catalog strategy research, competitive analysis
> Purpose: Define the ideal product space, attribute system, and recommendation architecture to guide catalog acquisition

---

## 1. What the 100-Scenario Test Revealed

Before designing forward, here's what broke:

| Problem | Evidence | Root Cause |
|---------|----------|------------|
| Same 8 products in every conversation | Poketo 38x, YETI 38x, Rifle Paper 34x | 20-product catalog, no diversity |
| Artisan category = 47% of all recs | 140/297 recommendations | Over-indexed on "safe" lifestyle gifts |
| Wellness only 6% of recs | 19/297 | 3 wellness products vs 7 artisan |
| Zero kids/baby products | 7 scenarios for children, 0 relevant recs | Category doesn't exist in catalog |
| $200+ gifts = 2% of recs | 5/297 even when budget was "$300-500" | Only 2 products above $200 |
| No music/hobby products | 10+ scenarios for musicians | Category doesn't exist |
| International scenarios unaddressed | Portugal, Germany sends failed silently | No shipping/locale metadata |

**The catalog is the bottleneck, not the AI.** The conversation engine works (99% completion, 3.4 avg turns). The recommendation engine works (correct matching logic). But you can't recommend what you don't have.

---

## 2. The Gift Space: A Research-Grounded Framework

### 2.1 The Two Axes That Matter Most

From the psychology research, every gift lives on two fundamental dimensions:

```
                    GIVER-CENTRIC
                    (expresses the giver)
                         ↑
                         |
          Sentimental    |    Experiential
          Star map,      |    Concert tickets,
          photo book,    |    cooking class,
          custom art     |    travel voucher
                         |
    FUNCTIONAL ──────────┼──────────── SYMBOLIC
    (solves a need)      |           (carries meaning)
                         |
          Practical      |    Aspirational
          Kitchen tool,  |    Luxury candle,
          tech gadget,   |    design object,
          fitness gear   |    craft spirits
                         |
                         ↓
                    RECIPIENT-CENTRIC
                    (satisfies the recipient)
```

**Why these axes?**
- **Functional ↔ Symbolic** maps to the construal level asymmetry (Ward & Broniarczyk 2016): givers think abstract/symbolic, recipients think concrete/functional. Good recs bridge both.
- **Giver-centric ↔ Recipient-centric** maps to the core finding (Aknin & Human 2015): giver-centric gifts produce more closeness, but givers default to recipient-centric out of anxiety.

### 2.2 The Six Gift Motivations

Every gift purchase is driven by one or more of these psychological motivations (mapped from research):

| Motivation | Description | Relationship Signal | Example |
|-----------|-------------|-------------------|---------|
| **Care** | "I see your needs" | Attentiveness, nurturing | Weighted blanket for anxious friend |
| **Delight** | "I want to surprise you" | Playfulness, joy | Scratch-off date night book |
| **Investment** | "I believe in your growth" | Support, encouragement | MasterClass for aspiring cook |
| **Celebration** | "This moment matters" | Presence, acknowledgment | Custom star map of wedding night |
| **Connection** | "I want us to share this" | Intimacy, togetherness | Couples cooking class |
| **Appreciation** | "Thank you / I value you" | Gratitude, reciprocity | Premium candle for a host |

**How this maps to the system**: The conversation extracts the dominant motivation via the question "What do you want this gift to express?" The recommendation engine then weights products that match that motivation higher.

---

## 3. Product Attribute Schema (v2)

### 3.1 Core Attributes (Required for Every Product)

```typescript
interface Product {
  // ── Identity ──
  id: string;
  name: string;
  brand: string;
  shortDescription: string;      // 1 sentence, benefit-focused
  longDescription?: string;       // 2-3 sentences for detail page

  // ── Commerce ──
  price: number;
  currency: "CAD" | "USD";
  buyUrl: string;                 // Direct product page
  giftUrl?: string;               // Gift-specific page if different
  imageUrl: string;
  inStock: boolean;
  shipsTo: ("CA" | "US" | "UK" | "EU" | "INT")[];
  fulfillment: "ships_direct" | "digital" | "gift_card" | "experience_voucher";

  // ── Classification ──
  category: ProductCategory;
  subcategory: string;
  priceTier: "token" | "budget" | "moderate" | "premium" | "luxury" | "splurge";

  // ── Gift Intelligence (our value-add) ──
  giftMeta: GiftMeta;
}
```

### 3.2 Gift Intelligence Layer (Our Competitive Advantage)

This is what makes Present Agent different from a product catalog. Every product gets qualitative metadata that encodes gift-giving psychology:

```typescript
interface GiftMeta {
  // ── Psychological Fit ──
  motivation: GiftMotivation[];          // Care, Delight, Investment, Celebration, Connection, Appreciation
  emotionalTone: EmotionalTone[];        // warm, playful, luxurious, sentimental, practical, adventurous
  effortSignal: "low" | "moderate" | "high" | "very_high";
  surpriseFactor: 1 | 2 | 3 | 4 | 5;   // 1=expected, 5=totally unexpected

  // ── Relationship Fit ──
  relationshipFit: RelationshipType[];   // partner, parent, child, sibling, close_friend, friend, professional, acquaintance
  closenessRequired: "any" | "moderate" | "close" | "intimate";
  safeForUnknown: boolean;               // Can you give this to someone you barely know?

  // ── Recipient Dimensions ──
  recipientAge: AgeRange[];              // baby, toddler, child, teen, young_adult, adult, senior
  recipientTraits: string[];             // Free-form: "coffee", "yoga", "minimalist", "outdoors"
  recipientPersonality: PersonalityFit[];// curious, creative, practical, social, introspective, active

  // ── Occasion Fit ──
  occasionFit: OccasionType[];
  seasonality?: ("spring" | "summer" | "fall" | "winter" | "any")[];
  isLastMinute: boolean;                 // Can arrive in <3 days or is digital?

  // ── Giver Experience ──
  customizable: boolean;                 // Can it be personalized (engraving, custom message)?
  giftReady: boolean;                    // Arrives in gift packaging?
  pairsWith?: string[];                  // Product IDs that complement this (e.g., candle + matches)
  howToPresent: string;                  // 1-sentence gift angle: "Tell her you noticed she's been..."
  riskFactors?: string[];                // "Sizing required", "Fragrance is personal", "Requires setup"
}

type GiftMotivation = "care" | "delight" | "investment" | "celebration" | "connection" | "appreciation";
type EmotionalTone = "warm" | "playful" | "luxurious" | "sentimental" | "practical" | "adventurous" | "cozy" | "sophisticated";
type RelationshipType = "partner" | "parent" | "child" | "sibling" | "close_friend" | "friend" | "professional" | "acquaintance" | "teacher" | "service_provider";
type AgeRange = "0-2" | "3-5" | "6-11" | "12-17" | "18-25" | "26-40" | "41-60" | "61+";
type PersonalityFit = "curious" | "creative" | "practical" | "social" | "introspective" | "active" | "homebody" | "minimalist" | "maximalist";
type OccasionType = "birthday" | "christmas" | "mothers_day" | "fathers_day" | "valentines" | "anniversary" |
  "wedding" | "baby_shower" | "housewarming" | "graduation" | "retirement" | "thank_you" |
  "get_well" | "congratulations" | "just_because" | "secret_santa" | "farewell" | "new_baby" |
  "promotion" | "engagement" | "sympathy";
```

### 3.3 What's New vs Current Schema

| Current (v1) | New (v2) | Why |
|-------------|----------|-----|
| 6 `psychologicalFit` values | 6 `motivation` + 8 `emotionalTone` | Separates WHY (motivation) from HOW IT FEELS (tone) |
| No age dimension | `recipientAge` ranges | Kids, seniors, teens all need different products |
| Binary `giftable: true` | `closenessRequired` + `safeForUnknown` | A $400 ring isn't safe for acquaintances |
| No shipping info | `shipsTo` + `fulfillment` type | International scenarios failed in testing |
| No `surpriseFactor` | 1-5 scale | Research shows recipients prefer surprising gifts that givers avoid |
| No `riskFactors` | Free-form array | "Sizing required" prevents bad recs for clothing |
| No `customizable` flag | Boolean | Custom products signal highest effort |
| No `pairsWith` | Product ID links | Enables "gift set" recommendations |
| No `isLastMinute` | Boolean | 15% of scenarios were urgent/last-minute |
| No `howToPresent` | Pre-written angle | Currently generated per-request, should be pre-authored for quality |

---

## 4. Product Categories & Target Counts

### 4.1 Category Tree (200 products target)

```
PRACTICAL (50 products)
├── Kitchen & Cooking (12)
│   ├── Cookware (Caraway, Our Place, Staub)
│   ├── Small appliances (Fellow kettle, Ember mug, Breville)
│   └── Tools & accessories (knife sets, cutting boards, aprons)
├── Tech & Gadgets (10)
│   ├── Audio (speakers, headphones, earbuds)
│   ├── Smart home (lights, displays, trackers)
│   └── Productivity (stylus, chargers, organizers)
├── Home & Living (10)
│   ├── Organization (Yamazaki, Container Store)
│   ├── Textiles (Brooklinen, Parachute)
│   └── Lighting & decor
├── Outdoor & Active (8)
│   ├── Drinkware (YETI, Stanley, Hydro Flask)
│   ├── Gear (Bellroy, Peak Design)
│   └── Garden & patio
└── Kids & Baby (10)
    ├── STEM / Learning (0-5, 6-11)
    ├── Sensory & developmental
    ├── Musical instruments (kid-size)
    └── Baby essentials & nursery

EXPERIENTIAL (40 products)
├── Learning & Growth (10)
│   ├── Online courses (MasterClass, Skillshare)
│   ├── Workshop vouchers (local cooking/art classes)
│   └── Book subscriptions (Book of the Month)
├── Food & Drink Experiences (10)
│   ├── Restaurant gift cards (local chains)
│   ├── Tasting experiences (wine, cheese, chocolate)
│   └── Cooking classes
├── Adventure & Travel (10)
│   ├── Airbnb Experiences
│   ├── Activity vouchers (spa, skydiving, escape room)
│   └── Travel accessories
└── Entertainment (10)
    ├── Streaming gifts (Spotify, Audible)
    ├── Event tickets (concerts, sports, shows)
    └── Games & activities (board games, date night books)

CONSUMABLE (35 products)
├── Coffee & Tea (8)
│   ├── Subscriptions (Trade, Blue Bottle, Driftaway)
│   ├── Single bags (specialty roasters)
│   └── Accessories (pour-over sets)
├── Food & Treats (10)
│   ├── Chocolate & confections (Compartes, Vosges)
│   ├── Gourmet boxes (Goldbelly, Murray's Cheese)
│   └── Snack subscriptions
├── Spirits & Cocktails (8)
│   ├── Cocktail kits (Batch & Bottle, W&P)
│   ├── Premium spirits
│   └── Bar tools
├── Flowers & Plants (5)
│   ├── Bouquet delivery (Farmgirl, Bouqs)
│   └── Potted plants (The Sill, Bloomscape)
└── Pantry & Provisions (4)
    ├── Olive oil, honey, hot sauce
    └── Spice sets

ARTISAN (40 products)
├── Home Fragrance (8)
│   ├── Candles (Le Labo, Diptyque, Boy Smells)
│   ├── Diffusers (Vitruvi, Aesop)
│   └── Incense
├── Stationery & Paper (8)
│   ├── Notebooks (Poketo, Rifle Paper, Moleskine)
│   ├── Planners (Ink+Volt, Hobonichi)
│   └── Pens & writing tools
├── Art & Decor (8)
│   ├── Prints & posters (Juniper Print Shop)
│   ├── Custom art (star maps, city maps, portraits)
│   └── Ceramics & objects
├── Jewelry & Accessories (8)
│   ├── Minimalist jewelry (Mejuri, Monica Vinader)
│   ├── Watches (Skagen, Nordgreen)
│   └── Scarves, wallets, leather goods
└── Self-Care & Beauty (8)
    ├── Skincare sets (Aesop, Drunk Elephant)
    ├── Bath & body (L'Occitane, Herbivore)
    └── Grooming kits

WELLNESS (35 products)
├── Mind & Meditation (8)
│   ├── App subscriptions (Headspace, Calm, Waking Up)
│   ├── Meditation accessories (cushions, singing bowls)
│   └── Journals (5 Minute Journal, gratitude journals)
├── Movement & Fitness (10)
│   ├── Yoga (Lululemon mat, Manduka, props)
│   ├── Fitness (resistance bands, smart jump rope)
│   ├── Recovery (Theragun, massage tools)
│   └── Wearables (Oura, Whoop, Apple Watch bands)
├── Sleep & Rest (8)
│   ├── Weighted blankets (Bearaby, Gravity)
│   ├── Sleep aids (Hatch Restore, silk eye mask)
│   └── Pillow/bedding upgrades
└── Nutrition & Supplements (4) [OPTIONAL — higher risk]
    ├── Vitamin subscriptions (Care/of, Ritual)
    └── Superfood kits

MUSIC & CREATIVE (NEW — 10 products)
├── Instruments & Accessories (4)
│   ├── Ukulele starter, kalimba, thumb piano
│   └── Guitar picks, capos, straps (premium)
├── Recording & Production (3)
│   └── Portable recorder, mic, headphones
└── Music Gifts (3)
    ├── Vinyl subscription (VNYL, Vinyl Me Please)
    └── Songwriting journal, music theory book
```

### 4.2 Current Distribution (254K products, post-enrichment)

| Category | Count | % |
|----------|-------|---|
| Practical | 113,161 | 45% |
| Artisan | 88,997 | 35% |
| Kids | 18,309 | 7% |
| Consumable | 13,400 | 5% |
| Wellness | 12,023 | 5% |
| Experiential | 6,954 | 3% |
| **Total** | **254,065** | **100%** |

> Note: Original targets (210 products) were based on manual curation. The catalog has since been expanded to 254K via Shopify store crawling + LLM enrichment.

---

## 5. Price Architecture

### 5.1 Price Tiers (Research-Informed)

| Tier | Range (CAD) | % of Catalog | Use Case |
|------|------------|--------------|----------|
| **Token** | $10-25 | 10% | Secret Santa, teacher gifts, stocking stuffers |
| **Budget** | $25-50 | 20% | Acquaintances, kids' parties, small gestures |
| **Moderate** | $50-100 | 30% | Friends, colleagues, most birthdays |
| **Premium** | $100-200 | 25% | Close family, partners, significant occasions |
| **Luxury** | $200-400 | 10% | Milestone birthdays, anniversaries, push presents |
| **Splurge** | $400+ | 5% | Once-in-a-decade moments, major life events |

### 5.2 Current vs Target Distribution

```
Current:                        Target:
Token    ($10-25)   ▓░░░  5%   Token    ($10-25)   ▓▓░░░░░░░░  10%
Budget   ($25-50)   ▓▓░░ 15%   Budget   ($25-50)   ▓▓▓▓░░░░░░  20%
Moderate ($50-100)  ▓▓▓▓ 40%   Moderate ($50-100)  ▓▓▓▓▓▓░░░░  30%
Premium  ($100-200) ▓▓▓░ 30%   Premium  ($100-200) ▓▓▓▓▓░░░░░  25%
Luxury   ($200-400) ▓░░░ 10%   Luxury   ($200-400) ▓▓░░░░░░░░  10%
Splurge  ($400+)    ░░░░  0%   Splurge  ($400+)    ▓░░░░░░░░░   5%
```

The test showed 40% of recs were under $50 even for high-budget scenarios. We need more $200+ products and better budget-tier matching.

---

## 6. Recommendation Algorithm Design

### 6.1 Scoring Pipeline

```
User Context (from conversation)
        │
        ▼
┌─────────────────────┐
│  1. HARD FILTERS    │  Eliminate impossible matches
│  - Budget range     │  (budget ± 30% tolerance)
│  - Recipient age    │  (no wine for kids)
│  - Ships to locale  │  (no US-only for EU)
│  - In stock         │
└────────┬────────────┘
         │ Candidates (typically 40-80 products)
         ▼
┌─────────────────────┐
│  2. ATTRIBUTE SCORE  │  Weighted multi-signal match
│  (0.0 - 1.0)        │
│                      │
│  Motivation match    │  0.25 weight
│  Relationship fit    │  0.20 weight
│  Trait overlap       │  0.20 weight
│  Occasion fit        │  0.15 weight
│  Emotional tone      │  0.10 weight
│  Effort signal       │  0.10 weight
└────────┬────────────┘
         │ Scored candidates
         ▼
┌─────────────────────┐
│  3. LLM RE-RANK     │  Claude evaluates top 10
│  - Holistic fit      │  considering full context
│  - Surprise value    │  research: recipients prefer surprise
│  - Giver expression  │  does it say what they want to say?
│  - Risk assessment   │  any red flags for this person?
└────────┬────────────┘
         │ Ranked list
         ▼
┌─────────────────────┐
│  4. TRIPLET SELECT   │  Pick 3 with diversity
│                      │
│  Slot 1: TOP PICK    │  Highest overall score
│  Slot 2: THOUGHTFUL  │  Different category, high motivation match
│  Slot 3: WILD CARD   │  Unexpected, high surprise factor
│                      │
│  Constraint: no 2    │
│  from same category  │
│  or same brand       │
└────────┬────────────┘
         │ Final 3
         ▼
┌─────────────────────┐
│  5. EXPLAIN          │  Generate personalized copy
│  - whyThisFits      │  References user's words
│  - howToPresent      │  Giver confidence boost
│  - confidence        │  "Strong match" / "Worth considering"
└─────────────────────┘
```

### 6.2 Triplet Design (Research-Backed)

The 3-card layout is intentional, not arbitrary:

| Slot | Label | Strategy | Psychology |
|------|-------|----------|------------|
| **1** | Top Pick | Highest-confidence match. Anchors trust. | Anchoring effect: first option frames expectations |
| **2** | Great Match | Different category, matches stated direction. | Validates the system "gets" the relationship |
| **3** | Wild Card | Unexpected category, high surprise factor. | Addresses regulatory focus asymmetry: givers avoid surprise, but recipients love it |

**Diversity constraints** (from test findings):
- No two products from same subcategory
- No two products from same brand
- At least one product from a different category than the stated direction
- Price variance: at least one product below stated budget midpoint, at least one above

### 6.3 Confidence Scoring

```typescript
interface ConfidenceScore {
  overall: number;        // 0.0 - 1.0
  breakdown: {
    contextRichness: number;    // How much we know (turns, specificity)
    attributeCoverage: number;  // How many attributes matched
    budgetFit: number;          // Within budget range?
    uniquenessOfMatch: number;  // Multi-attribute match vs generic
  };
  display: "Strong match" | "Good match" | "Worth considering";
}
```

Display rules:
- ≥0.85: "Strong match" (green badge)
- ≥0.65: "Good match" (blue badge)
- <0.65: "Worth considering" (gray badge)

---

## 7. Product Enrichment: What We Add

This is where Present Agent creates value beyond being a product catalog. For every product, we author:

### 7.1 Gift Intelligence (Human-Authored, Not Scraped)

| Field | Example (Le Labo Santal 26 Candle) | Why It Matters |
|-------|-------------------------------------|----------------|
| `howToPresent` | "Tell them you picked this scent because it reminded you of that cabin weekend" | Gives giver confidence, reduces anxiety |
| `riskFactors` | ["Fragrance is personal — safest for people whose home you've visited"] | Prevents bad matches |
| `surpriseFactor` | 3/5 | Helps Wild Card slot selection |
| `closenessRequired` | "any" | Safe for acquaintances too |
| `pairsWith` | ["le-labo-matches", "ceramic-tray"] | Enables gift sets |

### 7.2 Occasion-Specific Angles (Pre-Written)

For top products, pre-write occasion-specific gift angles:

```typescript
interface OccasionAngle {
  occasion: OccasionType;
  angle: string;           // How to frame this gift for this occasion
  cardMessage?: string;    // Optional card message template
}

// Example for Vitruvi Stone Diffuser:
occasionAngles: [
  { occasion: "mothers_day", angle: "For the mom who gives everything and takes nothing for herself" },
  { occasion: "housewarming", angle: "The first thing they'll turn on when they get home" },
  { occasion: "birthday", angle: "An upgrade she'd never buy herself but will use every single day" },
  { occasion: "thank_you", angle: "A small luxury that says 'I notice you'" },
]
```

### 7.3 Relationship-Specific Framing

The same product needs different language depending on who it's for:

```
Headspace Annual Subscription:

For partner:    "You've been stressed. This is me saying I see that and I care."
For parent:     "I know you'd never download this yourself, but trust me — try it."
For colleague:  "A little something for those Monday mornings."
For friend:     "Remember when you said you wanted to start meditating? No excuses now."
```

This is the core insight from the psychology research: **the same product can express Care, Investment, or Appreciation depending on framing.** The framing IS the gift intelligence.

---

## 8. Catalog Acquisition Priority

### 8.1 Phase 1: Fill Critical Gaps (Next 50 products)

Based on the 100-scenario test failures:

| Gap | Priority | Products Needed | Example Brands |
|-----|----------|----------------|----------------|
| Kids 0-5 (ASD-friendly) | P0 | 8 | Lovevery, Melissa & Doug, Fat Brain Toys |
| Kids 6-11 | P0 | 5 | LEGO, Kiwi Crate, National Geographic |
| Baby / newborn | P0 | 5 | Aden + Anais, Hatch, Jellycat |
| Luxury $200-400 | P1 | 8 | Mejuri, Aesop, Theragun, Bellroy |
| Splurge $400+ | P1 | 4 | Oura Ring (already have), Bang & Olufsen, Dyson |
| Music / instruments | P1 | 5 | Fender, Kala, Vinyl Me Please |
| Flowers / plants | P2 | 4 | The Bouqs, The Sill, Bloomscape |
| Sleep / rest | P2 | 4 | Bearaby, Hatch Restore, Slip |
| Jewelry (minimalist) | P2 | 4 | Mejuri, Monica Vinader |
| Digital / last-minute | P2 | 5 | Spotify, Audible, Kindle credits |

### 8.2 Phase 2: Depth in Strong Categories (Next 100 products)

Add variety within categories that already work:
- More price points per subcategory (token → splurge coverage)
- Canadian-specific options (ships from CA, no customs)
- Seasonal variants (summer outdoor, winter cozy)

### 8.3 Product Sourcing Checklist

For every product added, verify:

- [ ] Direct product URL works and links to purchasable page
- [ ] Gift-specific URL exists (if different)
- [ ] Price confirmed in CAD (or USD with clear conversion)
- [ ] Ships to Canada (minimum)
- [ ] In stock / available
- [ ] All GiftMeta fields populated
- [ ] `howToPresent` written (human-authored)
- [ ] `riskFactors` documented
- [ ] At least 3 `occasionFit` tags
- [ ] At least 2 `recipientTraits` tags
- [ ] `surpriseFactor` rated
- [ ] `closenessRequired` set
- [ ] Image URL or placeholder

---

## 9. What This Means for the Recommendation Experience

### Current Flow (v1)
```
Conversation → Gift Profile → [Get Recommendations] → 3 cards → Product page
```

### Target Flow (v2)
```
Conversation → Gift Profile → [Get Recommendations] → 3 cards
                                                        │
                                                        ├── Card 1: TOP PICK
                                                        │   "Strong match" badge
                                                        │   Occasion-specific angle
                                                        │   "Choose this for Lisa — $140"
                                                        │
                                                        ├── Card 2: GREAT MATCH
                                                        │   "Good match" badge
                                                        │   Different category
                                                        │   Pairs-with suggestion
                                                        │
                                                        └── Card 3: WILD CARD
                                                            "Worth considering" badge
                                                            Surprise element explained
                                                            Why this is unexpected but great

                                                        [Not quite right? Tell me more →]
                                                        (Triggers refinement conversation)
```

### Key UX Changes Implied
1. **Confidence badges** replace raw match percentages (87% match is meaningless to users)
2. **Occasion-specific angles** replace generic `whyThisFits` when available
3. **"Not quite right?"** feedback loop instead of dead-end "Back to profile"
4. **Pairs-with** suggestions on card 2 for gift-set upsell
5. **Risk warnings** shown as subtle disclaimers ("Sizing may vary — check their preference")

---

## 10. Success Metrics for the Catalog

| Metric | Current (Mar 2026) | Target | Status |
|--------|-------------------|--------|--------|
| Catalog size | 254,065 | 200+ | Done |
| Category coverage | 6 | 7 | Done (practical, artisan, kids, consumable, wellness, experiential) |
| Enrichment rate | 98.8% | 100% | In progress |
| Price tier coverage | 5 tiers (token, budget, moderate, premium, luxury) | 6 tiers | Done |
| Kids scenarios served | 18,309 products | 100% | Done |
| Product diversity | 600+ stores | No product >10% of recs | Done |

---

*This document should be the reference for all product acquisition, enrichment, and recommendation engine work going forward. The taxonomy is designed to scale from 200 to 2000+ products without schema changes.*

*Next step: Use this as the acquisition brief — source 50 products for Phase 1 gaps, enriched with the full GiftMeta schema.*
