"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVoiceMode, narrateRecommendations } from "@/lib/useVoice";
import {
  trackJustPickForMe,
  trackMarkedAsPurchased,
  trackRefineClicked,
  trackRecommendationsViewed,
  trackMessageSent,
  trackVoiceToggled,
  trackConversationComplete,
  trackBuyLinkClicked,
} from "@/lib/posthog";
import { sendFeedback } from "@/lib/feedback-client";
import { RecommendationCard } from "@/components/RecommendationCard";
import { GiftProfileCard } from "@/components/GiftProfileCard";
import type { RecommendationItem } from "@/components/RecommendationCard";
import type { GiftContext } from "@/components/GiftProfileCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// ── Main Page ──────────────────────────────────────────────────────
export default function GiftSession() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const occasion = searchParams.get("occasion");
  const date = searchParams.get("date");
  const birthday = searchParams.get("birthday");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<GiftContext>({});
  const [turnCount, setTurnCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [usedReplies, setUsedReplies] = useState<number[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsProgress, setRecsProgress] = useState<string | null>(null);
  const [recsError, setRecsError] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [quickReaction, setQuickReaction] = useState<string | null>(null);
  const [cardReactions, setCardReactions] = useState<Record<string, string>>({});
  const [usedNotQuiteRight, setUsedNotQuiteRight] = useState(false);
  const [refinementRounds, setRefinementRounds] = useState(0);
  const [recsShownAt, setRecsShownAt] = useState<number | null>(null);
  const [justPickLoading, setJustPickLoading] = useState(false);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);
  const [purchaseModalProduct, setPurchaseModalProduct] = useState<RecommendationItem | null>(null);
  const [purchaseModalDismissed, setPurchaseModalDismissed] = useState(false);
  const [conversationResumed, setConversationResumed] = useState(false);
  const sessionStartRef = useRef(Date.now());
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [userId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("present-agent-user-id");
    return null;
  });
  const [recipientId] = useState<string | null>(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("recipientId") : null
  );
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);

  // Voice mode
  const voice = useVoiceMode((voiceText) => {
    // When voice input completes, send as message
    if (voiceText.trim()) {
      sendMessage(voiceText.trim());
    }
  });

  // Handle buy link click — show purchase confirmation after 1.5s
  function handleBuyLinkClicked(rec: RecommendationItem) {
    if (purchaseModalDismissed) return;
    setTimeout(() => {
      setPurchaseModalProduct(rec);
    }, 1500);
  }

  function handlePurchaseConfirm(didBuy: boolean) {
    if (purchaseModalProduct) {
      trackMarkedAsPurchased(sessionIdRef.current, purchaseModalProduct.id, didBuy);
      if (didBuy) {
        sendFeedback("implicit", sessionIdRef.current, {
          selectedProductId: purchaseModalProduct.id,
          markedAsPurchased: true,
        });
      }
    }
    setPurchaseModalProduct(null);
    setPurchaseModalDismissed(true);
  }

  const scrollToBottom = useCallback(() => {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, recommendations, scrollToBottom]);

  // Create persistent DB session if authenticated
  useEffect(() => {
    if (!userId) return;
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, recipientId, recipientName: name }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.sessionId) setDbSessionId(data.sessionId); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist context to DB on phase changes
  useEffect(() => {
    if (!dbSessionId || !context.phase) return;
    fetch(`/api/sessions/${dbSessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gift_context: context,
        status: context.phase === "complete" ? "completed" : "active",
      }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.phase, dbSessionId]);

  // Track conversation completion and reset resumed state
  useEffect(() => {
    if (context.phase === "complete") {
      setConversationResumed(false);
      trackConversationComplete(
        sessionIdRef.current,
        turnCount,
        Date.now() - sessionStartRef.current,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.phase]);

  // Auto-start conversation
  useEffect(() => {
    if (started) return;
    setStarted(true);

    let opener = "I need help finding a gift.";
    if (name && occasion) {
      opener = `I need a gift for ${name}. It's ${occasion}${date ? ` on ${date}` : ""}.`;
    } else if (name) {
      opener = `I need a gift for ${name}.`;
    }

    sendMessage(opener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(content: string, isSuggestedReply = false) {
    const userMsg: Message = { role: "user", content };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);
    setUsedReplies([]); // Clear old suggested replies

    // Track message sent
    trackMessageSent(sessionIdRef.current, turnCount + 1, content.length, isSuggestedReply);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages,
          recipientContext: {
            name,
            occasion,
            date,
            birthday: birthday
              ? { month: parseInt(birthday.split("/")[0]), day: parseInt(birthday.split("/")[1]) }
              : null,
          },
          accumulatedContext: Object.keys(context).length > 0 ? context : null,
          turnCount,
          userId,
          recipientId,
          sessionId: dbSessionId || sessionIdRef.current,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages([...newHistory, { role: "assistant", content: "I hit a snag. Could you try sending that again?" }]);
      } else {
        setMessages([...newHistory, { role: "assistant", content: data.response }]);
        if (data.context) {
          setContext((prev) => mergeContext(prev, data.context));
        }
        setTurnCount(data.turnCount || turnCount + 1);

        // Auto-speak in voice mode
        if (voice.enabled && data.response) {
          voice.speakResponse(data.response);
        }
      }
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Something went wrong. Try again?" }]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  }

  function mergeContext(prev: GiftContext, next: GiftContext): GiftContext {
    // Merge arrays (interests, wishes, avoids) — deduplicate
    const mergeArrays = (a: string[] = [], b: string[] = []) => {
      const combined = [...a, ...b];
      return combined.filter((v, i) => combined.indexOf(v) === i);
    };

    return {
      recipient: {
        ...prev.recipient,
        ...next.recipient,
        interests: mergeArrays(prev.recipient?.interests, next.recipient?.interests),
        wishes: mergeArrays(prev.recipient?.wishes, next.recipient?.wishes),
        avoids: mergeArrays(prev.recipient?.avoids, next.recipient?.avoids),
      },
      occasion: { ...prev.occasion, ...next.occasion },
      gift: { ...prev.gift, ...next.gift },
      pastGifts: {
        worked: mergeArrays(prev.pastGifts?.worked, next.pastGifts?.worked),
        failed: mergeArrays(prev.pastGifts?.failed, next.pastGifts?.failed),
      },
      effortReflection: (next as GiftContext).effortReflection || prev.effortReflection || [],
      giftNote: (next as GiftContext).giftNote || prev.giftNote || undefined,
      suggestedReplies: next.suggestedReplies || [],
      phase: next.phase || prev.phase,
      readiness: Math.max(next.readiness ?? 0, prev.readiness ?? 0), // Never decrease
    };
  }

  async function fetchRecommendations() {
    setIsLoadingRecs(true);
    setRecsError(false);
    setRecsProgress("Searching products...");
    try {
      // Use streaming endpoint for progressive UX
      const res = await fetch("/api/recommend/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, userId, sessionId: dbSessionId || sessionIdRef.current, recipientId }),
      });

      if (!res.ok || !res.body) {
        // Fallback to non-streaming endpoint
        const fallbackRes = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, userId, sessionId: dbSessionId || sessionIdRef.current, recipientId }),
        });
        const data = await fallbackRes.json();
        if (data.error) { setRecsError(true); setIsLoadingRecs(false); return; }
        if (data.recommendations) { setRecommendations(data.recommendations); setRecsShownAt(Date.now()); }
        setRecsProgress(null);
        setIsLoadingRecs(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const streamedRecs: RecommendationItem[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.status === "searching" || event.status === "scoring") {
              setRecsProgress(event.message);
            } else if (event.status === "recommendation") {
              streamedRecs.push(event.recommendation);
              setRecommendations([...streamedRecs]);
            } else if (event.status === "done") {
              setRecommendations(event.recommendations);
              setRecsShownAt(Date.now());
              setRecsProgress(null);
            } else if (event.status === "error") {
              setRecsError(true);
            }
          } catch { /* skip malformed events */ }
        }
      }

      const data = { recommendations: streamedRecs.length > 0 ? streamedRecs : null };
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        setRecsShownAt(Date.now());

        // Track recommendations viewed
        trackRecommendationsViewed(
          sessionIdRef.current,
          data.recommendations.map((r: RecommendationItem) => r.id),
          data.recommendations.map((r: RecommendationItem) => r.category),
        );

        // Narrate recommendations in voice mode
        if (voice.enabled) {
          const narration = narrateRecommendations(data.recommendations, context.recipient?.name);
          voice.speakResponse(narration);
        }

        // Send implicit feedback for the session so far
        sendFeedback("implicit", sessionIdRef.current, {
          recipientName: context.recipient?.name,
          occasion: context.occasion?.type,
          relationship: context.recipient?.relationship,
          giftContext: context,
          recommendations: data.recommendations.map((r: RecommendationItem, i: number) => ({
            productId: r.id,
            slot: i,
            matchScore: r.matchScore,
            category: r.category,
          })),
          implicit: {
            conversationTurns: turnCount,
            suggestedRepliesUsed: usedReplies.length,
            totalSuggestedReplies: (context.suggestedReplies || []).length,
            conversationDurationMs: Date.now() - sessionStartRef.current,
            recommendationViewDurationMs: 0,
            cardsExpanded: [],
            cardScrollDepth: 0,
            selectedProductId: null,
            selectedSlot: null,
            timeToSelectMs: null,
            usedNotQuiteRight: false,
            refinementRounds: 0,
            returnedAfterSelection: false,
            selectedMultiple: [],
          },
        });
      }
    } catch {
      setRecsError(true);
    }
    setIsLoadingRecs(false);
  }

  // Navigate to card page for a product
  function goToCardPage(rec: RecommendationItem) {
    const product = encodeURIComponent(JSON.stringify({
      id: rec.id,
      name: rec.name,
      brand: rec.brand,
      price: rec.price,
      category: rec.category,
      description: rec.description,
      buyUrl: rec.buyUrl,
    }));
    const ctx = encodeURIComponent(JSON.stringify(context));
    const params = new URLSearchParams();
    params.set("product", product);
    params.set("context", ctx);
    if (recipientId) params.set("recipientId", recipientId);
    if (userId) params.set("userId", userId);
    router.push(`${pathname}/card?${params.toString()}`);
  }

  // Handle "Just Pick For Me" — auto-select top pick, go straight to card
  async function handleJustPickForMe() {
    if (recommendations.length === 0) return;
    setJustPickLoading(true);
    const topPick = recommendations[0];
    trackJustPickForMe(sessionIdRef.current, topPick.id);
    handleProductSelected(topPick.id, 0);
    // Short delay for visual feedback then navigate
    setTimeout(() => {
      goToCardPage(topPick);
      setJustPickLoading(false);
    }, 300);
  }

  // Track product selection and show purchase option
  function handleProductSelected(productId: string, slot: number) {
    setSelectedProducts(prev => [...prev, productId]);

    // Navigate to card page
    const selectedRec = recommendations.find(r => r.id === productId);
    if (selectedRec) {
      goToCardPage(selectedRec);
    }

    // Update implicit feedback with selection data
    sendFeedback("implicit", sessionIdRef.current, {
      recipientName: context.recipient?.name,
      occasion: context.occasion?.type,
      relationship: context.recipient?.relationship,
      giftContext: context,
      recommendations: recommendations.map((r, i) => ({
        productId: r.id,
        slot: i,
        matchScore: r.matchScore,
        category: r.category,
      })),
      implicit: {
        conversationTurns: turnCount,
        suggestedRepliesUsed: usedReplies.length,
        totalSuggestedReplies: (context.suggestedReplies || []).length,
        conversationDurationMs: Date.now() - sessionStartRef.current,
        recommendationViewDurationMs: recsShownAt ? Date.now() - recsShownAt : 0,
        cardsExpanded: Object.keys(cardReactions),
        cardScrollDepth: 1,
        selectedProductId: productId,
        selectedSlot: slot,
        timeToSelectMs: recsShownAt ? Date.now() - recsShownAt : null,
        usedNotQuiteRight,
        refinementRounds,
        returnedAfterSelection: selectedProducts.length > 0,
        selectedMultiple: [...selectedProducts, productId],
      },
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
  }

  function handleSuggestedReply(reply: string, index: number) {
    if (isLoading) return;
    setUsedReplies((prev) => [...prev, index]);
    sendMessage(reply, true);
  }

  const readiness = context.readiness || 0;
  const phase = context.phase || "extract";
  const isComplete = phase === "complete";

  const PHASE_LABELS: Record<string, string> = {
    extract: "Getting to know them",
    directions: "Exploring directions",
    refine: "Narrowing it down",
    complete: "Gift profile ready",
  };

  // Progress dots for visual phase indicator
  const PHASES = ["extract", "directions", "refine", "complete"];
  const phaseIndex = PHASES.indexOf(phase);

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-gray-50">
      {/* Header — thin, Instagram Stories-style progress */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        {/* Phase progress dots */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          {PHASES.map((p, i) => (
            <div key={p} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  i < phaseIndex ? "bg-green-500 w-full" :
                  i === phaseIndex ? "bg-black" : "w-0"
                }`}
                style={i === phaseIndex ? { width: `${Math.max(((readiness - i * 0.25) / 0.25) * 100, 15)}%` } : i < phaseIndex ? { width: "100%" } : {}}
              />
            </div>
          ))}
        </div>

        <div className="px-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-[15px]">
              {context.recipient?.name || name || "Gift finder"}
            </h1>
            <p className="text-[11px] text-gray-400">
              {PHASE_LABELS[phase] || phase}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {voice.isSupported && (
              <button
                onClick={() => {
                  voice.toggle();
                  trackVoiceToggled(sessionIdRef.current, !voice.enabled);
                }}
                className={`p-1.5 rounded-lg transition ${
                  voice.enabled
                    ? "bg-violet-100 text-violet-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title={voice.enabled ? "Voice mode on" : "Voice mode off"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {voice.enabled ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
            )}
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Start over
            </a>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in`}
            style={{ animationDelay: msg.role === "assistant" ? "100ms" : "0ms" }}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-black text-white rounded-2xl rounded-br-md"
                  : "bg-white border border-gray-100 rounded-2xl rounded-bl-md shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Recommendation error with retry */}
        {recsError && recommendations.length === 0 && (
          <div className="my-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-center animate-in">
            <p className="text-sm text-red-800 font-medium mb-1">Couldn&apos;t find recommendations right now</p>
            <p className="text-xs text-red-600 mb-3">This usually fixes itself — try again.</p>
            <button
              onClick={fetchRecommendations}
              disabled={isLoadingRecs}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {isLoadingRecs ? "Retrying..." : "Try again"}
            </button>
          </div>
        )}

        {/* Gift Profile Card when complete */}
        {isComplete && recommendations.length === 0 && !recsError && (
          <GiftProfileCard
            context={context}
            onGetRecommendations={fetchRecommendations}
            isLoadingRecs={isLoadingRecs}
            loadingProgress={recsProgress}
            onRefine={() => {
              trackRefineClicked(sessionIdRef.current);
              setContext((prev) => ({ ...prev, phase: "refine", readiness: 0.7 }));
              setConversationResumed(true);
              // Scroll to input after state update re-renders the input
              setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: "smooth" });
                inputRef.current?.focus();
              }, 100);
            }}
          />
        )}

        {/* Recommendation Cards */}
        {recommendations.length > 0 && (
          <div className="space-y-3 animate-in">
            <p className="text-xs text-gray-400 uppercase tracking-wide px-1">
              3 picks for {context.recipient?.name || "them"}
            </p>
            {recommendations.map((rec, i) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                rank={i}
                recipientName={context.recipient?.name}
                sessionId={sessionIdRef.current}
                onSelected={handleProductSelected}
                onReaction={(productId, r) => setCardReactions(prev => ({ ...prev, [productId]: r }))}
                onBuyLinkClicked={handleBuyLinkClicked}
                isExpanded={expandedRecId === rec.id}
                onToggleExpand={() => setExpandedRecId(expandedRecId === rec.id ? null : rec.id)}
              />
            ))}
            {/* Quick reaction — shown after any product is selected */}
            {selectedProducts.length > 0 && !quickReaction && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center animate-in">
                <p className="text-[11px] text-gray-500 mb-2">How were these picks?</p>
                <div className="flex justify-center gap-2">
                  {[
                    { value: "perfect", label: "Nailed it", emoji: "🎯" },
                    { value: "good_enough", label: "Pretty good", emoji: "👍" },
                    { value: "not_great", label: "Missed", emoji: "😕" },
                  ].map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setQuickReaction(value);
                        sendFeedback("quick_reaction", sessionIdRef.current, { reaction: value });
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs hover:border-gray-400 transition"
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {quickReaction && (
              <p className="text-[11px] text-gray-400 text-center animate-in">
                Thanks — that helps us get better.
              </p>
            )}

            {/* Just Pick For Me — kills decision paralysis */}
            {selectedProducts.length === 0 && (
              <button
                onClick={handleJustPickForMe}
                disabled={justPickLoading}
                className="w-full py-3.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-2xl font-medium text-[15px] hover:border-gray-400 hover:text-gray-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {justPickLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Picking the best one...
                  </span>
                ) : (
                  "Just pick the best one for me"
                )}
              </button>
            )}

            <p className="text-[11px] text-gray-300 text-center px-4 mt-1">
              Tap a card to customize, or let us pick for you
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setRecommendations([]);
                  setRecsError(false);
                  setUsedNotQuiteRight(true);
                  setRefinementRounds(prev => prev + 1);
                  setContext((prev) => ({ ...prev, phase: "refine", readiness: 0.7 }));
                  setConversationResumed(true);
                  setTimeout(() => {
                    inputRef.current?.scrollIntoView({ behavior: "smooth" });
                    inputRef.current?.focus();
                  }, 100);
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
              >
                Not quite right? Refine and try again
              </button>
              <button
                onClick={() => { setRecommendations([]); setRecsError(false); }}
                className="w-full px-4 py-2 text-gray-400 text-xs hover:text-gray-600 transition"
              >
                Back to gift profile
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested replies — above input, pill buttons */}
      {/* Suggested replies — always visible when available (chat stays active after recs) */}
      {!isLoading && context.suggestedReplies && context.suggestedReplies.length > 0 && (
        <div className="px-4 pb-1.5 pt-1 flex gap-2 overflow-x-auto no-scrollbar">
          {context.suggestedReplies.map((reply, i) => (
            <button
              key={`${turnCount}-${i}`}
              onClick={() => handleSuggestedReply(reply, i)}
              disabled={usedReplies.includes(i)}
              className="flex-shrink-0 px-3.5 py-2 text-[13px] bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition text-gray-700 disabled:opacity-30"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Voice listening overlay — shown when actively listening */}
      {voice.isListening && (
        <div className="px-4 py-3 bg-violet-50 border-t border-violet-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-violet-900 font-medium">
                {voice.transcript || "Listening..."}
              </p>
              <p className="text-[11px] text-violet-500">Tap the mic to send</p>
            </div>
            <button
              onClick={voice.stopListening}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 active:scale-95 transition"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Speaking indicator */}
      {voice.isSpeaking && !voice.isListening && (
        <div className="px-4 py-2 bg-violet-50 border-t border-violet-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-violet-400 rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
              <div className="w-1 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
              <div className="w-1 h-5 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="w-1 h-3 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: "50ms" }} />
            </div>
            <span className="text-[11px] text-violet-600">Speaking...</span>
          </div>
          <button
            onClick={voice.stopSpeaking}
            className="text-[11px] text-violet-500 hover:text-violet-700"
          >
            Stop
          </button>
        </div>
      )}

      {/* Input area — always visible (chat stays active for refinement after recs) */}
      {!voice.isListening && (
        <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-gray-100 safe-area-bottom">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={voice.enabled && voice.transcript && !input ? voice.transcript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voice.enabled ? "Tap mic or type..." : "Type your reply..."}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 text-[15px]"
            />
            {/* Mic button — shown when voice is supported */}
            {voice.isSupported && (
              <button
                type="button"
                onClick={() => {
                  if (voice.isSpeaking) voice.stopSpeaking();
                  voice.startListening();
                }}
                disabled={isLoading}
                className={`px-3 py-3 rounded-xl font-medium active:scale-95 transition min-w-[44px] min-h-[44px] ${
                  voice.enabled
                    ? "bg-violet-100 text-violet-600 hover:bg-violet-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                } disabled:opacity-30`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-30 active:scale-95 transition min-w-[44px] min-h-[44px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
        </form>
      )}

      {/* Purchase confirmation bottom sheet */}
      {purchaseModalProduct && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in">
          <div className="max-w-2xl mx-auto px-4 pb-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl px-5 py-4">
              <p className="text-[15px] font-medium text-gray-900 mb-1">Did you buy it?</p>
              <p className="text-sm text-gray-500 mb-4">
                {purchaseModalProduct.name} by {purchaseModalProduct.brand}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePurchaseConfirm(true)}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 active:scale-[0.98] transition"
                >
                  Yes, I bought it
                </button>
                <button
                  onClick={() => handlePurchaseConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 active:scale-[0.98] transition"
                >
                  Not yet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug context (collapsed) */}
      {Object.keys(context).length > 0 && (
        <details className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <summary className="text-[11px] text-gray-400 cursor-pointer">
            Debug context
          </summary>
          <pre className="text-[11px] text-gray-500 mt-2 overflow-auto max-h-40">
            {JSON.stringify(context, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
