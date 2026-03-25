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

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface GiftContext {
  recipient?: {
    name?: string;
    relationship?: string;
    closeness?: string;
    interests?: string[];
    personality?: Record<string, unknown>;
    wishes?: string[];
    avoids?: string[];
  };
  occasion?: {
    type?: string;
    date?: string;
    significance?: string;
  };
  gift?: {
    budget?: string;
    from?: string;
    direction?: string;
    giverWantsToExpress?: string;
  };
  pastGifts?: {
    worked?: string[];
    failed?: string[];
  };
  effortReflection?: string[];
  giftNote?: string;
  suggestedReplies?: string[];
  phase?: string;
  readiness?: number;
}

interface RecommendationItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  description: string;
  imageUrl: string | null;
  buyUrl: string;
  matchScore: number;
  whyThisFits: string;
  giftAngle: string;
  whatThisSays: string;
  usageSignal: string;
}

// ── Recommendation Card (ChatGPT Shopping-inspired) ───────────────
// Compact by default, expands on tap to show full detail.
// Reactions visible at glance level to steer recommendations.
function RecommendationCard({ rec, rank, recipientName, onSelected, onReaction, sessionId, onBuyLinkClicked, isExpanded, onToggleExpand }: {
  rec: RecommendationItem;
  rank: number;
  recipientName?: string;
  onSelected?: (productId: string, slot: number) => void;
  onReaction?: (productId: string, reaction: string) => void;
  sessionId?: string;
  onBuyLinkClicked?: (rec: RecommendationItem) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const SLOT_CONFIG = [
    { label: "Top pick", color: "bg-green-700 text-white", tag: "Best match" },
    { label: "Great match", color: "bg-blue-700 text-white", tag: "Most thoughtful" },
    { label: "Wild card", color: "bg-purple-600 text-white", tag: "Most surprising" },
  ];
  const slot = SLOT_CONFIG[rank] || SLOT_CONFIG[0];
  const isTopPick = rank === 0;
  const matchPct = Math.round(rec.matchScore * 100);

  const buyDomain = (() => {
    try { return new URL(rec.buyUrl).hostname.replace("www.", ""); } catch { return rec.brand; }
  })();

  function handleChoose() {
    setConfirmed(true);
    onSelected?.(rec.id, rank);
  }

  function handleReaction(type: string) {
    setReaction(type);
    onReaction?.(rec.id, type);
    if (sessionId) {
      sendFeedback("card_reaction", sessionId, { productId: rec.id, reaction: type });
    }
  }

  const hasImage = rec.imageUrl && rec.imageUrl.startsWith("http");

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${
      isTopPick && !isExpanded ? "border-green-300 shadow-md" :
      isExpanded ? "border-black shadow-lg" :
      "border-gray-200 shadow-sm"
    }`}>
      {/* ── COMPACT VIEW (always visible) ── */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left"
      >
        <div className="flex gap-3 p-3">
          {/* Product image */}
          <div className="w-[88px] h-[88px] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rec.imageUrl!} alt={rec.name} className="w-full h-full object-contain p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">🎁</span></div>
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${slot.color}`}>
                {slot.label}
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                matchPct >= 85 ? "bg-green-100 text-green-700" :
                matchPct >= 70 ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {matchPct}%
              </span>
            </div>
            <h3 className="font-semibold text-[14px] leading-tight line-clamp-2">{rec.name}</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">{rec.brand}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[16px] font-bold">${rec.price}</span>
              <span className="text-[10px] text-gray-400">{slot.tag}</span>
            </div>
          </div>

          {/* Expand chevron */}
          <div className="flex items-center pl-1">
            <svg className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Compact reactions — always visible for quick feedback */}
        <div className="flex items-center gap-1 px-3 pb-2" onClick={(e) => e.stopPropagation()}>
          {!reaction ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleReaction("relevant"); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                Good
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleReaction("irrelevant"); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                Not for {recipientName ? recipientName.split(" ")[0] : "them"}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleReaction("too_expensive"); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition">
                $$$
              </button>
            </>
          ) : (
            <span className={`text-[11px] px-2.5 py-1 rounded-full ${
              reaction === "relevant" ? "bg-green-50 text-green-600" :
              reaction === "irrelevant" ? "bg-red-50 text-red-500" :
              "bg-amber-50 text-amber-600"
            }`}>
              {reaction === "relevant" ? "Great match" : reaction === "irrelevant" ? "Not a fit" : "Too pricey"}
            </span>
          )}
        </div>
      </button>

      {/* ── EXPANDED VIEW (on tap) ── */}
      {isExpanded && (
        <div className="border-t border-gray-100 animate-in">
          {/* Larger product image */}
          {hasImage && (
            <a href={rec.buyUrl} target="_blank" rel="noopener noreferrer" className="block">
              <div className="w-full aspect-[4/3] bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rec.imageUrl!} alt={rec.name} className="w-full h-full object-contain p-6" />
              </div>
            </a>
          )}

          {/* Description + buy link */}
          <div className="px-4 pt-3 pb-2">
            {rec.description && (
              <p className="text-[13px] text-gray-500 leading-relaxed">{rec.description}</p>
            )}
            <a href={rec.buyUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => { if (sessionId) trackBuyLinkClicked(sessionId, rec.id, rec.price, rec.buyUrl); onBuyLinkClicked?.(rec); }}
              className="inline-flex items-center gap-1 text-[12px] text-blue-500 mt-2 hover:text-blue-700">
              View on {buyDomain}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Personalized context */}
          <div className="px-4 pb-2">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-3">
              <div className="text-[10px] text-blue-600 font-medium uppercase tracking-wider mb-1">Why {recipientName || "they"} will love this</div>
              <p className="text-[13px] text-blue-900 leading-snug">{rec.whyThisFits}</p>
              {rec.whatThisSays && (
                <p className="text-[13px] text-violet-700 italic mt-2 pt-2 border-t border-blue-100/50">
                  {rec.whatThisSays.replace(/^This says:\s*/i, "\u201c").replace(/([^\u201d])$/, "$1\u201d")}
                </p>
              )}
            </div>
            {rec.usageSignal && (
              <div className="flex items-center gap-1.5 mt-2 px-1">
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] text-gray-500">{rec.usageSignal}</span>
              </div>
            )}
          </div>

          {/* How to give it */}
          <div className="px-4 pb-2">
            <details>
              <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600 py-1">How to give it</summary>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mt-1">
                <p className="text-[13px] text-amber-900">{rec.giftAngle}</p>
              </div>
            </details>
          </div>

          {/* CTA */}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChoose(); }}
              className={`w-full py-3.5 rounded-xl font-medium text-[15px] active:scale-[0.98] transition-all ${
                confirmed ? "bg-green-600 text-white" : isTopPick ? "bg-green-700 text-white hover:bg-green-800" : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {confirmed ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Selected
                </span>
              ) : (
                `Choose this for ${recipientName || "them"}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gift Profile Card (with Effort Reflection) ───────────────────
function GiftProfileCard({ context, onGetRecommendations, isLoadingRecs, onRefine }: { context: GiftContext; onGetRecommendations: () => void; isLoadingRecs: boolean; onRefine?: () => void }) {
  const r = context.recipient || {};
  const o = context.occasion || {};
  const g = context.gift || {};
  const p = context.pastGifts || {};
  const effortReflection = context.effortReflection || [];
  const giftNote = context.giftNote;

  return (
    <div className="my-4 bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden animate-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
            {r.name?.[0] || "?"}
          </div>
          <div>
            <h2 className="font-semibold text-lg">{r.name || "Someone special"}</h2>
            {r.relationship && (
              <p className="text-white/70 text-sm">{r.relationship}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Effort reflection — make the user's investment visible (Fu et al. 2024) */}
        {effortReflection.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Based on what you shared</div>
            <ul className="space-y-1">
              {effortReflection.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-2 italic">This isn&apos;t a random suggestion — it&apos;s built from what you know about {r.name || "them"}.</p>
          </div>
        )}

        {/* From + Occasion + Budget row */}
        <div className="grid grid-cols-3 gap-2">
          {g.from && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">From</div>
              <div className="font-medium text-sm mt-0.5">{g.from}</div>
            </div>
          )}
          {o.type && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Occasion</div>
              <div className="font-medium text-sm mt-0.5">{o.type}</div>
              {o.date && <div className="text-xs text-gray-400">{o.date}</div>}
            </div>
          )}
          {g.budget && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Budget</div>
              <div className="font-medium text-sm mt-0.5">{g.budget}</div>
            </div>
          )}
        </div>

        {/* Interests as chips */}
        {r.interests && r.interests.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Interests</div>
            <div className="flex flex-wrap gap-1.5">
              {r.interests.map((interest, i) => (
                <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* What the gift should express */}
        {g.giverWantsToExpress && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <div className="text-[10px] text-amber-600 uppercase tracking-wider mb-1">What this gift should say</div>
            <div className="text-sm text-amber-900 italic">&ldquo;{g.giverWantsToExpress}&rdquo;</div>
          </div>
        )}

        {/* Direction */}
        {g.direction && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <div className="text-[10px] text-green-600 uppercase tracking-wider mb-1">Gift direction</div>
            <div className="text-sm text-green-900 font-medium">{g.direction}</div>
          </div>
        )}

        {/* Gift note suggestion */}
        {giftNote && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
            <div className="text-[10px] text-violet-500 uppercase tracking-wider mb-1">Suggested gift note</div>
            <div className="text-sm text-violet-900 italic">&ldquo;{giftNote}&rdquo;</div>
            <div className="text-[10px] text-violet-400 mt-1">Written from your words — copy and include with the gift</div>
          </div>
        )}

        {/* Past gifts if any */}
        {p.worked && p.worked.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Past hits</div>
            <div className="text-sm text-gray-600">{p.worked.join(", ")}</div>
          </div>
        )}

        {/* Avoids */}
        {r.avoids && r.avoids.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Avoid</div>
            <div className="flex flex-wrap gap-1.5">
              {r.avoids.map((avoid, i) => (
                <span key={i} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs">
                  {avoid}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-2 space-y-2">
          <button
            onClick={onGetRecommendations}
            disabled={isLoadingRecs}
            className="w-full px-4 py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition text-[15px] disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoadingRecs ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding perfect gifts...
              </span>
            ) : (
              "Get 3 Recommendations"
            )}
          </button>
          <button
            onClick={onRefine}
            className="w-full px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition"
          >
            Refine profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feedback Helper ────────────────────────────────────────────────
function sendFeedback(type: string, sessionId: string, data: Record<string, unknown>) {
  fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId, data }),
  }).catch(() => {}); // Fire and forget
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
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, userId, sessionId: dbSessionId || sessionIdRef.current, recipientId }),
      });
      const data = await res.json();
      if (data.error) {
        setRecsError(true);
        setIsLoadingRecs(false);
        return;
      }
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
      {(!isComplete || conversationResumed) && !isLoading && context.suggestedReplies && context.suggestedReplies.length > 0 && (
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

      {/* Input area — pinned to bottom / thumb zone */}
      {(!isComplete || conversationResumed) && !voice.isListening && (
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
