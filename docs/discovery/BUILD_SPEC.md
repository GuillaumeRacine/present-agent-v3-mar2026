# Present Agent: Build Specification

> **Project**: AI Gift Recommendation Platform
> **Target**: ADHD adults with gift-giving anxiety
> **Model**: Curated marketplace with transparent convenience fee
> **Timeline**: 1 week MVP

---

## Agent Instructions

**This document is the single source of truth for building Present Agent MVP.**

### How to Use This Spec

1. **Start with Section 0** - Run all initialization commands in order
2. **Follow the section numbers** - Each section builds on the previous
3. **Copy code blocks exactly** - They are tested and complete
4. **Check the Build Checklist** (end of doc) - Mark items as you complete them

### Build Order

| Phase | Sections | Output |
|-------|----------|--------|
| **Init** | 0 | Empty Next.js project with structure |
| **Foundation** | 1-4 | Database schema, types, lib files |
| **Core API** | 5 | All API routes functional |
| **UI** | 6-7 | Components and pages |
| **Polish** | 8-9 | Analytics, testing, deploy |

### Validation Checkpoints

After each phase, verify:
- `npm run build` passes with no errors
- `npx prisma studio` shows correct schema
- Manual test of completed flows

### When Blocked

If you encounter issues:
1. Check the Related Files section for context docs
2. Re-read the specific section requirements
3. Verify environment variables are set
4. Check Prisma migrations are current

### GitHub Issues Workflow

**All work is tracked via GitHub Issues.** This is the single source of truth for project status.

#### Initial Setup

```bash
# Create GitHub repo
gh repo create present-agent --private --source=. --push

# Create labels for organization
gh label create "epic" --color "3E4B9E" --description "Large feature grouping"
gh label create "feature" --color "0E8A16" --description "New functionality"
gh label create "bug" --color "D73A4A" --description "Something isn't working"
gh label create "research" --color "D4C5F9" --description "Investigation needed"
gh label create "blocked" --color "B60205" --description "Waiting on dependency"
gh label create "day-1" --color "FBCA04" --description "Sprint day 1"
gh label create "day-2" --color "FBCA04" --description "Sprint day 2"
gh label create "day-3" --color "FBCA04" --description "Sprint day 3"
gh label create "day-4" --color "FBCA04" --description "Sprint day 4"
gh label create "day-5" --color "FBCA04" --description "Sprint day 5"
gh label create "day-6" --color "FBCA04" --description "Sprint day 6"
gh label create "day-7" --color "FBCA04" --description "Sprint day 7"
```

#### Create Initial Epics

```bash
# Create epics for each major area
gh issue create --title "Epic: Project Foundation" --body "Setup Next.js, Prisma, Vercel deployment" --label "epic,day-1"
gh issue create --title "Epic: Landing Page" --body "ADHD-specific messaging, A/B test headlines" --label "epic,day-2"
gh issue create --title "Epic: Google OAuth + Calendar" --body "Import birthdays from Google Calendar" --label "epic,day-3"
gh issue create --title "Epic: Conversation Flow" --body "Turn-taking chat with Claude API" --label "epic,day-4"
gh issue create --title "Epic: Recommendations" --body "Generate and display 3 gift options" --label "epic,day-5"
gh issue create --title "Epic: Checkout" --body "Stripe integration, order confirmation" --label "epic,day-6"
gh issue create --title "Epic: Polish + Launch" --body "Mobile responsive, analytics, deploy" --label "epic,day-7"
```

#### Agent Workflow

When working on a feature:

1. **Check existing issues first**
   ```bash
   gh issue list --state open
   ```

2. **Create issue before starting work**
   ```bash
   gh issue create --title "Implement ChatContainer component" \
     --body "## Task\nBuild the main chat UI component\n\n## Acceptance Criteria\n- [ ] Turn-taking conversation\n- [ ] Progress indicator\n- [ ] Mobile responsive" \
     --label "feature,day-4"
   ```

3. **Assign yourself and start**
   ```bash
   gh issue edit <number> --add-assignee @me
   ```

4. **Document research/decisions in comments**
   ```bash
   gh issue comment <number> --body "Decided to use streaming for better UX. See: https://..."
   ```

5. **Link PRs to issues**
   ```bash
   # In PR description or commit message:
   # "Fixes #<issue-number>" or "Closes #<issue-number>"
   ```

6. **Close when complete**
   ```bash
   gh issue close <number> --comment "Completed in PR #X"
   ```

#### Issue Templates

Create `.github/ISSUE_TEMPLATE/feature.md`:
```markdown
---
name: Feature
about: New functionality
labels: feature
---

## Summary
Brief description of the feature.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
Implementation details, dependencies, etc.

## Related
- Epic: #
- Depends on: #
```

#### Daily Standup Check

```bash
# What's in progress?
gh issue list --assignee @me --state open

# What's blocked?
gh issue list --label blocked --state open

# What's ready for today?
gh issue list --label "day-X" --state open
```

#### Backlog Management

- **Prioritize**: Use issue numbers (lower = older = higher priority)
- **Scope creep**: New ideas → create issue with `backlog` label, don't work on it
- **Blockers**: Add `blocked` label + comment explaining why

---

## 0. Project Initialization

### Step 1: Create Next.js Project

```bash
# Create new Next.js project with all options
npx create-next-app@14 present-agent \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd present-agent
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install @anthropic-ai/sdk @prisma/client stripe googleapis posthog-js zod

# Dev dependencies
npm install -D prisma @types/node

# Initialize Prisma
npx prisma init
```

### Step 3: Create Directory Structure

```bash
# Create all directories
mkdir -p app/\(marketing\)
mkdir -p app/onboard/connect
mkdir -p app/onboard/confirm
mkdir -p app/gift/\[sessionId\]/recommendations
mkdir -p app/gift/\[sessionId\]/product/\[productId\]
mkdir -p app/gift/checkout/\[sessionId\]
mkdir -p app/success
mkdir -p app/api/auth/google/callback
mkdir -p app/api/calendar/birthdays
mkdir -p app/api/session/\[sessionId\]
mkdir -p app/api/chat
mkdir -p app/api/recommend
mkdir -p app/api/checkout
mkdir -p app/api/webhook
mkdir -p components/ui
mkdir -p components/chat
mkdir -p components/gift
mkdir -p lib
mkdir -p types
mkdir -p data
```

### Step 4: Environment Setup

Create `.env.local`:
```bash
cat > .env.local << 'EOF'
# Database (use Vercel Postgres or local)
DATABASE_URL="postgresql://user:password@localhost:5432/present_agent"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Google OAuth (from console.cloud.google.com)
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Stripe (from dashboard.stripe.com)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# PostHog (from posthog.com)
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
```

### Step 5: Database Setup

Replace `prisma/schema.prisma` with the schema from Section 4 below, then:

```bash
# Create database (if using local Postgres)
createdb present_agent

# Run migrations
npx prisma migrate dev --name init

# Generate client
npx prisma generate
```

### Step 6: Seed Initial Products

```bash
# Create seed file
cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Add products from data/products.json
  const products = require('../data/products.json')
  for (const product of products) {
    await prisma.product.create({ data: product })
  }
}

main()
EOF

# Add seed command to package.json
npm pkg set scripts.seed="npx ts-node prisma/seed.ts"

# Run seed (after creating products.json)
npm run seed
```

### Step 7: Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Quick Start (After Init)

```bash
# For subsequent runs
cd present-agent
npm install
npx prisma migrate dev
npm run dev
```

---

## 1. Project Overview

### What We're Building

An AI-powered gift recommendation platform that:
1. Imports birthdays from Google Calendar
2. Conducts turn-taking conversation to understand recipient
3. Recommends 3 curated products with explanations
4. Handles checkout via Stripe

### What We're NOT Building (MVP)

- User accounts/auth (guest checkout only)
- Fulfillment add-ons (wrapping, cards)
- Mobile app
- Multi-agent architecture
- Recipient-side experience

### Target User

ADHD adults who:
- Experience anxiety around gift-giving
- Struggle with decision paralysis
- Need "here are 3 options, pick one" not "here are 1000 options"
- Value convenience over bargain-hunting

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack, serverless |
| Styling | Tailwind CSS | Fast iteration |
| Database | PostgreSQL + Prisma | Relational, type-safe |
| AI | Claude API (Anthropic) | Best for conversation |
| Payments | Stripe Checkout | Embedded, reliable |
| Auth (Calendar) | Google OAuth 2.0 | Calendar + Contacts |
| Hosting | Vercel | Zero-config deploy |
| Analytics | PostHog | Product analytics |

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@prisma/client": "^5.0.0",
    "stripe": "^14.0.0",
    "googleapis": "^130.0.0",
    "posthog-js": "^1.100.0",
    "tailwindcss": "^3.4.0",
    "zod": "^3.22.0"
  }
}
```

---

## 3. Project Structure

```
present-agent/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   ├── globals.css                # Tailwind imports
│   │
│   ├── (marketing)/
│   │   └── page.tsx               # Landing with A/B headlines
│   │
│   ├── onboard/
│   │   ├── page.tsx               # Calendar connect choice
│   │   ├── connect/
│   │   │   └── page.tsx           # Google OAuth flow
│   │   └── confirm/
│   │       └── page.tsx           # Confirm imported birthdays
│   │
│   ├── gift/
│   │   ├── [sessionId]/
│   │   │   ├── page.tsx           # Main conversation UI
│   │   │   ├── recommendations/
│   │   │   │   └── page.tsx       # 3 options display
│   │   │   └── product/
│   │   │       └── [productId]/
│   │   │           └── page.tsx   # Product detail
│   │   └── checkout/
│   │       └── [sessionId]/
│   │           └── page.tsx       # Stripe checkout
│   │
│   ├── success/
│   │   └── page.tsx               # Order confirmation
│   │
│   └── api/
│       ├── auth/
│       │   └── google/
│       │       ├── route.ts       # OAuth initiate
│       │       └── callback/
│       │           └── route.ts   # OAuth callback
│       │
│       ├── calendar/
│       │   └── birthdays/
│       │       └── route.ts       # Fetch birthdays
│       │
│       ├── session/
│       │   ├── route.ts           # Create session
│       │   └── [sessionId]/
│       │       └── route.ts       # Get/update session
│       │
│       ├── chat/
│       │   └── route.ts           # Conversation endpoint
│       │
│       ├── recommend/
│       │   └── route.ts           # Generate recommendations
│       │
│       ├── checkout/
│       │   └── route.ts           # Create Stripe session
│       │
│       └── webhook/
│           └── stripe/
│               └── route.ts       # Stripe webhooks
│
├── components/
│   ├── ui/                        # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Progress.tsx
│   │   └── ChatBubble.tsx
│   │
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Testimonials.tsx
│   │
│   ├── conversation/
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── InputArea.tsx
│   │   └── ProgressIndicator.tsx
│   │
│   └── recommendations/
│       ├── OptionCard.tsx
│       ├── WhyThisGift.tsx
│       └── ConfidenceScore.tsx
│
├── lib/
│   ├── db.ts                      # Prisma client
│   ├── anthropic.ts               # Claude client
│   ├── stripe.ts                  # Stripe client
│   ├── google.ts                  # Google OAuth + APIs
│   ├── analytics.ts               # PostHog wrapper
│   │
│   ├── prompts/
│   │   ├── conversation.ts        # Chat system prompt
│   │   └── recommendations.ts     # Recommendation prompt
│   │
│   └── utils/
│       ├── session.ts             # Session management
│       └── validation.ts          # Zod schemas
│
├── data/
│   └── catalog.json               # 50 curated products
│
├── prisma/
│   └── schema.prisma              # Database schema
│
├── public/
│   └── images/
│
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 4. Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Session {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Google tokens (encrypted)
  googleAccessToken  String?
  googleRefreshToken String?

  // Recipient context
  recipientName      String?
  recipientRelation  String?
  occasion           String?
  occasionDate       DateTime?
  budget             String?

  // Conversation state
  messages           Message[]
  conversationPhase  String    @default("intro") // intro, relationship, interests, occasion, budget, complete

  // Recommendations
  recommendations    Recommendation[]
  selectedProductId  String?

  // Order
  stripeSessionId    String?
  orderStatus        String?   // pending, paid, fulfilled

  // Analytics
  source             String?   // tiktok, reddit, direct
  completedAt        DateTime?
}

model Message {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  role      String   // user, assistant
  content   String
  createdAt DateTime @default(now())
}

model Recommendation {
  id            String   @id @default(cuid())
  sessionId     String
  session       Session  @relation(fields: [sessionId], references: [id])
  productId     String
  rank          Int      // 1, 2, 3
  reasoning     String
  confidence    Float
  selected      Boolean  @default(false)
  reaction      String?  // thumbs_up, thumbs_down, null
  createdAt     DateTime @default(now())
}

model Product {
  id              String   @id @default(cuid())
  name            String
  description     String
  price           Float
  imageUrl        String
  vendorName      String
  vendorProductId String
  category        String

  // Qualitative metadata
  psychologicalFit  String[] // practical, sentimental, experiential, playful
  relationshipFit   String[] // close_family, friend, acquaintance, professional
  recipientTraits   String[] // minimalist, foodie, wellness, tech, outdoors
  occasionFit       String[] // birthday, holiday, thank_you, milestone
  effortSignal      String   // high_effort, moderate, convenient
  priceTier         String   // budget, moderate, premium

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Order {
  id              String   @id @default(cuid())
  sessionId       String
  productId       String

  // Customer info
  customerEmail   String
  shippingAddress Json

  // Payment
  stripePaymentId String
  amount          Float

  // Fulfillment
  vendorOrderId   String?
  status          String   @default("pending") // pending, processing, shipped, delivered
  trackingNumber  String?

  // Gift details
  recipientName   String
  cardMessage     String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ImportedBirthday {
  id            String   @id @default(cuid())
  sessionId     String
  name          String
  date          DateTime
  relationship  String?
  googleEventId String?
  confirmed     Boolean  @default(false)
  createdAt     DateTime @default(now())
}
```

---

## 5. API Endpoints

### Authentication

#### `GET /api/auth/google`
Initiates Google OAuth flow for Calendar + Contacts access.

```typescript
// Redirects to Google OAuth consent screen
// Scopes: calendar.events.readonly, contacts.readonly
```

#### `GET /api/auth/google/callback`
Handles OAuth callback, stores tokens in session.

```typescript
// Request: ?code=AUTH_CODE&state=SESSION_ID
// Response: Redirect to /onboard/confirm
```

### Calendar

#### `GET /api/calendar/birthdays`
Fetches birthdays from Google Calendar.

```typescript
// Request headers: x-session-id
// Response:
{
  "birthdays": [
    {
      "name": "Sarah",
      "date": "2026-04-15",
      "googleEventId": "birthday_123",
      "contactId": "people/c123"
    }
  ]
}
```

### Session

#### `POST /api/session`
Creates new gift session.

```typescript
// Request:
{
  "source": "reddit",           // optional
  "recipientName": "Sarah",     // optional, from birthday import
  "occasionDate": "2026-04-15"  // optional
}

// Response:
{
  "sessionId": "clx123...",
  "redirectUrl": "/gift/clx123..."
}
```

#### `GET /api/session/[sessionId]`
Gets session state.

#### `PATCH /api/session/[sessionId]`
Updates session state (recipient info, phase, etc).

### Conversation

#### `POST /api/chat`
Main conversation endpoint.

```typescript
// Request:
{
  "sessionId": "clx123...",
  "message": "She's my sister, 34, lives in Seattle..."
}

// Response:
{
  "response": "Got it! What does Sarah geek out about?",
  "phase": "interests",
  "progress": 40,
  "extractedContext": {
    "relationship": "sister",
    "age": 34,
    "location": "Seattle"
  }
}
```

### Recommendations

#### `POST /api/recommend`
Generates 3 product recommendations.

```typescript
// Request:
{
  "sessionId": "clx123..."
}

// Response:
{
  "recommendations": [
    {
      "id": "rec_1",
      "productId": "prod_ceramic_mug",
      "rank": 1,
      "product": {
        "name": "Handmade Ceramic Mug",
        "price": 42,
        "imageUrl": "...",
        "vendorName": "East Fork"
      },
      "reasoning": "Combines her pottery interest with daily usefulness",
      "confidence": 0.85
    }
  ]
}
```

### Checkout

#### `POST /api/checkout`
Creates Stripe checkout session.

```typescript
// Request:
{
  "sessionId": "clx123...",
  "productId": "prod_ceramic_mug",
  "email": "buyer@example.com"
}

// Response:
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

#### `POST /api/webhook/stripe`
Handles Stripe webhooks (payment success, etc).

---

## 6. Core Prompts

### Conversation System Prompt

```typescript
// lib/prompts/conversation.ts

export const CONVERSATION_SYSTEM_PROMPT = `You are a gift recommendation assistant for ADHD adults. Your job is to help them feel confident about gift decisions through a supportive, turn-taking conversation.

## Your Personality
- Warm but concise (ADHD users lose focus on long responses)
- Supportive, not pushy
- Acknowledge their effort ("You clearly know her well")
- Reduce anxiety, don't add to it

## Conversation Flow
You need to gather:
1. Relationship (who is this person to them?)
2. Interests (what do they geek out about?)
3. Past gifts (what worked before?)
4. Occasion (what's the event, when?)
5. Budget (range is fine)

## Rules
- Ask ONE question at a time
- Keep responses under 3 sentences
- Never overwhelm with options during conversation
- If they give partial info, acknowledge and ask follow-up
- When you have enough context, say "I have some ideas! Ready to see them?"

## Context Format
After each exchange, you must output extracted context in this JSON format at the end of your response:

<context>
{
  "recipientName": "string or null",
  "relationship": "string or null",
  "interests": ["array", "of", "interests"],
  "pastGiftsWorked": ["array"],
  "pastGiftsFailed": ["array"],
  "occasion": "string or null",
  "occasionDate": "date string or null",
  "budgetRange": "string or null",
  "personality": {
    "practical_vs_dreamy": 0.0-1.0,
    "minimalist": true/false
  },
  "avoids": ["things to avoid"],
  "conversationPhase": "relationship|interests|past_gifts|occasion|budget|complete"
}
</context>
`;
```

### Recommendation System Prompt

```typescript
// lib/prompts/recommendations.ts

export const RECOMMENDATION_SYSTEM_PROMPT = `You are selecting gifts from a curated catalog for an ADHD adult who experiences gift-giving anxiety.

## Your Task
Given the recipient context and product catalog, select exactly 3 products and explain why each is a good fit.

## Selection Criteria
1. Match recipient interests and personality
2. Respect budget constraints
3. Consider occasion appropriateness
4. Prioritize practical gifts that get used (research shows recipients prefer these)
5. Include variety: one safe choice, one interesting choice, one experiential/consumable

## Output Format
For each recommendation, provide:
- Product ID from catalog
- Confidence score (0.0-1.0)
- Primary reasoning (1 sentence connecting to specific context)
- Supporting reasons (2-3 bullet points)
- Any concerns or uncertainties

## Rules
- NEVER recommend more than 3 options
- ALWAYS connect reasoning to specific things the user shared
- Confidence should reflect how well context matches the gift
- If context is sparse, acknowledge limitations honestly
`;
```

---

## 7. Product Catalog Schema

```typescript
// data/catalog.json

{
  "products": [
    {
      "id": "prod_ceramic_mug",
      "name": "Handmade Ceramic Mug",
      "description": "Hand-thrown ceramic mug by East Fork Pottery. Dishwasher safe, 12oz capacity.",
      "price": 42,
      "imageUrl": "/images/products/ceramic_mug.jpg",
      "vendorName": "East Fork",
      "vendorProductId": "ef-mug-001",
      "purchaseUrl": "https://eastfork.com/mug",
      "category": "home",

      "psychologicalFit": ["practical", "thoughtful"],
      "relationshipFit": ["close_family", "friend"],
      "recipientTraits": ["minimalist", "design_lover", "coffee_enthusiast"],
      "occasionFit": ["birthday", "holiday", "thank_you", "housewarming"],
      "effortSignal": "high_effort",
      "priceTier": "moderate",

      "searchTerms": ["mug", "coffee", "ceramic", "pottery", "kitchen", "handmade"]
    }
  ]
}
```

### Required Products (50 total)

| Category | Count | Examples |
|----------|-------|----------|
| Practical/Home | 12 | Mugs, bags, tools, gadgets |
| Experiential | 8 | Classes, subscriptions, experiences |
| Consumable | 10 | Coffee, food, skincare |
| Artisan/Handmade | 10 | Pottery, jewelry, crafts |
| Hobby-specific | 10 | Books, outdoor gear, craft supplies |

---

## 8. Key Components

### ChatContainer

```tsx
// components/conversation/ChatContainer.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ProgressIndicator } from './ProgressIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContainerProps {
  sessionId: string;
  initialMessages?: Message[];
  initialPhase?: string;
}

export function ChatContainer({ sessionId, initialMessages = [], initialPhase = 'intro' }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState(initialPhase);
  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content })
      });

      const data = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      setPhase(data.phase);
      setProgress(data.progress);

      if (data.phase === 'complete') {
        // Redirect to recommendations
        window.location.href = `/gift/${sessionId}/recommendations`;
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      <ProgressIndicator phase={phase} progress={progress} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>

      <InputArea onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

### OptionCard

```tsx
// components/recommendations/OptionCard.tsx

interface OptionCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    vendorName: string;
  };
  rank: number;
  reasoning: string;
  confidence: number;
  onSelect: () => void;
  onReaction: (reaction: 'up' | 'down') => void;
}

export function OptionCard({ product, rank, reasoning, confidence, onSelect, onReaction }: OptionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-sm">
          Option {rank}
        </div>
        <div className="absolute top-3 right-3 bg-green-500/90 text-white px-2 py-1 rounded-full text-sm">
          {Math.round(confidence * 100)}% match
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{product.name}</h3>
          <span className="text-lg font-bold">${product.price}</span>
        </div>

        <p className="text-sm text-gray-500 mb-3">by {product.vendorName}</p>

        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-blue-900">Why this gift?</p>
          <p className="text-sm text-blue-800 mt-1">{reasoning}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSelect}
            className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Select This Gift
          </button>

          <button
            onClick={() => onReaction('up')}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            aria-label="Good suggestion"
          >
            👍
          </button>

          <button
            onClick={() => onReaction('down')}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            aria-label="Not quite right"
          >
            👎
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/present_agent"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Google OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

---

## 10. Build Steps

### Day 1: Foundation
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Set up Tailwind CSS
- [ ] Configure Prisma with PostgreSQL
- [ ] Create database schema and run migrations
- [ ] Set up environment variables
- [ ] Deploy initial version to Vercel

### Day 2: Landing Page
- [ ] Build Hero component with ADHD-specific messaging
- [ ] Implement A/B test for headlines (PostHog)
- [ ] Add "How it works" section
- [ ] Create CTA buttons
- [ ] Mobile responsive design

### Day 3: Google OAuth
- [ ] Implement OAuth initiation endpoint
- [ ] Handle OAuth callback
- [ ] Fetch birthdays from Calendar API
- [ ] Create birthday confirmation UI
- [ ] Store imported birthdays in database

### Day 4: Conversation
- [ ] Build ChatContainer component
- [ ] Implement /api/chat endpoint
- [ ] Create conversation system prompt
- [ ] Add progress indicator
- [ ] Handle context extraction

### Day 5: Recommendations
- [ ] Seed product catalog (50 products)
- [ ] Build recommendation prompt
- [ ] Implement /api/recommend endpoint
- [ ] Create OptionCard component
- [ ] Add reaction capture (thumbs up/down)

### Day 6: Checkout
- [ ] Implement Stripe checkout session creation
- [ ] Build product detail page
- [ ] Handle Stripe webhooks
- [ ] Create order confirmation page
- [ ] Email receipt (optional)

### Day 7: Polish & Launch
- [ ] Mobile responsiveness pass
- [ ] Error handling and loading states
- [ ] Analytics event tracking
- [ ] Final QA
- [ ] Production deploy
- [ ] Prepare launch content (Reddit post, etc.)

---

## 11. Testing Checklist

### Manual Testing

- [ ] Landing page loads, CTA works
- [ ] Google OAuth completes successfully
- [ ] Birthdays import and display correctly
- [ ] Conversation flows naturally
- [ ] Recommendations generate with reasoning
- [ ] Checkout completes (test mode)
- [ ] Confirmation page shows

### Edge Cases

- [ ] No birthdays in calendar
- [ ] User skips calendar connect
- [ ] Conversation with minimal context
- [ ] Product out of stock handling
- [ ] Stripe payment failure

### Analytics Events

- [ ] `page_view` on all pages
- [ ] `calendar_connected`
- [ ] `birthday_imported` (count)
- [ ] `conversation_started`
- [ ] `conversation_completed`
- [ ] `recommendation_viewed`
- [ ] `recommendation_selected`
- [ ] `checkout_started`
- [ ] `purchase_completed`

---

## 12. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Landing → Start | >30% | Click "Start Now" |
| Calendar connect | >50% | Of those who start |
| Conversation complete | >40% | Reach recommendations |
| Recommendation select | >50% | Pick one of 3 |
| Checkout start | >30% | Of those who select |
| Purchase complete | >60% | Of checkouts (>3% overall) |
| NPS | >30 | Post-purchase survey |

---

## 13. Launch Distribution

### Organic (Week 1)

**Reddit r/ADHD**:
Post genuine value content, not promotion. Topic: "Gift-giving is so hard for ADHD brains - here's what I've learned"

In comments: "I actually built something to help with this if anyone wants to try it"

**Personal Network**:
DM 20 ADHD friends/acquaintances with personal ask

**TikTok** (if time):
Short video about gift anxiety + ADHD

### Track Attribution
- UTM params: `?utm_source=reddit&utm_campaign=launch`
- Store in session.source

---

## 14. Post-Launch Priorities

### Week 2 (Based on Data)
1. Fix top 3 UX friction points
2. Improve recommendation quality based on reactions
3. Add more products if catalog gaps identified

### V2 Features (Month 2)
- Fulfillment add-ons (wrap, card)
- User accounts + saved recipients
- Proactive reminders

### V3 Features (Month 3+)
- Multi-agent architecture
- Recipient-side input
- Mobile app

---

## Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Main conversation logic |
| `app/api/recommend/route.ts` | Recommendation generation |
| `lib/prompts/conversation.ts` | Chat system prompt |
| `lib/prompts/recommendations.ts` | Recommendation prompt |
| `data/catalog.json` | Product catalog |
| `prisma/schema.prisma` | Database schema |

### Key Decisions
- Single Claude endpoint (not multi-agent)
- Guest checkout only (no auth)
- Google Calendar only (no Apple)
- 50 curated products (not open-ended)
- Transparent convenience pricing

---

*This document is the complete specification for building Present Agent MVP.*
