# Present Agent: Business Model

> **Date**: 2026-03-16
> **Model**: Curated Marketplace with Embedded Commerce
> **Status**: Revised from subscription model

---

## Model Summary

**We are NOT**:
- Subscription tool ($10-20/mo) ❌
- Affiliate redirect (8% commission) ❌
- Traditional Shopify store (we fulfill) ❌

**We ARE**:
- **Curated AI marketplace** with embedded checkout
- User shops in our UI → pays us → we route order to merchant
- We take margin (40-60%), merchant fulfills
- Dropship model with AI-powered curation

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENT AGENT UI                            │
│                                                                 │
│  1. User describes recipient                                    │
│  2. AI recommends 3 products (from our curated catalog)         │
│  3. User selects, customizes (card message, wrap, timing)       │
│  4. User pays via Stripe (in our UI)                            │
│  5. We capture payment, take margin                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ORDER ROUTING                               │
│                                                                 │
│  6. Order details sent to merchant (API or email)               │
│  7. Merchant ships directly to recipient                        │
│  8. We track fulfillment status                                 │
│  9. We handle customer service layer                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Revenue Model

### Unit Economics Per Gift

| Component | Amount | Notes |
|-----------|--------|-------|
| Average gift price | $60 | Based on ADHD budget research |
| Our selling price | $60 | What customer pays |
| Merchant cost | $30-36 | 40-50% of retail |
| **Gross margin** | **$24-30** | **40-50%** |
| Stripe fees | ~$2 | 2.9% + $0.30 |
| AI costs | ~$0.10 | Per conversation |
| **Net margin** | **$22-28** | **~40%** |

### Annual Revenue Per User

| Metric | Conservative | Optimistic |
|--------|--------------|------------|
| Gifts per user/year | 8 | 15 |
| Net margin per gift | $22 | $28 |
| **Revenue per user** | **$176** | **$420** |

**Compare to original subscription model**:
- $15/mo × 12 = $180/year (but high churn risk)
- Marketplace model = $176-420/year (usage-aligned)

### Break-even Analysis

| Cost | Monthly |
|------|---------|
| Hosting (Vercel) | $20 |
| AI (Claude API) | ~$50/1000 convos |
| Tools/services | $50 |
| **Monthly fixed** | **~$120** |

**Break-even**: 5-6 orders/month at $22 margin

---

## Catalog Strategy

### Sourcing Approach

```
SCRAPE                    ENRICH                    LIST
─────────────────────────────────────────────────────────────────

Uncommon Goods    →    LLM tags with         →    Shopify product
Etsy top sellers  →    qualitative attributes →    with metadata
Curated boutiques →    (gift context)         →

                       • Recipient fit
                       • Occasion fit
                       • Relationship fit
                       • Personality match
```

### Product Selection Criteria

1. **Gift-appropriate**: Not utilitarian commodities
2. **Margin-friendly**: Wholesale available or negotiated
3. **Reliable fulfillment**: Vendor ships consistently
4. **Quality signals**: 4.5+ stars, low returns
5. **Price range**: $25-150 (ADHD sweet spot)

### Vendor Relationships

**Tier 1: Dropship partnerships**
- Direct API integration
- Negotiated wholesale (40-50% off retail)
- Real-time inventory sync
- Example: Partner with 10-20 gift-focused brands

**Tier 2: Arbitrage/scrape**
- List at markup over public price
- Order from retailer when customer orders
- Lower margin (20-30%)
- Good for catalog diversity

**Tier 3: Affiliate fallback**
- Products we can't stock
- Redirect to merchant
- Low margin (5-10%)
- Backup for long tail

---

## Why This Beats Alternatives

### vs. Subscription ($15/month)

| Subscription | Marketplace |
|--------------|-------------|
| Pay before value | Pay when value delivered |
| Churn after holidays | No churn concept |
| Feels expensive for 8 uses | Feels like shopping |
| $180/year max | $176-420/year |

### vs. Affiliate (8%)

| Affiliate | Marketplace |
|-----------|-------------|
| $4-6 per $60 gift | $22-28 per $60 gift |
| User leaves our site | User stays in our UI |
| No fulfillment control | Full experience control |
| Dependent on Amazon etc | We own the relationship |

### vs. Traditional E-commerce

| Traditional | Marketplace |
|-------------|-------------|
| Hold inventory | No inventory risk |
| Pack and ship | Merchant fulfills |
| Limited catalog | Unlimited catalog |
| High ops load | Low ops load |

---

## Technical Implementation

### Stack

```
FRONTEND          BACKEND           INTEGRATIONS
───────────────────────────────────────────────────
Next.js           Next.js API       Stripe (payments)
React             Postgres          Shopify (optional)
Tailwind          Claude API        Vendor APIs
                  Product DB        Email (orders)
```

### Order Flow

```typescript
// 1. Customer completes checkout
const order = await stripe.checkout.create({
  line_items: [{ product_id, quantity, price }],
  metadata: { recipient, occasion, card_message }
});

// 2. On payment success, route to vendor
await routeToVendor({
  vendor_id: product.vendor_id,
  shipping_address: order.shipping,
  items: order.items,
  gift_options: {
    wrap: order.metadata.wrap,
    card_message: order.metadata.card_message,
    delivery_date: order.metadata.delivery_date
  }
});

// 3. Track fulfillment
await trackShipment(order.id, vendor.tracking_number);
```

### Vendor Integration Options

**Option A: API Integration**
- Direct connection to vendor systems
- Real-time inventory, order status
- Best for Tier 1 partners

**Option B: Email/Webhook**
- Order details sent via email
- Vendor confirms manually or via webhook
- Works for any vendor

**Option C: Manual (MVP)**
- We receive order
- We place order with vendor (like a customer)
- Track manually
- Good for testing

---

## Fulfillment Add-ons

### "Arrive Ready" Premium Services

| Service | Our Price | Our Cost | Margin |
|---------|-----------|----------|--------|
| Gift wrap | $8 | $3-4 | $4-5 |
| Handwritten card | $6 | $2 | $4 |
| Premium packaging | $12 | $5 | $7 |
| Expedited shipping | $15 | $10 | $5 |

**Bundle: "Arrive Ready"** = $20 (wrap + card + timing)
- Cost: ~$8
- Margin: $12

### Fulfillment Partners

For add-on services, partner with:
- **Packlane** / **Arka**: Custom packaging
- **Handwritten.io**: Card services
- **ShipBob**: 3PL with gift options

Or start simple:
- MVP: No add-ons, just product + standard shipping
- V2: Gift wrap via vendor (many offer)
- V3: Our own fulfillment layer

---

## Risk Mitigation

### Inventory Risk: None
- We don't hold inventory
- Order only when customer orders
- If vendor OOS, we refund + apologize

### Fulfillment Risk: Moderate
- Dependent on vendor reliability
- Mitigation: Vendor rating system, backup suppliers

### Margin Compression Risk: Low
- If vendors raise prices, we adjust
- Diversified catalog = no single dependency

### Legal Risk: Low-Moderate
- Scraping: Respect robots.txt, don't overload
- Reselling: Generally legal for consumer goods
- Customer data: Standard e-commerce compliance

---

## Phase Rollout

### Phase 1: MVP (This Week)
- 50-100 manually curated products
- Manual order routing (email to vendor)
- Basic Stripe checkout
- No add-on services

**Goal**: Validate conversion, test UX, learn

### Phase 2: Scale Catalog (Month 1)
- 500+ products via scraping
- LLM enrichment pipeline
- Automated order routing for Tier 1 vendors

**Goal**: Expand selection, improve margins

### Phase 3: Add-ons (Month 2)
- Gift wrap/card services
- Premium packaging
- Scheduled delivery

**Goal**: Increase AOV, differentiate

### Phase 4: Automation (Month 3+)
- Full vendor API integrations
- Inventory sync
- Automated customer service layer

**Goal**: Scale operations

---

## Key Metrics

### Commerce Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Conversion rate | >3% | Visitors → purchasers |
| AOV | >$60 | Average order value |
| Gross margin | >40% | After COGS |
| Net margin | >35% | After fees, AI costs |

### Product Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Recommendation selection | >50% | Pick one of 3 options |
| Add-on attach rate | >30% | Gift wrap, card, etc |
| Repeat purchase | >40% | Return within 12 months |
| NPS | >50 | Would recommend |

### Fulfillment Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| On-time delivery | >95% | Arrives by promised date |
| Return rate | <5% | Product returns |
| Customer service tickets | <10% | Per order |

---

## Competitive Moat

1. **Relationship context**: We know WHO they're buying for, WHY, and what worked before
2. **Curated quality**: Not Amazon's infinite catalog, but 200 perfect gifts
3. **AI matching**: Context-aware recommendations, not collaborative filtering
4. **End-to-end**: Not just ideas, but "arrive ready"
5. **Data compounds**: Every gift outcome improves future recommendations

---

## Changelog

| Date | Update |
|------|--------|
| 2026-03-16 | Revised from subscription to marketplace model |
