# Present Agent v3 Codebase & Product Review

Present Agent v3 is an AI-powered gifting assistant built specifically for individuals with ADHD or decision fatigue. It employs a two-tier recommendation engine and an opinionated user experience to streamline the gifting process.

Below is a comprehensive technical and product review of the repository.

## 1. Architecture Quality

**The Good:**
- **Two-Tier LLM Strategy:** The separation of concerns between models is excellent. Using **Gemini 2.5 Flash** for low-latency conversational profiling ensures a snappy chat experience, while relying on **Claude 3.5 Sonnet** (a stronger reasoning model) for the nuanced final ranking and copy generation ensures high-quality results.
- **Pre-filtering Pattern:** Instead of relying entirely on an LLM to parse a massive catalog, the architecture uses a hybrid approach. It pre-filters 171K SQLite products down to ~150 candidates using deterministic rules (budget, occasion, urgency) before passing them to Claude. This saves massive token costs and reduces hallucinations.
- **Instrumented Data Pipeline:** The project includes a solid offline pipeline (`scripts/import-shopify.ts`, `enrich-products.ts`) to ingest and pre-compute "gift intelligence" offline rather than evaluating it at runtime.

**The Bad:**
- **Stateful Deployment Bottleneck:** The application uses `better-sqlite3` reading from `data/catalog.db`. This requires the Next.js app to run in a stateful, long-lived container environment (like Railway or Docker, which are present in the repo). This breaks standard Vercel/serverless paradigms. You cannot horizontally scale this easily without moving to a distributed database like Turso (libSQL) or PostgreSQL.

## 2. Security 

**Critical Risks:**
- **Prototype-Grade Authentication:** The current authentication is fundamentally insecure for a production environment. 
  - The endpoint `/api/auth/google/route.ts` blindly accepts a JSON payload of `{ googleId, email, name }` and creates/logs in the user. An attacker can simply spoof a request with anyone's email to hijack their account. 
  - API routes rely on an `x-user-id` header (checked via `requireAuth` in `lib/admin-auth.ts`) rather than securely signed JWTs or HttpOnly session cookies. 
- **Prompt Injection Controls:** The app does use `sanitizeForPrompt` to truncate and clean strings before sending them to Claude, which is a good baseline defense against prompt injection (especially since product data is scraped from external Shopify stores).

## 3. UX Flow

**The Good:**
- **Opinionated & ADHD-Friendly:** The UX actively fights decision paralysis. The strict 3-turn limit on the conversation prevents the "endless survey" feeling common in other AI agents.
- **The "3-Slot" Strategy:** Forcing the UI to display exactly 3 options (*Top Pick, Great Match, Wild Card*) is brilliant. It creates psychological safety for the user.
- **Confidence Building:** Generating a "Presentation Guide" and framing gifts as "What this says" addresses the core anxiety of gift-giving: *Will they understand why I bought this?*

**The Bad:**
- **Rigidity:** If the initial 3 recommendations miss the mark, there does not appear to be an obvious "Show me 3 more" conversational reroll mechanism. The strict bounds might cause a dead-end if the catalog lacks strong matches for niche interests.

## 4. Recommendation Engine

**The Good:**
- **Strict Diversity & Budget Guardrails:** The post-processing logic in `lib/recommend.ts` rigidly enforces budget limits (treating single numbers as hard ceilings) and ensures category diversity (never two items from the same category or brand). This prevents the AI from lazily outputting three identical items.
- **Relationship Normalization:** The `normalizeRelationship` function efficiently maps messy human input ("my baby sister") into canonical buckets ("close_family"), improving database query reliability.

**The Bad:**
- **Inefficient Querying:** The SQLite pre-filter relies heavily on `LIKE %interest%` against stringified JSON columns (`recipient_traits`). This is computationally expensive (causing full table scans) and semantically fragile (e.g., searching for "baking" won't match "cooking" or "pastry").
- **Latency & Context Overhead:** Passing 150 summarized products into Claude's context window on every request takes significant time. The code has a 25-second hard timeout for Claude, which is an eternity in consumer UX.

## 5. Testing & Quality Assurance

**The Good:**
- **World-Class AI Testing:** The inclusion of `test/multi-turn-harness.ts` and persona-based scoring is exceptional. Instead of just testing if the code compiles, the repository quantitatively scores the *quality* of the AI's contextual extraction and recommendation relevance. This protects the core product value from prompt regressions.
- **Playwright Coverage:** Having dedicated end-to-end tests for the conversational flow and API routes ensures critical path reliability.

## 6. Competitive Position

Present Agent v3 is well-positioned against generic AI chatbots and standard e-commerce filters. 
- **Vs. ChatGPT:** It offers a much tighter, curated UI specifically built for gifting, avoiding the wall-of-text problem.
- **Vs. E-commerce / Pinterest:** It shifts the focus from "things to buy" to "relationships to nurture," making it an emotional tool rather than just a transactional one.

## 7. Top 5 Recommendations for Improvement

1. **Implement Proper Authentication (High Priority):** Replace the `x-user-id` and raw payload trust with NextAuth.js or Clerk. You must validate the Google ID Token on the backend to prevent trivial account takeovers.
2. **Migrate to Vector Search or FTS5 (Medium Priority):** Replace the `LIKE %...%` SQLite queries with an embedding-based vector search (e.g., pgvector, or SQLite's `vss` extension) or at minimum SQLite FTS5. This will drastically improve the relevance of the 150 items passed to Claude.
3. **Decouple the Database for Serverless (Medium Priority):** Migrate from `better-sqlite3` to Turso (libSQL) to allow the Next.js App Router to be deployed on Edge networks (Vercel/Cloudflare) without stateful container headaches.
4. **Implement UI Streaming (High Priority):** A 25-second wait for Claude Sonnet is too long for a blank loading state. Implement React Server Components (RSC) streaming via the AI SDK to stream the 3 product cards into the UI one by one as they are generated.
5. **Inventory Freshness Checks (Low/Medium Priority):** With 171K static products scraped from Shopify, dead links and out-of-stock items will frustrate users. Implement a background worker or a just-in-time check to verify product availability before displaying the final 3 cards to the user.
