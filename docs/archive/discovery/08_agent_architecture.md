# Present Agent: Multi-Agent Context Architecture

> **Date**: 2026-03-16
> **Status**: Architecture Draft
> **Purpose**: Define agent system for relationship-aware gift intelligence

---

## The Core Insight

**Amazon's approach**: Collaborative filtering on purchase history
- "People who bought X also bought Y"
- Relationship-agnostic
- No context about WHO or WHY

**Our approach**: Qualitative context accumulation across relationship graph
- Rich profiles of recipients, givers, relationships, occasions
- Context compounds over time
- Each gift informs future recommendations

**The moat**: We build a relationship context graph that no product-centric platform can replicate.

---

## Agent Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR AGENT                           │
│         (Conversation routing, context synthesis, UX flow)          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│  RECIPIENT AGENT  │   │   GIVER AGENT     │   │  OCCASION AGENT   │
│                   │   │                   │   │                   │
│ • Profile building│   │ • Style patterns  │   │ • Occasion type   │
│ • Interests/values│   │ • Budget history  │   │ • Social norms    │
│ • Life context    │   │ • Past outcomes   │   │ • Timing/urgency  │
│ • Gift history    │   │ • Anxiety triggers│   │ • Group dynamics  │
└───────────────────┘   └───────────────────┘   └───────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   RECOMMENDATION AGENT    │
                    │                           │
                    │ • Context synthesis       │
                    │ • Catalog matching        │
                    │ • Confidence scoring      │
                    │ • Explanation generation  │
                    └───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │     FEEDBACK AGENT        │
                    │                           │
                    │ • Outcome capture         │
                    │ • Profile updates         │
                    │ • Learning integration    │
                    │ • Relationship evolution  │
                    └───────────────────────────┘
```

---

## Agent Definitions

### 1. Orchestrator Agent

**Role**: Conversation conductor, context router, UX guardian

**Responsibilities**:
- Parse user input and route to appropriate specialist
- Determine what context is missing before recommendation
- Synthesize multi-agent outputs into coherent response
- Manage conversation flow and pacing
- Handle edge cases and fallbacks

**Key decisions**:
- "Do we have enough context to recommend?"
- "Which agent should handle this input?"
- "What question should we ask next?"

**Prompt pattern**:
```
You are the orchestrator for a gift recommendation system.

Current context state:
- Recipient profile: {completeness: 60%, missing: [values, recent_life_events]}
- Occasion context: {completeness: 90%, missing: [budget_firm_or_flexible]}
- Giver context: {completeness: 40%, missing: [past_gift_outcomes]}

User just said: "{user_input}"

Decide:
1. Which agent(s) should process this input?
2. Do we have enough context to recommend?
3. If not, what's the highest-value question to ask next?
```

---

### 2. Recipient Agent

**Role**: Build and maintain rich profiles of gift recipients

**Context domains**:

| Domain | Examples | Source |
|--------|----------|--------|
| **Demographics** | Age, location, life stage | Explicit from giver |
| **Interests** | Hobbies, passions, obsessions | Conversation mining |
| **Values** | What they care about, causes | Inferred from interests |
| **Personality** | Introvert/extrovert, practical/dreamy | Behavioral patterns |
| **Lifestyle** | Daily routines, living situation | Contextual clues |
| **Relationships** | Family, friends, colleagues | Network graph |
| **Gift history** | Past gifts given/received | Tracked outcomes |
| **Life context** | Current challenges, wins, changes | Recent updates |

**Profile schema**:
```json
{
  "recipient_id": "rec_123",
  "name": "Sarah",
  "relationship_to_giver": "sister",
  "relationship_closeness": 0.9,
  "demographics": {
    "age": 34,
    "location": "Seattle",
    "life_stage": "new_parent",
    "living_situation": "house_with_partner"
  },
  "interests": [
    {"topic": "pottery", "intensity": "high", "active": true},
    {"topic": "hiking", "intensity": "medium", "active": "seasonal"},
    {"topic": "reading", "intensity": "medium", "active": true}
  ],
  "values": ["sustainability", "experiences_over_things", "quality_over_quantity"],
  "personality": {
    "practical_vs_dreamy": 0.7,  // 1 = very practical
    "introvert_vs_extrovert": 0.4,
    "minimalist_vs_collector": 0.8
  },
  "gift_history": [
    {
      "date": "2025-12-25",
      "gift": "Ceramic vase",
      "outcome": "loved",
      "notes": "Uses it daily, mentioned it multiple times"
    }
  ],
  "current_context": {
    "recent_events": ["just had baby", "promotion at work"],
    "current_needs": ["self-care", "sleep", "easy meals"],
    "avoid": ["anything requiring assembly", "clutter"]
  },
  "confidence": 0.75,
  "last_updated": "2026-03-16"
}
```

**Agent behaviors**:
- Extract profile data from natural conversation
- Ask clarifying questions when confidence is low
- Update profiles based on new information
- Flag life changes that affect gift relevance
- Track gift outcomes to improve future accuracy

---

### 3. Giver Agent

**Role**: Understand the gift-giver's patterns, preferences, and anxieties

**Context domains**:

| Domain | Examples | Purpose |
|--------|----------|---------|
| **Gift style** | Practical, experiential, sentimental | Match to recipient |
| **Budget patterns** | By relationship, by occasion | Calibrate recommendations |
| **Success patterns** | What worked before | Replicate wins |
| **Failure patterns** | What bombed | Avoid repeats |
| **Anxiety triggers** | Close friends, holidays, in-laws | Extra support |
| **Time patterns** | Last-minute, planner | Reminder cadence |
| **Relationship graph** | All recipients, occasions | Full context |

**Profile schema**:
```json
{
  "giver_id": "gvr_456",
  "name": "Guillaume",
  "gift_style": {
    "primary": "practical",
    "secondary": "experiential",
    "avoids": "overly_sentimental"
  },
  "budget_patterns": {
    "close_family": {"typical": 75, "range": [50, 150]},
    "friends": {"typical": 40, "range": [25, 75]},
    "acquaintances": {"typical": 25, "range": [15, 40]}
  },
  "success_patterns": [
    "Practical items they'll actually use",
    "Experiences they wouldn't buy themselves",
    "Quality over quantity"
  ],
  "failure_patterns": [
    "Generic items without personal touch",
    "Things that require maintenance",
    "Gifts that create obligations"
  ],
  "anxiety_profile": {
    "high_anxiety_for": ["partner", "mother"],
    "low_anxiety_for": ["colleagues", "acquaintances"],
    "triggers": ["close relationships", "milestone birthdays"]
  },
  "time_pattern": "last_minute",  // adhd_typical
  "recipients": ["rec_123", "rec_124", "rec_125"],
  "adhd_accommodations": {
    "decision_limit": 3,
    "reminder_lead_time": "2_weeks",
    "prefers": "options_not_questions"
  }
}
```

**Agent behaviors**:
- Track gift outcomes across all recipients
- Identify anxiety patterns for personalized support
- Calibrate recommendations to budget norms
- Remember what works (and doesn't) for this giver
- Accommodate ADHD patterns (decision limits, timing)

---

### 4. Occasion Agent

**Role**: Understand the context and norms of gift-giving occasions

**Context domains**:

| Domain | Examples | Purpose |
|--------|----------|---------|
| **Type** | Birthday, holiday, thank you, spontaneous | Set expectations |
| **Significance** | Milestone, routine, first-time | Calibrate effort |
| **Social norms** | Group gift, individual, reciprocity expected | Avoid awkwardness |
| **Timing** | Date, lead time, urgency | Enable "arrive ready" |
| **Budget norms** | What's appropriate for this occasion | Calibrate range |
| **Group dynamics** | Other gifters, coordination needed | Avoid duplicates |

**Occasion schema**:
```json
{
  "occasion_id": "occ_789",
  "type": "birthday",
  "recipient_id": "rec_123",
  "date": "2026-04-15",
  "significance": "milestone",  // 35th birthday
  "social_context": {
    "gifting_norm": "individual",
    "other_gifters": ["mom", "partner"],
    "coordination_needed": true,
    "reciprocity_expected": true
  },
  "budget_norm": {
    "relationship_suggests": 75,
    "occasion_suggests": 100,  // milestone adds
    "combined": {"min": 75, "max": 150}
  },
  "timing": {
    "ideal_arrival": "2026-04-14",
    "last_safe_order": "2026-04-08",
    "reminder_sent": false
  },
  "notes": "She mentioned wanting to do something special for herself this year"
}
```

**Agent behaviors**:
- Understand occasion-specific gift norms
- Coordinate with group gifting scenarios
- Manage timing and deadlines
- Flag milestone occasions for extra attention
- Track occasion patterns (this person's birthday preferences)

---

### 5. Recommendation Agent

**Role**: Synthesize all context into confident, explained recommendations

**Inputs**:
- Recipient profile (from Recipient Agent)
- Giver context (from Giver Agent)
- Occasion requirements (from Occasion Agent)
- Curated catalog (product database)

**Process**:
```
1. CONTEXT SYNTHESIS
   - What do we know about recipient?
   - What's the giver's style/history?
   - What does this occasion require?
   - What are the constraints (budget, shipping, etc.)?

2. CANDIDATE GENERATION
   - Query catalog with synthesized requirements
   - Generate 10-15 candidate items
   - Score each against context fit

3. SELECTION & RANKING
   - Select top 3 with diversity (practical, experiential, sentimental)
   - Score confidence based on context completeness
   - Flag any concerns or uncertainties

4. EXPLANATION GENERATION
   - For each option: "Why this gift?"
   - Connect to specific context elements
   - Acknowledge limitations/uncertainties
```

**Output schema**:
```json
{
  "recommendations": [
    {
      "item_id": "itm_001",
      "name": "Handmade ceramic mug",
      "price": 42,
      "confidence": 0.85,
      "reasoning": {
        "primary": "Combines her pottery interest with daily usefulness",
        "supporting": [
          "You mentioned practical gifts work well",
          "Aligns with her minimalist values",
          "Handmade = supports artisans she values"
        ],
        "concerns": []
      },
      "fulfillment": {
        "arrives_by": "2026-04-12",
        "gift_wrap": true,
        "card_included": true
      }
    }
  ],
  "overall_confidence": 0.82,
  "missing_context": ["recent gift outcomes for comparison"],
  "alternatives_considered": 12
}
```

---

### 6. Feedback Agent

**Role**: Close the loop, learn from outcomes, improve over time

**Feedback types**:

| Type | Trigger | Data Captured |
|------|---------|---------------|
| **Selection feedback** | User picks an option | Which option, why |
| **Rejection feedback** | User says "none of these" | What's missing |
| **Outcome feedback** | Post-gift follow-up | Did they like it? |
| **Passive feedback** | User modifies suggestion | What they changed |

**Outcome capture flow**:
```
[2 weeks after gift sent]

"Hey! How did the ceramic mug land with Sarah?"

[ Loved it ] [ It was fine ] [ Missed the mark ]

[If Loved it]
"That's great! Anything specific that made it work?"
[Free text or skip]

[If Missed the mark]
"Sorry to hear that. What would have been better?"
[Free text or skip]
```

**Learning updates**:
- Update recipient profile (interests, preferences)
- Update giver success/failure patterns
- Adjust confidence calibration
- Feed into recommendation model

**Schema for outcome**:
```json
{
  "gift_id": "gift_001",
  "recipient_id": "rec_123",
  "giver_id": "gvr_456",
  "item_id": "itm_001",
  "occasion_id": "occ_789",
  "outcome": "loved",
  "outcome_details": "She uses it every morning, sent me a photo",
  "learnings": [
    {"type": "recipient_preference_confirmed", "value": "practical_daily_use"},
    {"type": "giver_pattern_confirmed", "value": "handmade_works_for_sister"}
  ],
  "captured_at": "2026-05-01"
}
```

---

## Context Graph

The real power is the **relationship context graph** that emerges:

```
                    ┌─────────────┐
                    │   GIVER     │
                    │  Guillaume  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  RECIPIENT    │  │  RECIPIENT    │  │  RECIPIENT    │
│    Sarah      │  │     Mom       │  │    Alex       │
│   (sister)    │  │   (mother)    │  │   (friend)    │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  OCCASIONS    │  │  OCCASIONS    │  │  OCCASIONS    │
│ • Birthday    │  │ • Mother's Day│  │ • Birthday    │
│ • Christmas   │  │ • Birthday    │  │ • Thank you   │
│ • Baby shower │  │ • Christmas   │  │               │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│    GIFTS      │  │    GIFTS      │  │    GIFTS      │
│ • Vase ✓      │  │ • Spa day ✓   │  │ • Book ?      │
│ • Book ?      │  │ • Scarf ✗     │  │               │
│ • Class ✓     │  │               │  │               │
└───────────────┘  └───────────────┘  └───────────────┘
```

**Why this compounds**:
- Every interaction adds context
- Successful gifts teach patterns
- Failed gifts prevent repeats
- Relationships evolve (baby → new context)
- Occasions recur (birthday patterns emerge)

---

## Data Model

### Core Entities

```
GIVERS
├── giver_id (PK)
├── profile (JSON)
├── preferences (JSON)
└── adhd_accommodations (JSON)

RECIPIENTS
├── recipient_id (PK)
├── giver_id (FK)
├── profile (JSON)
├── interests (JSON)
├── gift_history (JSON)
└── current_context (JSON)

OCCASIONS
├── occasion_id (PK)
├── recipient_id (FK)
├── type
├── date
├── context (JSON)
└── status

GIFTS
├── gift_id (PK)
├── occasion_id (FK)
├── item_id (FK)
├── recommendation_context (JSON)
├── outcome
└── learnings (JSON)

CATALOG
├── item_id (PK)
├── name
├── category
├── price
├── attributes (JSON)
└── fulfillment_info (JSON)
```

### Context Queries

**"What do we know about Sarah?"**
```sql
SELECT
  r.profile,
  r.interests,
  r.current_context,
  json_agg(g.outcome, g.learnings) as gift_history
FROM recipients r
LEFT JOIN gifts g ON g.recipient_id = r.recipient_id
WHERE r.recipient_id = 'rec_123'
GROUP BY r.recipient_id
```

**"What works for Guillaume's close family?"**
```sql
SELECT
  r.name,
  g.item_id,
  c.category,
  g.outcome
FROM gifts g
JOIN recipients r ON g.recipient_id = r.recipient_id
JOIN catalog c ON g.item_id = c.item_id
WHERE r.giver_id = 'gvr_456'
  AND r.relationship_closeness > 0.7
  AND g.outcome = 'loved'
```

---

## Implementation Phases

### Phase 1: Prototype (This Week)
- Single-session conversation (no persistence)
- Recipient Agent + Recommendation Agent only
- Context captured but not stored
- Manual catalog (50 items)

### Phase 2: MVP (Weeks 2-4)
- User accounts with persistence
- Full Recipient Agent with profile storage
- Basic Giver Agent (patterns from history)
- Occasion Agent for calendar integration
- 200-item catalog

### Phase 3: Learning System (Weeks 5-8)
- Feedback Agent with outcome capture
- Profile enrichment from outcomes
- Confidence calibration from results
- Pattern recognition across users (anonymized)

### Phase 4: Intelligence Layer (Months 3+)
- Cross-user learning (what works for similar recipients)
- Predictive occasion detection
- Proactive suggestions
- Group gifting coordination

---

## Agent Communication Protocol

### Message Format
```json
{
  "from": "orchestrator",
  "to": "recipient_agent",
  "action": "extract_profile",
  "payload": {
    "user_input": "She's really into pottery and hiking",
    "current_profile": {...},
    "session_context": {...}
  },
  "response_required": true
}
```

### Response Format
```json
{
  "from": "recipient_agent",
  "to": "orchestrator",
  "action": "profile_update",
  "payload": {
    "updates": [
      {"field": "interests", "action": "add", "value": {"topic": "pottery", "intensity": "high"}},
      {"field": "interests", "action": "add", "value": {"topic": "hiking", "intensity": "inferred"}}
    ],
    "confidence_delta": +0.15,
    "suggested_followup": "What does she usually do on weekends?"
  }
}
```

---

## Why This Beats Collaborative Filtering

| Collaborative Filtering | Our Context Graph |
|------------------------|-------------------|
| Based on purchase history | Based on relationship understanding |
| "People like you bought X" | "For Sarah specifically, given your relationship" |
| No relationship context | Deep relationship context |
| Static profile | Evolving profile with outcomes |
| One-size-fits-all | Personalized to giver's style |
| Can't explain "why" | Full reasoning chain |
| Cold start problem | Rich context from conversation |

**The moat**: Every gift outcome trains the system. Every conversation adds context. The relationship graph becomes irreplaceable.

---

## Technical Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Agent orchestration | Claude API with tool use | Native function calling |
| Context storage | Postgres + JSONB | Flexible schema, relational queries |
| Vector search | pgvector or Pinecone | Semantic catalog matching |
| Catalog | Postgres + edge cache | Fast reads, easy updates |
| Session state | Redis | Fast, ephemeral |
| API | Next.js API routes | Simple, serverless |
| Frontend | Next.js + React | Standard, fast iteration |

---

## Open Questions

1. **Multi-giver recipients**: What if multiple users have the same recipient (family members)?
2. **Privacy**: How do we handle sensitive relationship data?
3. **Cold start**: What's minimum context for useful recommendation?
4. **Recipient-side**: Do recipients ever see/contribute to their profile?
5. **Cross-user learning**: When is anonymized pattern sharing okay?

---

## Changelog

| Date | Update |
|------|--------|
| 2026-03-16 | Initial multi-agent architecture design |
