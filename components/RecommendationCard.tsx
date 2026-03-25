"use client";

import { useState } from "react";
import { sendFeedback } from "@/lib/feedback-client";
import { trackBuyLinkClicked } from "@/lib/posthog";

export interface RecommendationItem {
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

const SLOT_CONFIG = [
  { label: "Top pick", color: "bg-green-700 text-white", tag: "Best match" },
  { label: "Great match", color: "bg-blue-700 text-white", tag: "Most thoughtful" },
  { label: "Wild card", color: "bg-purple-600 text-white", tag: "Most surprising" },
];

// ── Recommendation Card (ChatGPT Shopping-inspired) ───────────────
// Compact by default, expands on tap to show full detail.
// Reactions visible at glance level to steer recommendations.
export function RecommendationCard({ rec, rank, recipientName, onSelected, onReaction, sessionId, onBuyLinkClicked, isExpanded, onToggleExpand }: {
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
