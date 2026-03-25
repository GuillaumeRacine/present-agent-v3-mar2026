"use client";

export interface GiftContext {
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

// ── Gift Profile Card (with Effort Reflection) ───────────────────
export function GiftProfileCard({ context, onGetRecommendations, isLoadingRecs, loadingProgress, onRefine }: { context: GiftContext; onGetRecommendations: () => void; isLoadingRecs: boolean; loadingProgress?: string | null; onRefine?: () => void }) {
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
                {loadingProgress || "Finding perfect gifts..."}
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
