# Present Agent: Prototype Sprint Plan

> **Sprint Duration**: 1 week (2026-03-16 to 2026-03-23)
> **Goal**: Ship a testable prototype that validates core desirability assumptions
> **Status**: Draft - Awaiting Approval

---

## Strategic Context

### What We Know (High Confidence)
- ADHD adults are optimal initial segment (score 26/30)
- Anxiety > ideation (the real pain is fear of judgment)
- AI aversion exists for close relationships
- Turn-taking conversation increases AI acceptance
- Giver-centric gifts produce more closeness
- Curated catalogs beat open-ended recommendations
- Execution (wrapping, timing) is lower-stakes entry

### Riskiest Unknowns (Must Test)
| Risk | Assumption | Impact if Wrong |
|------|------------|-----------------|
| **No one pays** | D004: ADHD adults pay $10-20/mo | Kill the project |
| **AI feels wrong** | D008/D010: Conversational + partner positioning works | Pivot positioning |
| **Recommendations suck** | F001: AI beats random | Technical rebuild |
| **Close friends reject** | D009: AI resistance for close relationships | Segment pivot |

---

## Prototype Definition

### What We're Building: "Gift Confidence Bot"

A **conversational AI prototype** that helps ADHD adults feel confident about gift decisions for ONE upcoming occasion.

**Core loop**:
```
1. User lands on page → sees ADHD-specific positioning
2. User starts conversation → turn-taking profile builder
3. User describes recipient → AI builds understanding
4. AI presents 3 options → with "why this?" explanations
5. User selects/reacts → captures signal
6. Waitlist capture → "We'll handle the rest when we launch"
```

### What We're NOT Building (This Week)
- Actual checkout/payment
- Fulfillment (wrapping, shipping, card)
- Calendar integration
- Recipient-side experience
- Mobile app
- User accounts/persistence

### Technical Approach

| Component | Implementation | Effort |
|-----------|---------------|--------|
| Landing page | Next.js + Tailwind | 4 hrs |
| Conversational UI | Chat interface component | 6 hrs |
| AI conversation | Claude API with turn-taking prompts | 8 hrs |
| Curated catalog | JSON file, 50 items | 4 hrs |
| Recommendation engine | Claude + catalog search | 6 hrs |
| Analytics/feedback | Posthog + inline surveys | 4 hrs |
| Waitlist capture | Simple form → Notion/Airtable | 2 hrs |
| **Total** | | **~34 hrs** |

---

## Conversation Design

### Phase 1: Hook (30 seconds)

**Goal**: Validate they're in our segment, establish trust

```
Bot: Hey! I'm here to help you feel confident about a gift.
     Quick question - do you find gift-giving stressful?

User: [Yes / It depends / Not really]

Bot: [If Yes] I get it. The mental load is real.
     Let's make this easy. Who's the gift for?
```

### Phase 2: Recipient Profile (2-3 minutes)

**Goal**: Build understanding through natural conversation (not forms)

```
Bot: Tell me about [name]. What's your relationship?

User: My sister, she's 34, lives in Seattle...

Bot: Got it. What does she geek out about? Like, what does she
     actually spend her time on?

User: She's really into pottery and hiking...

Bot: Nice. When you think about past gifts that landed well
     with her, what made them work?

User: She loved when I got her a nice water bottle...

Bot: Practical stuff she'll actually use. I'm picking up on that.
     One more - what's the occasion and budget range?
```

**Key design principles** (from psychology research):
- Turn-taking (Fu 2024): Ask one question at a time
- Giver-centric probes: "What do YOU want to express?"
- Acknowledge effort: "You clearly know her well"

### Phase 3: Recommendation (1 minute)

**Goal**: Present 3 options with confidence + reasoning

```
Bot: Based on what you've shared, here are 3 ideas:

     1. **Handmade ceramic mug from [Artisan]** - $42
        Why: Combines her pottery interest with daily usefulness
        Confidence: High (strong pattern match)

     2. **Hiking daypack from [Brand]** - $65
        Why: Practical upgrade she'll use every weekend
        Confidence: High (you mentioned practical gifts work)

     3. **Pottery class gift card** - $85
        Why: Experience gift, lets her go deeper on her passion
        Confidence: Medium (not sure if she prefers solo/social)

     Which feels closest? Or tell me what's missing.
```

**Key design principles**:
- 3 options only (decision reduction)
- "Why this?" for each (preserves agency)
- Confidence scoring (addresses anxiety)
- Invite iteration (it's a conversation)

### Phase 4: Capture (30 seconds)

**Goal**: Convert engagement to waitlist + feedback

```
Bot: [After selection or iteration]

     Love it. When we launch, we'll handle everything -
     purchase, wrapping, handwritten card, delivery timing.

     Want early access? Drop your email and we'll reach out
     when we're ready to make [sister's name]'s birthday perfect.

     [Email input]

     One quick question: On a scale of 1-10, how confident
     do you feel about this gift choice right now?

     [1-10 slider]
```

---

## Curated Catalog (v0)

### Curation Criteria
- Price range: $25-150 (ADHD WTP sweet spot)
- Fulfillment: Must have reliable shipping
- Quality: 4.5+ star reviews
- Return policy: Easy returns

### Category Distribution (50 items)

| Category | Count | Examples |
|----------|-------|----------|
| Practical/Useful | 15 | Quality water bottles, bags, tools |
| Experiential | 10 | Class gift cards, subscription boxes |
| Consumable | 10 | Premium coffee, skincare, snacks |
| Sentimental | 10 | Personalized items, photo books |
| Hobby-specific | 5 | Craft supplies, sports gear |

### Data Schema
```json
{
  "id": "item_001",
  "name": "Yeti Rambler 26oz",
  "category": "practical",
  "price": 35,
  "description": "Insulated water bottle that actually keeps drinks cold",
  "good_for": ["active people", "commuters", "environmentally conscious"],
  "occasions": ["birthday", "holiday", "thank you"],
  "fulfillment_partner": "Amazon",
  "affiliate_link": "...",
  "image_url": "..."
}
```

---

## Landing Page

### Headline Options to A/B Test

**Version A (Anxiety-focused)**:
> "Stop second-guessing every gift"
> AI-powered gift confidence for ADHD brains

**Version B (Delegation-focused)**:
> "Gift giving without the mental load"
> We think. You approve. They love it.

**Version C (Partner-focused)**:
> "A thinking partner for thoughtful gifts"
> Because your relationships deserve better than last-minute Amazon

### Above-the-fold Elements
1. Headline + subhead
2. "Try it now" CTA (goes to chat)
3. Social proof (if any) or "Built for ADHD brains"
4. 3 benefit bullets:
   - "3 perfect options, not 3,000"
   - "Explains why each gift works"
   - "Coming soon: We handle the rest"

### ADHD-Specific Copy Elements
- Short sentences
- Visual hierarchy (chunked content)
- "No account needed" (reduce friction)
- "Takes 3 minutes" (time visibility)

---

## What We're Testing

### Primary Hypotheses

| ID | Hypothesis | Metric | Pass Criteria |
|----|------------|--------|---------------|
| H1 | ADHD adults engage with gift AI | Conversation completion rate | >40% complete flow |
| H2 | Turn-taking feels natural | Post-chat rating | >7/10 experience |
| H3 | Recommendations feel relevant | Selection rate | >50% select an option |
| H4 | Users want "arrive ready" | Feature interest click | >30% click |
| H5 | Willingness to pay signal | Waitlist conversion | >15% of completers |

### Secondary Signals

| Signal | Measurement | Learning |
|--------|-------------|----------|
| Time in conversation | Session duration | Engagement depth |
| Iteration requests | "Show me different" clicks | Recommendation quality |
| Confidence delta | Pre/post confidence score | Value delivered |
| Relationship type | Close vs distant mentioned | Segment validation |
| Drop-off points | Funnel analytics | UX friction |

---

## Feedback Mechanisms

### Passive (Built-in)

| Mechanism | Implementation | Signal |
|-----------|---------------|--------|
| Posthog analytics | Page views, clicks, funnel | Quantitative behavior |
| Session recordings | Posthog/Hotjar | Qualitative friction |
| Chat transcripts | Log all conversations | AI quality, user needs |
| Time-on-step | Timestamp each phase | Engagement/friction |

### Active (Prompted)

| Mechanism | When | Questions |
|-----------|------|-----------|
| Confidence slider | End of recommendations | 1-10 current confidence |
| Quick reaction | After each recommendation | 👍/👎 on each option |
| Exit survey | On waitlist or abandon | Why leaving, what's missing |
| NPS | 24hr email follow-up | Would you recommend? |

### High-Signal Feedback (If Needed)

If quantitative signals are ambiguous, we need qualitative depth:

| Method | Implementation | When to Use |
|--------|---------------|-------------|
| **User interviews** | Calendly embed post-completion | If completion >20% but NPS <30 |
| **Think-aloud sessions** | Record 5 users going through flow | If drop-off >60% at any step |
| **ADHD community feedback** | Post in r/ADHD, request DMs | If targeting feels off |
| **Founder gifts** | Use the tool ourselves for real | Continuous dogfooding |

### Feedback Tools to Build

If we can't get high-quality signal from organic usage:

1. **Recruiter Widget**
   - "Help us improve - 15 min call = $25 Amazon card"
   - Embed in thank-you page
   - Calendly + Tremendous integration

2. **Detailed Feedback Mode**
   - Optional toggle: "Help us learn?"
   - More questions, rating each step
   - Incentivized with early access perks

3. **Comparison Test Tool**
   - Show 2 recommendation sets (AI vs baseline)
   - "Which feels more 'you'?"
   - Tests F001 (AI beats random)

---

## Success Criteria

### Week 1 Ship Criteria (before launch)
- [ ] Landing page live with A/B headlines
- [ ] Chat interface functional
- [ ] AI conversation completes full loop
- [ ] 50 items in curated catalog
- [ ] Analytics tracking all key events
- [ ] Waitlist capture working

### Week 1 Learning Criteria (after launch)
| Outcome | Metric | Decision |
|---------|--------|----------|
| **Strong signal** | >40% completion, >30% waitlist | Proceed to MVP with fulfillment |
| **Mixed signal** | 20-40% completion, 15-30% waitlist | Iterate on positioning/UX |
| **Weak signal** | <20% completion, <15% waitlist | Pivot segment or value prop |
| **Kill signal** | <10% completion, <5% waitlist | Reconsider project |

---

## Distribution Plan

### Week 1 Traffic Sources

| Source | Approach | Expected Traffic | Cost |
|--------|----------|-----------------|------|
| **r/ADHD** | Value post, not promotion | 200-500 | $0 |
| **TikTok ads** | ADHD gift anxiety hook | 500-1000 | $100 |
| **Reddit ads** | r/ADHD, r/adhd_partners | 300-500 | $100 |
| **Personal network** | DM 20 ADHD friends | 20-50 | $0 |
| **Total** | | ~1000-2000 | $200 |

### r/ADHD Post Strategy

**Don't**: "Check out my new app!"

**Do**:
> "I've been thinking about why gift-giving is so hard for ADHD brains. It's not the 'finding ideas' part - it's the anxiety about whether it's right, the 10 open tabs, the time blindness until it's too late.
>
> I'm building something to help with this. Would love to hear if this resonates - what makes gift-giving hard for you?"

Then in comments: "I put together a quick prototype if anyone wants to try it"

---

## Derisking Summary

### What This Prototype Validates

| Assumption | How We Test | Confidence After |
|------------|-------------|------------------|
| D004: ADHD WTP | Waitlist conversion + "pricing" click | Medium → High/Low |
| D008: Turn-taking works | Completion rate + experience rating | Academic → Validated |
| D010: Partner positioning | A/B headline + qualitative | Low → Medium |
| F001: AI quality | Selection rate + iteration rate | Medium → High/Low |
| D009: Close friend resistance | Segment analysis in transcripts | Academic → Validated |

### What This Prototype Does NOT Validate

| Assumption | Why Not | When to Test |
|------------|---------|--------------|
| D005: "Arrive ready" value | No fulfillment yet | Phase 2 |
| V002: Unit economics | No real transactions | Phase 2 |
| D006: Proactive reminders | No calendar integration | Phase 2 |
| Retention/LTV | No repeat usage | Phase 3 |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI hallucinations | Constrain to curated catalog only |
| Low traffic | Paid ads + community outreach |
| Poor recommendations | Manual review of first 50 transcripts |
| Technical failure | Simple stack, tested locally first |
| Feedback silence | Built-in prompts + recruiter widget |

---

## Build Sequence

### Day 1-2: Foundation
- [ ] Next.js project setup
- [ ] Landing page with A/B variants
- [ ] Basic chat UI component
- [ ] Posthog integration

### Day 3-4: AI Core
- [ ] Conversation prompt engineering
- [ ] Curated catalog data entry (50 items)
- [ ] Recommendation generation logic
- [ ] "Why this?" explanation generation

### Day 5: Integration
- [ ] Full conversation flow connected
- [ ] Waitlist capture
- [ ] Feedback mechanisms (slider, reactions)
- [ ] Session recording setup

### Day 6: Polish
- [ ] Copy refinement
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Load testing

### Day 7: Launch
- [ ] Deploy to Vercel
- [ ] Community posts prepared
- [ ] Ads configured
- [ ] Monitoring dashboards ready

---

## Approval Checklist

Before building, confirm alignment on:

- [ ] **Scope**: Conversational prototype, no fulfillment
- [ ] **Segment**: ADHD adults as primary target
- [ ] **Positioning**: "Thinking partner" not "AI picks for you"
- [ ] **Success metrics**: 40% completion, 15% waitlist
- [ ] **Distribution**: Reddit + TikTok + personal network
- [ ] **Budget**: $200 for ads, 34 hrs build time
- [ ] **Kill criteria**: <10% completion = reconsider

---

## Open Questions

1. **Catalog sourcing**: Build affiliate relationships now, or just use Amazon links?
2. **Domain/branding**: Use "Present Agent" or test a different name?
3. **Legal**: Any disclaimers needed for AI recommendations?
4. **Fulfillment preview**: Show "coming soon" features or keep hidden?

---

## Changelog

| Date | Update |
|------|--------|
| 2026-03-16 | Initial prototype sprint plan |
