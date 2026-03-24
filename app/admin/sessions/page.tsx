"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Session {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  status: string;
  gift_context: string | null;
  selected_product_id: string | null;
  selected_product_data: string | null;
  card_content: string | null;
  recipient_feedback: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface SessionEvent {
  id: number;
  event_type: string;
  event_data: string | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function durationStr(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  ordered: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  abandoned: "bg-gray-100 text-gray-500",
};

const EVENT_COLORS: Record<string, string> = {
  "session.started": "text-blue-600",
  "session.completed": "text-green-600",
  "chat.message_sent": "text-gray-700",
  "chat.response_received": "text-gray-400",
  "chat.suggested_reply_used": "text-violet-600",
  "chat.voice_input": "text-orange-600",
  "recs.requested": "text-yellow-600",
  "recs.displayed": "text-yellow-700",
  "recs.product_selected": "text-green-700",
  "recs.card_reaction": "text-pink-600",
  "recs.refinement": "text-amber-600",
  "card.generated": "text-indigo-600",
  "delivery.marked_given": "text-emerald-700",
  "delivery.feedback_received": "text-teal-600",
  "voice.enabled": "text-orange-500",
};

export default function SessionsExplorer() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, SessionEvent[]>>({});
  const [statusFilter, setStatusFilter] = useState("");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/sessions?${params.toString()}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function loadEvents(sessionId: string) {
    if (events[sessionId]) return;
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/events`);
      const data = await res.json();
      setEvents((prev) => ({ ...prev, [sessionId]: data.events || [] }));
    } catch {
      setEvents((prev) => ({ ...prev, [sessionId]: [] }));
    }
  }

  function toggleExpand(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
    } else {
      setExpandedId(sessionId);
      loadEvents(sessionId);
    }
  }

  function parseContext(json: string | null): Record<string, unknown> | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Session Explorer</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="ordered">Ordered</option>
            <option value="delivered">Delivered</option>
          </select>
          <button
            onClick={fetchSessions}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">{sessions.length} sessions found</p>

      <div className="space-y-2">
        {loading && <p className="text-gray-400 py-8 text-center">Loading sessions...</p>}

        {!loading && sessions.length === 0 && (
          <p className="text-gray-400 py-8 text-center">No sessions yet. Share the app to start seeing data.</p>
        )}

        {sessions.map((s) => {
          const ctx = parseContext(s.gift_context);
          const recipientName = (ctx?.recipient as Record<string, string>)?.name || "—";
          const occasion = (ctx?.occasion as Record<string, string>)?.type || "";
          const relationship = (ctx?.recipient as Record<string, string>)?.relationship || "";
          const budget = (ctx?.gift as Record<string, string>)?.budget || "";
          const isExpanded = expandedId === s.id;

          return (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Session summary row */}
              <button
                onClick={() => toggleExpand(s.id)}
                className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-gray-50 transition"
              >
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-500"}`}>
                  {s.status}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{recipientName}</span>
                    {relationship && <span className="text-xs text-gray-400">({relationship})</span>}
                    {occasion && <span className="text-xs text-gray-400">{occasion}</span>}
                    {budget && <span className="text-xs text-gray-400">{budget}</span>}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {timeAgo(s.created_at)} &middot; Duration: {durationStr(s.created_at, s.completed_at || s.updated_at)}
                    {"message_count" in s && (s as unknown as Record<string, number>).message_count > 0 && <> &middot; {(s as unknown as Record<string, number>).message_count} messages</>}
                    {s.selected_product_id && <> &middot; Selected product</>}
                    {s.recipient_feedback && <> &middot; Has feedback</>}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4">
                  {/* Replay link */}
                  <Link
                    href={`/admin/sessions/${s.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    View full conversation
                  </Link>

                  {/* Context summary */}
                  {ctx && (
                    <div className="mb-4">
                      <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Gift Context</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {recipientName !== "—" && (
                          <div><span className="text-gray-400">Recipient:</span> {recipientName}</div>
                        )}
                        {relationship && (
                          <div><span className="text-gray-400">Relationship:</span> {relationship}</div>
                        )}
                        {occasion && (
                          <div><span className="text-gray-400">Occasion:</span> {occasion}</div>
                        )}
                        {budget && (
                          <div><span className="text-gray-400">Budget:</span> {budget}</div>
                        )}
                        {Array.isArray((ctx?.recipient as Record<string, unknown>)?.interests) && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Interests:</span>{" "}
                            {((ctx.recipient as Record<string, unknown>).interests as string[]).join(", ")}
                          </div>
                        )}
                        {(ctx?.gift as Record<string, string>)?.direction && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Direction:</span>{" "}
                            {(ctx.gift as Record<string, string>).direction}
                          </div>
                        )}
                        {(ctx?.gift as Record<string, string>)?.giverWantsToExpress && (
                          <div className="col-span-2">
                            <span className="text-gray-400">Giver wants to express:</span>{" "}
                            {(ctx.gift as Record<string, string>).giverWantsToExpress}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected product */}
                  {s.selected_product_data && (() => {
                    const product = parseContext(s.selected_product_data);
                    return product ? (
                      <div className="mb-4 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                        <h3 className="text-[10px] text-green-600 uppercase tracking-wider mb-1">Selected Product</h3>
                        <p className="text-sm font-medium">{(product as Record<string, string>).name} — ${(product as Record<string, number>).price}</p>
                      </div>
                    ) : null;
                  })()}

                  {/* Recipient feedback */}
                  {s.recipient_feedback && (
                    <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
                      <h3 className="text-[10px] text-blue-600 uppercase tracking-wider mb-1">Recipient Feedback</h3>
                      <p className="text-sm">{s.recipient_feedback}</p>
                    </div>
                  )}

                  {/* Event timeline */}
                  <div>
                    <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                      Event Timeline ({events[s.id]?.length || 0} events)
                    </h3>
                    {!events[s.id] && <p className="text-sm text-gray-400">Loading events...</p>}
                    {events[s.id]?.length === 0 && <p className="text-sm text-gray-400">No events recorded</p>}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {events[s.id]?.map((evt) => {
                        const data = evt.event_data ? (() => { try { return JSON.parse(evt.event_data); } catch { return null; } })() : null;
                        return (
                          <div key={evt.id} className="flex items-start gap-2 text-[12px]">
                            <span className="text-gray-300 whitespace-nowrap font-mono w-16 shrink-0">
                              {new Date(evt.created_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            <span className={`font-medium ${EVENT_COLORS[evt.event_type] || "text-gray-600"}`}>
                              {evt.event_type}
                            </span>
                            {data && (
                              <span className="text-gray-400 truncate">
                                {Object.entries(data)
                                  .filter(([, v]) => v !== null && v !== undefined)
                                  .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
                                  .join(" ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Raw JSON toggle */}
                  <details className="mt-3">
                    <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600">
                      Raw session data
                    </summary>
                    <pre className="mt-2 text-[10px] bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-48">
                      {JSON.stringify({ ...s, gift_context: ctx }, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
