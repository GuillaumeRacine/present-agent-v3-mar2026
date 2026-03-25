"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  turn_number: number;
  phase: string | null;
  readiness: number | null;
  extracted_context: string | null;
  created_at: string;
}

interface Session {
  id: string;
  status: string;
  gift_context: string | null;
  selected_product_id: string | null;
  selected_product_data: string | null;
  card_content: string | null;
  presentation_guide: string | null;
  recipient_feedback: string | null;
  feedback_token: string | null;
  created_at: string;
  completed_at: string | null;
}

interface RecLog {
  recommendations: string;
  budget_stated: string;
  budget_compliant: number;
  category_diverse: number;
  duration_ms: number;
  created_at: string;
}

interface Recommendation {
  id: string;
  name: string;
  brand?: string;
  price: number;
  category: string;
  matchScore: number;
  whyThisFits: string;
  giftAngle?: string;
  whatThisSays?: string;
  usageSignal?: string;
  imageUrl?: string | null;
  description?: string | null;
  buyUrl?: string | null;
}

function safeJson<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

const SLOT_CONFIG = [
  { label: "Top pick", color: "bg-green-700 text-white", tag: "Best match", tagColor: "bg-green-50 text-green-700 border-green-200" },
  { label: "Great match", color: "bg-blue-700 text-white", tag: "Most thoughtful", tagColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Wild card", color: "bg-purple-100 text-purple-700", tag: "Most surprising", tagColor: "bg-purple-50 text-purple-700 border-purple-200" },
];
const CATEGORY_EMOJI: Record<string, string> = {
  practical: "🔧", experiential: "✨", consumable: "🍫",
  artisan: "🎨", wellness: "🧘", kids: "🧸",
};

export default function SessionReplay({ params }: { params: { sessionId: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [recLog, setRecLog] = useState<RecLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<{ event_type: string; event_data: string | null; created_at: string }[]>([]);

  useEffect(() => {
    fetch(`/api/admin/sessions/${params.sessionId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setMessages(data.messages || []);
          setSession(data.session || null);
          setRecLog(data.recLog || null);
          setEvents(data.events || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [params.sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <Link href="/admin/sessions" className="text-sm text-gray-500 hover:text-gray-700">
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  const context = safeJson<Record<string, unknown>>(session?.gift_context || null, {});
  const recipient = (context.recipient || {}) as Record<string, unknown>;
  const occasion = (context.occasion || {}) as Record<string, string>;
  const gift = (context.gift || {}) as Record<string, string>;
  const effortReflection = (context.effortReflection || []) as string[];
  const recommendations: Recommendation[] = recLog
    ? safeJson<Recommendation[]>(recLog.recommendations, [])
    : [];
  const selectedProduct = safeJson<Record<string, unknown> | null>(session?.selected_product_data || null, null);
  const cardContent = safeJson<Record<string, string> | null>(session?.card_content || null, null);
  const presentationGuide = safeJson<Record<string, string> | null>(session?.presentation_guide || null, null);

  // Deduplicate messages (same turn+role can appear twice)
  const dedupedMessages: Message[] = [];
  const seen = new Set<string>();
  for (const msg of messages) {
    const key = `${msg.turn_number}-${msg.role}-${msg.content.slice(0, 50)}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedMessages.push(msg);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin/sessions" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="font-semibold text-[15px]">
                {String(recipient.name || "Unknown")}
              </h1>
              {String(recipient.relationship || "") && (
                <span className="text-xs text-gray-400">({String(recipient.relationship)})</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 ml-7">
              {session?.status} &middot; {occasion.type || "?"} &middot; {gift.budget || "?"}
              &middot; {new Date(session?.created_at || "").toLocaleDateString()}
            </p>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
            session?.status === "ordered" ? "bg-green-100 text-green-700" :
            session?.status === "completed" ? "bg-blue-100 text-blue-700" :
            "bg-gray-100 text-gray-500"
          }`}>
            {session?.status}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Conversation replay */}
        <div className="px-4 py-4 space-y-3">
          {dedupedMessages.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No conversation messages recorded for this session.</p>
          )}

          {dedupedMessages.map((msg, i) => (
            <div key={i}>
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
              {/* Phase indicator for assistant messages */}
              {msg.role === "assistant" && msg.phase && (
                <div className="flex justify-start mt-0.5 ml-1">
                  <span className="text-[10px] text-gray-300">
                    phase: {msg.phase} &middot; readiness: {msg.readiness?.toFixed(1) ?? "?"}
                    &middot; turn {msg.turn_number + 1}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Gift Profile Card (if conversation completed) */}
        {(context.phase === "complete" || effortReflection.length > 0) && (
          <div className="px-4 pb-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                    {String(recipient.name || "?")[0]}
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">{String(recipient.name || "Someone special")}</h2>
                    {recipient.relationship ? <p className="text-white/70 text-sm">{String(recipient.relationship)}</p> : null}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* Effort reflection */}
                {effortReflection.length > 0 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Based on what you shared</div>
                    <ul className="space-y-1">
                      {effortReflection.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Context chips */}
                <div className="grid grid-cols-3 gap-2">
                  {occasion.type && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-[10px] text-gray-400 uppercase">Occasion</div>
                      <div className="font-medium text-sm">{occasion.type}</div>
                    </div>
                  )}
                  {gift.budget && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-[10px] text-gray-400 uppercase">Budget</div>
                      <div className="font-medium text-sm">{gift.budget}</div>
                    </div>
                  )}
                  {gift.direction && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-[10px] text-gray-400 uppercase">Direction</div>
                      <div className="font-medium text-sm">{gift.direction}</div>
                    </div>
                  )}
                </div>
                {/* Interests */}
                {Array.isArray(recipient.interests) && (recipient.interests as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(recipient.interests as string[]).map((interest, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
                {/* Giver expression */}
                {gift.giverWantsToExpress && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <div className="text-[10px] text-amber-600 uppercase mb-1">What this gift should say</div>
                    <div className="text-sm text-amber-900 italic">&ldquo;{gift.giverWantsToExpress}&rdquo;</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="px-4 pb-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide px-1">
              3 picks for {String(recipient.name || "them")}
              {recLog && (
                <span className="text-gray-300 ml-2">
                  ({recLog.duration_ms}ms &middot; budget: {recLog.budget_stated}
                  &middot; {recLog.budget_compliant ? "compliant" : "over budget"}
                  &middot; {recLog.category_diverse ? "diverse" : "dupes"})
                </span>
              )}
            </p>
            {recommendations.map((rec, i) => {
              const isSelected = selectedProduct && (selectedProduct as Record<string, unknown>).id === rec.id;
              const buyDomain = (() => {
                try { return new URL(String(rec.buyUrl || "")).hostname.replace("www.", ""); } catch { return rec.brand || ""; }
              })();
              const hasRealImage = rec.imageUrl && rec.imageUrl.startsWith("http");
              const slot = SLOT_CONFIG[i] || SLOT_CONFIG[0];
              const isTopPick = i === 0;
              const matchPct = Math.round(rec.matchScore * 100);
              return (
                <div
                  key={rec.id}
                  className={`bg-white rounded-2xl border overflow-hidden ${
                    isSelected ? "border-green-400 ring-2 ring-green-100" :
                    isTopPick ? "border-green-300 shadow-md ring-1 ring-green-100" :
                    "border-gray-200"
                  }`}
                >
                  {/* Clickable product area */}
                  <a href={rec.buyUrl || "#"} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition">
                  {/* Hero image */}
                  <div className={`relative w-full bg-gray-50 ${hasRealImage ? "aspect-square" : "h-36"}`}>
                    {hasRealImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={rec.imageUrl!} alt={rec.name} className="w-full h-full object-contain p-6"
                          onError={(e) => { const p = (e.target as HTMLImageElement).parentElement!; p.classList.remove("aspect-square"); p.classList.add("h-36"); (e.target as HTMLImageElement).style.display = "none"; }} />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                        <span className="text-5xl opacity-60">🎁</span>
                      </div>
                    )}
                    {/* Overlays */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${slot.color}`}>
                        {slot.label}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${slot.tagColor}`}>
                        {slot.tag}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-white font-semibold shadow-sm">SELECTED</span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                        matchPct >= 85 ? "bg-green-500/90 text-white" :
                        matchPct >= 70 ? "bg-blue-500/90 text-white" :
                        "bg-white/90 text-gray-600"
                      }`}>
                        {matchPct}% match
                      </span>
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="px-5 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base leading-tight">{rec.name}</h3>
                        <p className="text-[13px] text-gray-400 mt-0.5">{rec.brand || ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xl font-bold">${rec.price}</span>
                        {buyDomain && <p className="text-[10px] text-gray-400">{buyDomain}</p>}
                      </div>
                    </div>
                    {rec.description && (
                      <p className="text-[13px] text-gray-500 mt-2 leading-relaxed line-clamp-2">{rec.description}</p>
                    )}
                    {rec.buyUrl && rec.buyUrl.startsWith("http") && (
                      <p className="text-[11px] text-blue-500 mt-2 flex items-center gap-1">
                        View product
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </p>
                    )}
                  </div>
                  </a>

                  {/* Personalized context -- merged */}
                  <div className="px-5 pt-1 pb-3">
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-3">
                      <div className="text-[10px] text-blue-600 font-medium uppercase tracking-wider mb-1">Why {String(recipient.name || "they")} will love this</div>
                      <p className="text-[13px] text-blue-900 leading-snug">{rec.whyThisFits}</p>
                      {rec.whatThisSays && (
                        <p className="text-[13px] text-violet-700 italic mt-2 pt-2 border-t border-blue-100/50">{rec.whatThisSays.replace(/^This says:\s*/i, "\"").replace(/([^"])$/, "$1\"")}</p>
                      )}
                    </div>
                    {rec.usageSignal && (
                      <div className="flex items-center gap-1.5 mt-2 px-1">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[11px] text-gray-500">{rec.usageSignal}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card message (if generated) */}
        {cardContent && (
          <div className="px-4 pb-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-violet-50 px-5 py-3">
                <div className="text-[10px] text-violet-500 uppercase tracking-wider">Card message</div>
              </div>
              <div className="px-5 py-4">
                <p className="text-[15px] text-gray-800 italic leading-relaxed">
                  &ldquo;{cardContent.message}&rdquo;
                </p>
                {cardContent.designTheme && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    Theme: {cardContent.designTheme} &middot; Tone: {cardContent.toneMatch}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Presentation guide (if generated) */}
        {presentationGuide && (
          <div className="px-4 pb-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 space-y-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Presentation guide</div>
              {presentationGuide.wrappingIdea && (
                <div><span className="text-xs text-gray-500">Wrapping:</span> <span className="text-sm">{presentationGuide.wrappingIdea}</span></div>
              )}
              {presentationGuide.timingAdvice && (
                <div><span className="text-xs text-gray-500">Timing:</span> <span className="text-sm">{presentationGuide.timingAdvice}</span></div>
              )}
              {presentationGuide.whatToSay && (
                <div><span className="text-xs text-gray-500">What to say:</span> <span className="text-sm">{presentationGuide.whatToSay}</span></div>
              )}
              {presentationGuide.pairingIdea && (
                <div><span className="text-xs text-gray-500">Pairing idea:</span> <span className="text-sm">{presentationGuide.pairingIdea}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Decision Journey — full timeline of what happened */}
        {events.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-900 text-white px-5 py-3">
                <div className="text-[10px] uppercase tracking-wider font-medium">Decision Journey</div>
                <p className="text-[11px] text-gray-400 mt-0.5">{events.length} actions tracked</p>
              </div>
              <div className="px-5 py-4">
                {/* Visual timeline */}
                <div className="space-y-0">
                  {events.map((evt, i) => {
                    const data = evt.event_data ? (() => { try { return JSON.parse(evt.event_data); } catch { return null; } })() : null;
                    const time = new Date(evt.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

                    // Map event types to readable labels + icons
                    const EVENT_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
                      "session.started": { icon: "🟢", label: "Session started", color: "text-green-700" },
                      "session.completed": { icon: "✅", label: "Profile complete — ready for recommendations", color: "text-green-700" },
                      "chat.message_sent": { icon: "💬", label: `User sent message (${data?.inputLength || "?"} chars, turn ${(data?.turnCount || 0) + 1})`, color: "text-gray-700" },
                      "chat.response_received": { icon: "🤖", label: `AI responded — phase: ${data?.phase || "?"}, readiness: ${data?.readiness ?? "?"}`, color: "text-gray-500" },
                      "recs.requested": { icon: "🔍", label: `Recommendations requested${data?.recipientName ? ` for ${data.recipientName}` : ""}`, color: "text-blue-700" },
                      "recs.displayed": { icon: "🎁", label: `3 products shown: ${(data?.productIds || []).length} options`, color: "text-blue-700" },
                      "card.generated": { icon: "💌", label: `Card generated — ${data?.designTheme || "custom"} theme, ${data?.toneMatch || "?"} tone`, color: "text-violet-700" },
                      "recs.card_reaction": { icon: data?.reaction === "relevant" ? "👍" : data?.reaction === "irrelevant" ? "👎" : "💰", label: `Reacted "${data?.reaction}" to product`, color: data?.reaction === "relevant" ? "text-green-700" : data?.reaction === "irrelevant" ? "text-red-600" : "text-amber-600" },
                      "gift.marked_as_purchased": { icon: "🛒", label: "Marked as purchased", color: "text-green-700" },
                      "delivery.feedback_link_created": { icon: "🔗", label: "Feedback link generated", color: "text-violet-700" },
                      "delivery.marked_given": { icon: "🎉", label: "Gift marked as given", color: "text-emerald-700" },
                      "delivery.feedback_received": { icon: "💝", label: "Recipient feedback received", color: "text-pink-700" },
                    };

                    const display = EVENT_DISPLAY[evt.event_type] || { icon: "•", label: evt.event_type, color: "text-gray-500" };
                    const isLast = i === events.length - 1;

                    return (
                      <div key={i} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <span className="text-sm leading-none">{display.icon}</span>
                          {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
                        </div>
                        {/* Event content */}
                        <div className="pb-3 flex-1 min-w-0">
                          <p className={`text-[13px] font-medium ${display.color}`}>{display.label}</p>
                          <p className="text-[10px] text-gray-400">{time}</p>
                          {/* Show product IDs for recs.displayed */}
                          {evt.event_type === "recs.displayed" && data?.productIds && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(data.productIds as string[]).map((pid: string, j: number) => (
                                <span key={j} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {["Top pick", "Great match", "Wild card"][j]}: {pid.split("-").slice(0, 3).join("-")}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary stats */}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{events.filter(e => e.event_type === "chat.message_sent").length}</p>
                    <p className="text-[10px] text-gray-400">Messages</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{events.filter(e => e.event_type === "recs.displayed").length > 0 ? "Yes" : "No"}</p>
                    <p className="text-[10px] text-gray-400">Saw recs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selectedProduct ? "Yes" : "No"}</p>
                    <p className="text-[10px] text-gray-400">Chose gift</p>
                  </div>
                </div>

                {/* Final outcome */}
                <div className={`mt-3 px-4 py-2.5 rounded-xl text-center text-sm font-medium ${
                  selectedProduct ? "bg-green-50 text-green-700" :
                  session?.status === "completed" ? "bg-blue-50 text-blue-700" :
                  "bg-gray-50 text-gray-500"
                }`}>
                  {selectedProduct
                    ? `Selected: ${(selectedProduct as Record<string, unknown>).name} ($${(selectedProduct as Record<string, unknown>).price})`
                    : session?.status === "completed"
                      ? "Conversation completed but no product selected"
                      : "Session still active"
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session metadata */}
        <div className="px-4 pb-8">
          <details>
            <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600">
              Session metadata
            </summary>
            <div className="mt-2 bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-1 text-[11px] text-gray-500">
              <div>Session ID: <span className="font-mono text-gray-700">{params.sessionId}</span></div>
              <div>Created: {session?.created_at}</div>
              <div>Completed: {session?.completed_at || "—"}</div>
              <div>Status: {session?.status}</div>
              <div>Messages: {dedupedMessages.length}</div>
              {session?.feedback_token && <div>Feedback token: {session.feedback_token}</div>}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
