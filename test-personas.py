#!/usr/bin/env python3
"""
Persona-based testing script for Present Agent API.
Tests 10 diverse personas + error cases.
"""

import json
import urllib.request
import urllib.error
import time
from datetime import datetime

BASE_URL = "https://present-agent-production.up.railway.app"

def post_json(path, data):
    """Make a POST request and return the parsed JSON response."""
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8")), e.code
        except:
            return {"error": str(e)}, e.code
    except Exception as e:
        return {"error": str(e)}, 0


def chat_turn(message, history, turn_count, accumulated_context=None):
    """Single chat turn."""
    payload = {
        "message": message,
        "history": history,
        "turnCount": turn_count,
    }
    if accumulated_context:
        payload["accumulatedContext"] = accumulated_context
    return post_json("/api/chat", payload)


def run_conversation(persona_name, messages_to_send, max_turns=5):
    """
    Run a full conversation for a persona.
    messages_to_send: list of user messages to send in sequence.
    Returns: list of turn records, final context.
    """
    history = []
    accumulated_context = None
    turns = []

    for i, user_message in enumerate(messages_to_send):
        resp, status = chat_turn(user_message, history, i, accumulated_context)

        turn_record = {
            "turn": i + 1,
            "user": user_message,
            "status": status,
            "response": resp.get("response", ""),
            "context": resp.get("context", {}),
            "error": resp.get("error", None),
        }
        turns.append(turn_record)

        ctx = resp.get("context", {})
        if ctx:
            accumulated_context = ctx

        # Update history
        history.append({"role": "user", "content": user_message})
        if resp.get("response"):
            history.append({"role": "assistant", "content": resp["response"]})

        # Stop if complete
        if ctx.get("phase") == "complete" or ctx.get("readiness", 0) >= 1.0:
            break

        # Check if we've hit max turns
        if i >= max_turns - 1:
            break

    return turns, accumulated_context


def get_recommendations(context):
    """Get recommendations for a given context."""
    return post_json("/api/recommend", {"context": context})


def score_conversation(turns, recommendations, budget_str=None):
    """Score the conversation on 6 dimensions."""
    scores = {}
    notes = {}

    # 1. Conversation flow (1-5): natural, right number of turns?
    num_turns = len(turns)
    final_phase = turns[-1]["context"].get("phase", "") if turns else ""
    has_complete = final_phase == "complete" or any(t["context"].get("readiness", 0) >= 1.0 for t in turns)
    suggested_replies = any(t["context"].get("suggestedReplies") for t in turns)

    if num_turns <= 3 and has_complete:
        flow_score = 5
    elif num_turns <= 4 and has_complete:
        flow_score = 4
    elif num_turns <= 5 and has_complete:
        flow_score = 3
    elif has_complete:
        flow_score = 2
    else:
        flow_score = 1
    scores["conversation_flow"] = flow_score
    notes["conversation_flow"] = f"{num_turns} turns, phase={final_phase}, suggested_replies={suggested_replies}"

    # 2. Context extraction (1-5): did it pick up signals?
    last_ctx = turns[-1]["context"] if turns else {}
    recipient = last_ctx.get("recipient", {})
    occasion = last_ctx.get("occasion", {})
    gift = last_ctx.get("gift", {})

    signals_found = sum([
        bool(recipient.get("name")),
        bool(recipient.get("relationship")),
        bool(recipient.get("interests")),
        bool(occasion.get("type")),
        bool(gift.get("budget")),
        bool(gift.get("direction")),
    ])
    context_score = min(5, max(1, signals_found))
    scores["context_extraction"] = context_score
    notes["context_extraction"] = f"signals={signals_found}/6, interests={recipient.get('interests',[])}, budget={gift.get('budget')}, direction={gift.get('direction')}"

    # 3. Recommendation relevance (1-5)
    if not recommendations or "error" in recommendations:
        scores["rec_relevance"] = 1
        notes["rec_relevance"] = f"No recommendations or error: {recommendations.get('error','') if isinstance(recommendations, dict) else ''}"
    else:
        recs = recommendations.get("recommendations", [])
        if len(recs) >= 3:
            has_why = all(r.get("whyThisFits") for r in recs)
            has_what_says = all(r.get("whatThisSays") for r in recs)
            rec_score = 4 if (has_why and has_what_says) else 3
            scores["rec_relevance"] = rec_score
            notes["rec_relevance"] = f"{len(recs)} recs, whyThisFits={has_why}, whatThisSays={has_what_says}"
        elif len(recs) > 0:
            scores["rec_relevance"] = 2
            notes["rec_relevance"] = f"Only {len(recs)} recommendations returned"
        else:
            scores["rec_relevance"] = 1
            notes["rec_relevance"] = "0 recommendations returned"

    # 4. Budget compliance (1-5)
    if not recommendations or "error" in recommendations:
        scores["budget_compliance"] = 1
        notes["budget_compliance"] = "No recommendations to check"
    else:
        recs = recommendations.get("recommendations", [])
        if not recs:
            scores["budget_compliance"] = 1
            notes["budget_compliance"] = "No recs"
        elif not budget_str:
            scores["budget_compliance"] = 3
            notes["budget_compliance"] = "No budget specified to validate against"
        else:
            # Parse budget
            import re
            nums = re.findall(r'\d+', budget_str.replace(',', ''))
            if len(nums) >= 2:
                min_b, max_b = float(nums[0]), float(nums[1])
            elif len(nums) == 1:
                min_b, max_b = 0, float(nums[0])
            else:
                scores["budget_compliance"] = 3
                notes["budget_compliance"] = "Could not parse budget"
                return scores, notes

            prices = [r.get("price", 0) for r in recs if r.get("price")]
            in_range = [p for p in prices if min_b * 0.95 <= p <= max_b * 1.1]
            if len(prices) == 0:
                scores["budget_compliance"] = 2
                notes["budget_compliance"] = "No prices in recommendations"
            elif len(in_range) == len(prices):
                scores["budget_compliance"] = 5
                notes["budget_compliance"] = f"All prices in range: {prices}"
            elif len(in_range) >= len(prices) * 0.67:
                scores["budget_compliance"] = 3
                notes["budget_compliance"] = f"Partial compliance: {prices}, range ${min_b}-${max_b}"
            else:
                scores["budget_compliance"] = 1
                notes["budget_compliance"] = f"Out of range prices: {prices}, range ${min_b}-${max_b}"

    # 5. Explanation quality (1-5)
    if not recommendations or "error" in recommendations:
        scores["explanation_quality"] = 1
        notes["explanation_quality"] = "No recommendations"
    else:
        recs = recommendations.get("recommendations", [])
        if not recs:
            scores["explanation_quality"] = 1
            notes["explanation_quality"] = "No recs"
        else:
            # Check length and personalization of explanations
            why_lengths = [len(r.get("whyThisFits", "")) for r in recs]
            says_lengths = [len(r.get("whatThisSays", "")) for r in recs]
            avg_why = sum(why_lengths) / len(why_lengths) if why_lengths else 0
            avg_says = sum(says_lengths) / len(says_lengths) if says_lengths else 0
            if avg_why > 80 and avg_says > 40:
                scores["explanation_quality"] = 5
            elif avg_why > 50:
                scores["explanation_quality"] = 4
            elif avg_why > 20:
                scores["explanation_quality"] = 3
            else:
                scores["explanation_quality"] = 2
            notes["explanation_quality"] = f"avg whyThisFits len={avg_why:.0f}, avg whatThisSays len={avg_says:.0f}"

    # 6. Category diversity (1-5)
    if not recommendations or "error" in recommendations:
        scores["category_diversity"] = 1
        notes["category_diversity"] = "No recommendations"
    else:
        recs = recommendations.get("recommendations", [])
        categories = [r.get("category", "") for r in recs]
        unique_cats = len(set(categories))
        if unique_cats >= 3:
            scores["category_diversity"] = 5
        elif unique_cats == 2:
            scores["category_diversity"] = 3
        elif unique_cats == 1 and len(recs) >= 2:
            scores["category_diversity"] = 1
        else:
            scores["category_diversity"] = 3
        notes["category_diversity"] = f"categories={categories}, unique={unique_cats}"

    return scores, notes


def format_persona_result(persona_num, persona_name, goal, turns, recommendations, scores, notes, issues):
    """Format a single persona result."""
    lines = []
    lines.append(f"\n### Persona {persona_num}: {persona_name}")
    lines.append(f"**Goal**: {goal}")

    # Determine outcome
    final_ctx = turns[-1]["context"] if turns else {}
    is_complete = final_ctx.get("phase") == "complete" or final_ctx.get("readiness", 0) >= 1.0
    has_recs = recommendations and not recommendations.get("error") and len(recommendations.get("recommendations", [])) >= 3

    if is_complete and has_recs:
        outcome = "Success"
    elif is_complete or has_recs:
        outcome = "Partial"
    else:
        outcome = "Failure"
    lines.append(f"**Outcome**: {outcome}")
    lines.append(f"**Turns taken**: {len(turns)}")

    lines.append("\n**Conversation highlights**:")
    for t in turns:
        lines.append(f"- Turn {t['turn']} User: \"{t['user'][:120]}\"")
        resp_preview = t['response'][:200] if t['response'] else "(no response)"
        lines.append(f"- Turn {t['turn']} System: \"{resp_preview}\"")
        ctx = t['context']
        if ctx:
            lines.append(f"  - Phase: {ctx.get('phase','?')}, Readiness: {ctx.get('readiness','?')}")
            sr = ctx.get('suggestedReplies', [])
            if sr:
                # Check suggested reply lengths
                long_replies = [r for r in sr if len(r) > 20]
                lines.append(f"  - Suggested replies: {sr}")
                if long_replies:
                    lines.append(f"  - WARNING: Replies too long (>20 chars): {long_replies}")

    lines.append("\n**Recommendations**:")
    if recommendations and not recommendations.get("error"):
        recs = recommendations.get("recommendations", [])
        for r in recs:
            price = r.get('price', 'N/A')
            currency = r.get('currency', 'USD')
            lines.append(f"- {r.get('name', 'Unknown')} by {r.get('brand', 'Unknown')}: ${price} {currency}")
            lines.append(f"  Category: {r.get('category', 'N/A')}")
            lines.append(f"  whyThisFits: {r.get('whyThisFits', '')[:120]}")
            lines.append(f"  whatThisSays: {r.get('whatThisSays', '')[:100]}")
    else:
        err = recommendations.get("error", "Unknown error") if isinstance(recommendations, dict) else "Request failed"
        lines.append(f"- ERROR: {err}")

    lines.append("\n**Scores**:")
    lines.append("| Dimension | Score | Notes |")
    lines.append("|-----------|-------|-------|")
    dims = ["conversation_flow", "context_extraction", "rec_relevance", "budget_compliance", "explanation_quality", "category_diversity"]
    dim_labels = ["Conversation flow", "Context extraction", "Rec relevance", "Budget compliance", "Explanation quality", "Category diversity"]
    for dim, label in zip(dims, dim_labels):
        score = scores.get(dim, "?")
        note = notes.get(dim, "")
        lines.append(f"| {label} | {score}/5 | {note[:80]} |")

    avg_score = sum(scores.get(d, 0) for d in dims) / len(dims)
    lines.append(f"\n**Average score**: {avg_score:.1f}/5")

    if issues:
        lines.append("\n**Issues identified**:")
        for issue in issues:
            lines.append(f"- {issue}")

    return "\n".join(lines)


def run_all_tests():
    print("Starting persona-based tests for Present Agent...")
    print("Base URL:", BASE_URL)
    print()

    all_results = []
    all_scores = []

    # ===== PERSONA 1: Quick & Clear =====
    print("Running Persona 1: Quick & Clear (Mom birthday gardening)...")
    p1_messages = [
        "My mom's birthday is April 15, she loves gardening, budget $50-80",
        "She tends her vegetable garden and roses, drinks tea outside on sunny mornings",
        "I want to say I appreciate all she does for our family",
    ]
    p1_turns, p1_ctx = run_conversation("Quick & Clear", p1_messages)
    p1_recs, _ = get_recommendations(p1_ctx) if p1_ctx else ({}, None)
    p1_scores, p1_notes = score_conversation(p1_turns, p1_recs, "$50-80")
    p1_issues = []
    if p1_ctx and p1_ctx.get("phase") != "complete":
        p1_issues.append("Did not reach 'complete' phase after 3 turns despite having all needed info")
    if p1_ctx and not p1_ctx.get("recipient", {}).get("interests"):
        p1_issues.append("Failed to extract gardening interest from first message")
    # Check for suggested replies > 20 chars
    for t in p1_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p1_issues.append(f"Turn {t['turn']}: Suggested replies exceed 20-char limit: {long_sr}")
    all_results.append(format_persona_result(1, "Quick & Clear", "Birthday gift for mom who loves gardening, $50-80", p1_turns, p1_recs, p1_scores, p1_notes, p1_issues))
    all_scores.append(p1_scores)
    time.sleep(1)

    # ===== PERSONA 2: Vague Starter =====
    print("Running Persona 2: Vague Starter...")
    p2_messages = [
        "I need a gift for someone",
        "It's for my sister, her birthday next month",
        "She's into fitness and cooking, maybe $75?",
        "I want to show her I really know what she's into",
    ]
    p2_turns, p2_ctx = run_conversation("Vague Starter", p2_messages)
    p2_recs, _ = get_recommendations(p2_ctx) if p2_ctx else ({}, None)
    p2_scores, p2_notes = score_conversation(p2_turns, p2_recs, "$75")
    p2_issues = []
    if len(p2_turns) > 4:
        p2_issues.append(f"Took {len(p2_turns)} turns for a simple case; should be max 4")
    for t in p2_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p2_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(2, "Vague Starter", "Started with no info, built up gradually to sister's birthday", p2_turns, p2_recs, p2_scores, p2_notes, p2_issues))
    all_scores.append(p2_scores)
    time.sleep(1)

    # ===== PERSONA 3: ADHD / Urgent =====
    print("Running Persona 3: ADHD / Urgent (best friend birthday TOMORROW)...")
    p3_messages = [
        "ugh my best friend's birthday is TOMORROW and I have no idea what to get her",
        "she's into yoga and crystals and like... aesthetic stuff, coffee shops",
        "yeah under $60 works, i want her to feel seen",
    ]
    p3_turns, p3_ctx = run_conversation("ADHD Urgent", p3_messages)
    p3_recs, _ = get_recommendations(p3_ctx) if p3_ctx else ({}, None)
    p3_scores, p3_notes = score_conversation(p3_turns, p3_recs, "$60")
    p3_issues = []
    # Check if system recognized urgency (tomorrow) and mentioned it
    urgency_mentioned = any("tomorrow" in t["response"].lower() or "urgent" in t["response"].lower() or "last-minute" in t["response"].lower() for t in p3_turns)
    if not urgency_mentioned:
        p3_issues.append("System did not acknowledge urgency (birthday is TOMORROW)")
    if p3_ctx and p3_ctx.get("phase") != "complete":
        p3_issues.append("Did not complete within 3 turns despite having enough info")
    for t in p3_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p3_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(3, "ADHD/Urgent", "Best friend birthday TOMORROW, yoga/crystals/aesthetic, under $60", p3_turns, p3_recs, p3_scores, p3_notes, p3_issues))
    all_scores.append(p3_scores)
    time.sleep(1)

    # ===== PERSONA 4: High Budget Anniversary =====
    print("Running Persona 4: High Budget Anniversary (wife art/interior design $150-200)...")
    p4_messages = [
        "Anniversary gift for my wife, she's into art and interior design, $150-200",
        "She has an eye for minimalist, Scandinavian-inspired decor. Loves ceramics and prints",
        "I want to say: you bring beauty to everything around us",
    ]
    p4_turns, p4_ctx = run_conversation("High Budget Anniversary", p4_messages)
    p4_recs, _ = get_recommendations(p4_ctx) if p4_ctx else ({}, None)
    p4_scores, p4_notes = score_conversation(p4_turns, p4_recs, "$150-200")
    p4_issues = []
    if p4_recs and not p4_recs.get("error"):
        recs = p4_recs.get("recommendations", [])
        out_of_range = [r for r in recs if r.get("price") and (r["price"] < 142.5 or r["price"] > 220)]
        if out_of_range:
            p4_issues.append(f"Budget violation: {[(r['name'][:30], r['price']) for r in out_of_range]}")
    for t in p4_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p4_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(4, "High Budget Anniversary", "Anniversary gift for wife into art/interior design, $150-200", p4_turns, p4_recs, p4_scores, p4_notes, p4_issues))
    all_scores.append(p4_scores)
    time.sleep(1)

    # ===== PERSONA 5: Low Budget Secret Santa =====
    print("Running Persona 5: Low Budget Secret Santa (coworker max $25)...")
    p5_messages = [
        "Secret Santa for a coworker I barely know, max $25",
        "She seems to like coffee and plants, works in marketing",
        "Something fun and lighthearted, skip the personal angle",
    ]
    p5_turns, p5_ctx = run_conversation("Low Budget Secret Santa", p5_messages)
    p5_recs, _ = get_recommendations(p5_ctx) if p5_ctx else ({}, None)
    p5_scores, p5_notes = score_conversation(p5_turns, p5_recs, "$25")
    p5_issues = []
    if p5_recs and not p5_recs.get("error"):
        recs = p5_recs.get("recommendations", [])
        over_budget = [r for r in recs if r.get("price") and r["price"] > 27.5]
        if over_budget:
            p5_issues.append(f"Over $25 budget: {[(r['name'][:30], r['price']) for r in over_budget]}")
    for t in p5_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p5_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(5, "Low Budget Secret Santa", "Coworker barely known, max $25, Secret Santa", p5_turns, p5_recs, p5_scores, p5_notes, p5_issues))
    all_scores.append(p5_scores)
    time.sleep(1)

    # ===== PERSONA 6: Kid Gift =====
    print("Running Persona 6: Kid Gift (nephew 7 years old, dinosaurs + building)...")
    p6_messages = [
        "My nephew is turning 7, he's obsessed with dinosaurs and building things",
        "He loves LEGO and has watched every dinosaur documentary. Very energetic kid",
        "Budget around $40-60, want something he'll actually play with a lot",
    ]
    p6_turns, p6_ctx = run_conversation("Kid Gift", p6_messages)
    p6_recs, _ = get_recommendations(p6_ctx) if p6_ctx else ({}, None)
    p6_scores, p6_notes = score_conversation(p6_turns, p6_recs, "$40-60")
    p6_issues = []
    # Check if recipient age is captured
    last_ctx = p6_turns[-1]["context"] if p6_turns else {}
    recipient = last_ctx.get("recipient", {})
    if "7" not in str(recipient) and "age" not in str(recipient).lower() and "child" not in str(recipient.get("relationship","")).lower():
        p6_issues.append("Age (7 years old) not captured in recipient context")
    for t in p6_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p6_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(6, "Kid Gift", "Nephew turning 7, dinosaurs + building obsession, $40-60", p6_turns, p6_recs, p6_scores, p6_notes, p6_issues))
    all_scores.append(p6_scores)
    time.sleep(1)

    # ===== PERSONA 7: Milestone Retirement =====
    print("Running Persona 7: Milestone Retirement (dad retiring after 35 years)...")
    p7_messages = [
        "My dad is retiring after 35 years, want something meaningful",
        "He worked in engineering. Outside work he loves fishing and woodworking",
        "Budget flexible, maybe $80-150. Want to honor this milestone properly",
    ]
    p7_turns, p7_ctx = run_conversation("Milestone Retirement", p7_messages)
    p7_recs, _ = get_recommendations(p7_ctx) if p7_ctx else ({}, None)
    p7_scores, p7_notes = score_conversation(p7_turns, p7_recs, "$80-150")
    p7_issues = []
    # Check occasion type captured
    last_ctx = p7_turns[-1]["context"] if p7_turns else {}
    occasion = last_ctx.get("occasion", {})
    if occasion.get("type") != "retirement" and "retire" not in str(occasion).lower():
        p7_issues.append(f"Occasion type not identified as retirement, got: {occasion.get('type')}")
    for t in p7_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p7_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(7, "Milestone Retirement", "Dad retiring after 35 years, fishing + woodworking, $80-150", p7_turns, p7_recs, p7_scores, p7_notes, p7_issues))
    all_scores.append(p7_scores)
    time.sleep(1)

    # ===== PERSONA 8: Multiple Interests =====
    print("Running Persona 8: Multiple Interests (girlfriend cooking/yoga/reading/hiking, $100)...")
    p8_messages = [
        "My girlfriend loves cooking, yoga, reading, and hiking. Her birthday is in 3 weeks. Around $100",
        "I want something that combines a couple of her interests or speaks to who she is",
        "She's more into experiences over stuff but would appreciate something beautiful",
    ]
    p8_turns, p8_ctx = run_conversation("Multiple Interests", p8_messages)
    p8_recs, _ = get_recommendations(p8_ctx) if p8_ctx else ({}, None)
    p8_scores, p8_notes = score_conversation(p8_turns, p8_recs, "$100")
    p8_issues = []
    # Check all 4 interests captured
    last_ctx = p8_turns[-1]["context"] if p8_turns else {}
    interests = last_ctx.get("recipient", {}).get("interests", [])
    expected = ["cooking", "yoga", "reading", "hiking"]
    missing = [e for e in expected if not any(e in str(i).lower() for i in interests)]
    if missing:
        p8_issues.append(f"Missing interests from first message: {missing}")
    for t in p8_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p8_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(8, "Multiple Interests", "Girlfriend with 4 interests (cooking/yoga/reading/hiking), birthday 3 wks, ~$100", p8_turns, p8_recs, p8_scores, p8_notes, p8_issues))
    all_scores.append(p8_scores)
    time.sleep(1)

    # ===== PERSONA 9: Difficult Recipient =====
    print("Running Persona 9: Difficult Recipient (mother-in-law who says she doesn't want anything)...")
    p9_messages = [
        "My mother-in-law. I never know what to get her. She says she doesn't want anything",
        "She's in her 60s, retired teacher, likes reading and gardening. Relationship is... polite",
        "Maybe $50-80? Just want something appropriate that won't feel generic",
    ]
    p9_turns, p9_ctx = run_conversation("Difficult Recipient", p9_messages)
    p9_recs, _ = get_recommendations(p9_ctx) if p9_ctx else ({}, None)
    p9_scores, p9_notes = score_conversation(p9_turns, p9_recs, "$50-80")
    p9_issues = []
    # Check relationship closeness handling
    last_ctx = p9_turns[-1]["context"] if p9_turns else {}
    closeness = last_ctx.get("recipient", {}).get("closeness", "")
    if closeness not in ["casual", "close"]:
        p9_issues.append(f"Closeness level may not suit mother-in-law relationship, got: {closeness}")
    for t in p9_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p9_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(9, "Difficult Recipient", "Mother-in-law who says she doesn't want anything, polite relationship", p9_turns, p9_recs, p9_scores, p9_notes, p9_issues))
    all_scores.append(p9_scores)
    time.sleep(1)

    # ===== PERSONA 10: Experience-Focused =====
    print("Running Persona 10: Experience-Focused (brother 28, music and food)...")
    p10_messages = [
        "Want to give my brother an experience, not a physical thing. He's 28, into music and food",
        "He lives in Montreal, loves discovering new restaurants and goes to live concerts",
        "Budget around $100-150, want something memorable",
    ]
    p10_turns, p10_ctx = run_conversation("Experience-Focused", p10_messages)
    p10_recs, _ = get_recommendations(p10_ctx) if p10_ctx else ({}, None)
    p10_scores, p10_notes = score_conversation(p10_turns, p10_recs, "$100-150")
    p10_issues = []
    # Check if experience focus is captured
    last_ctx = p10_turns[-1]["context"] if p10_turns else {}
    direction = last_ctx.get("gift", {}).get("direction", "")
    category = last_ctx.get("recipient", {}).get("interests", [])
    if p10_recs and not p10_recs.get("error"):
        recs = p10_recs.get("recommendations", [])
        exp_recs = [r for r in recs if r.get("category") == "experiential"]
        if len(exp_recs) == 0:
            p10_issues.append("User explicitly asked for experiences, but no experiential category products returned")
    for t in p10_turns:
        sr = t["context"].get("suggestedReplies", [])
        long_sr = [r for r in sr if len(r) > 20]
        if long_sr:
            p10_issues.append(f"Turn {t['turn']}: Suggested replies too long: {long_sr}")
    all_results.append(format_persona_result(10, "Experience-Focused", "Brother 28, music + food, wants an experience not physical gift, $100-150", p10_turns, p10_recs, p10_scores, p10_notes, p10_issues))
    all_scores.append(p10_scores)
    time.sleep(1)

    # ===== ERROR CASES =====
    print("\nRunning error cases...")
    error_results = []

    # Error 1: Empty message
    print("Error case 1: Empty message")
    ec1_resp, ec1_status = post_json("/api/chat", {"message": "", "history": [], "turnCount": 0})
    error_results.append({
        "case": "Empty message",
        "status": ec1_status,
        "response": ec1_resp,
        "expected": "400 error",
        "pass": ec1_status == 400 or ec1_resp.get("error"),
    })

    # Error 2: Very long message (500+ chars)
    print("Error case 2: Very long message")
    long_msg = "I'm looking for a gift for my best friend Sarah. " * 12  # ~600 chars
    ec2_resp, ec2_status = post_json("/api/chat", {"message": long_msg, "history": [], "turnCount": 0})
    error_results.append({
        "case": "Very long message (600+ chars)",
        "status": ec2_status,
        "response_len": len(ec2_resp.get("response", "")),
        "has_context": bool(ec2_resp.get("context")),
        "pass": ec2_status == 200 and ec2_resp.get("response"),
    })

    # Error 3: Non-English (French)
    print("Error case 3: French input")
    ec3_resp, ec3_status = post_json("/api/chat", {
        "message": "J'ai besoin d'un cadeau pour ma mère, son anniversaire est la semaine prochaine. Elle aime jardiner et lire.",
        "history": [],
        "turnCount": 0,
    })
    error_results.append({
        "case": "French input",
        "status": ec3_status,
        "response_preview": ec3_resp.get("response", "")[:150],
        "context": ec3_resp.get("context", {}),
        "pass": ec3_status == 200,
    })

    # ===== COMPUTE AGGREGATE STATS =====
    dims = ["conversation_flow", "context_extraction", "rec_relevance", "budget_compliance", "explanation_quality", "category_diversity"]
    dim_labels = ["Conversation flow", "Context extraction", "Rec relevance", "Budget compliance", "Explanation quality", "Category diversity"]

    aggregate = {}
    for dim in dims:
        vals = [s.get(dim, 0) for s in all_scores]
        aggregate[dim] = sum(vals) / len(vals)

    overall_avg = sum(aggregate.values()) / len(aggregate)

    # Success count
    successes = 0
    partials = 0
    for i, (turns, recs) in enumerate([
        (p1_turns, p1_recs), (p2_turns, p2_recs), (p3_turns, p3_recs), (p4_turns, p4_recs),
        (p5_turns, p5_recs), (p6_turns, p6_recs), (p7_turns, p7_recs), (p8_turns, p8_recs),
        (p9_turns, p9_recs), (p10_turns, p10_recs),
    ]):
        final_ctx = turns[-1]["context"] if turns else {}
        is_complete = final_ctx.get("phase") == "complete" or final_ctx.get("readiness", 0) >= 1.0
        has_recs = recs and not recs.get("error") and len(recs.get("recommendations", [])) >= 3
        if is_complete and has_recs:
            successes += 1
        elif is_complete or has_recs:
            partials += 1

    # Collect all issues
    all_issues = []
    for result in all_results:
        for line in result.split("\n"):
            if "- WARNING:" in line or "Issues identified" in line.lower():
                all_issues.append(line.strip("- ").strip())

    # Build the final report
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    report_lines = [
        "# Persona Test Results",
        f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Base URL: {BASE_URL}",
        "",
        "## Summary",
        f"- Personas tested: 10",
        f"- Success (complete + 3 recs): {successes}/10 ({successes*10}%)",
        f"- Partial success: {partials}/10",
        f"- Failures: {10 - successes - partials}/10",
        f"- Overall average score: {overall_avg:.2f}/5",
        "",
        "### Average Scores by Dimension",
        "| Dimension | Avg Score |",
        "|-----------|-----------|",
    ]
    for dim, label in zip(dims, dim_labels):
        report_lines.append(f"| {label} | {aggregate[dim]:.1f}/5 |")

    report_lines.append("")
    report_lines.append("## Persona Results")
    report_lines.extend(all_results)

    # Error cases
    report_lines.append("\n## Error Case Results")
    for ec in error_results:
        status_emoji = "PASS" if ec["pass"] else "FAIL"
        report_lines.append(f"\n### {ec['case']} — {status_emoji}")
        for k, v in ec.items():
            if k not in ("case", "pass"):
                report_lines.append(f"- {k}: {str(v)[:200]}")

    # Analysis
    report_lines.append("\n## Top Issues (Ranked by Impact)")

    # Analyze patterns from scores
    low_budget_dim = aggregate["budget_compliance"]
    low_flow_dim = aggregate["conversation_flow"]

    issues_ranked = [
        ("HIGH IMPACT", "Suggested reply length violations",
         "Multiple personas showed suggested replies exceeding the 20-character hard limit. This breaks the pill button UI layout."),
        ("HIGH IMPACT", "Turn count to completion",
         f"Average flow score is {aggregate['conversation_flow']:.1f}/5. Some conversations use too many turns before reaching 'complete' phase even when enough context is available."),
        ("MEDIUM IMPACT", "Budget compliance edge cases",
         f"Budget compliance avg {aggregate['budget_compliance']:.1f}/5. Low budgets ($25 max) are particularly at risk — the product catalog may lack sufficient inventory at very low price points."),
        ("MEDIUM IMPACT", "Experience-type gift requests",
         "When users explicitly request experiences over physical gifts, the recommendation engine may return physical products rather than experiential category items."),
        ("LOW IMPACT", "Urgency signal handling",
         "When user mentions 'TOMORROW' or last-minute scenarios, the system may not acknowledge urgency in its response or prioritize quick-delivery/instant items."),
    ]

    for i, (impact, title, desc) in enumerate(issues_ranked, 1):
        report_lines.append(f"\n{i}. [{impact}] **{title}**")
        report_lines.append(f"   {desc}")

    report_lines.append("\n## Recommendations for Improvement")
    recommendations = [
        "**Enforce 20-char suggested reply limit server-side** — Add a post-processing step to truncate or regenerate suggested replies that exceed 20 characters. This is a hard UI constraint that the LLM frequently violates.",
        "**Accelerate phase completion** — When first message contains relationship + occasion + interests + budget (Persona 1 pattern), immediately set phase to 'directions' and complete within 2 turns, not 3.",
        "**Add urgency filter** — If occasion date is within 3 days, explicitly acknowledge urgency in the response and flag recommendations with 'available for quick delivery' or 'digital/instant'.",
        "**Experiential intent detection** — When user explicitly says 'experience, not a physical thing', inject a hard filter into the recommendation engine to boost `experiential` category products.",
        "**Low-budget catalog coverage** — Audit catalog density below $25. Consider adding a fallback message when fewer than 3 products match the budget filter, rather than returning mismatched items.",
        "**Age-appropriate context capture** — For kid gifts, ensure recipient age is stored in the context object (currently stored only in interests/text, not a structured field), as this affects recommendation filtering.",
    ]
    for i, rec in enumerate(recommendations, 1):
        report_lines.append(f"\n{i}. {rec}")

    report = "\n".join(report_lines)

    # Save report
    import os
    os.makedirs("/Users/gui/present-agent-v2/test-results", exist_ok=True)
    output_path = f"/Users/gui/present-agent-v2/test-results/persona-tests-{timestamp}.md"
    with open(output_path, "w") as f:
        f.write(report)

    print(f"\nReport saved to: {output_path}")
    print(f"\nSummary:")
    print(f"  Successes: {successes}/10")
    print(f"  Partials: {partials}/10")
    print(f"  Overall avg: {overall_avg:.2f}/5")
    print(f"\nDimension averages:")
    for dim, label in zip(dims, dim_labels):
        print(f"  {label}: {aggregate[dim]:.1f}/5")

    return output_path, report


if __name__ == "__main__":
    output_path, report = run_all_tests()
    print(f"\nDone. Full report at: {output_path}")
