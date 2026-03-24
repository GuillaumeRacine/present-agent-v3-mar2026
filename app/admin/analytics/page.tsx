"use client";

import { useState, useEffect } from "react";

interface Analytics {
  funnel: { started: number; completed: number; ordered: number; delivered: number; feedbackReceived: number };
  conversation: { avgTurns: number; voiceAdoptionRate: number; totalSessions: number };
  recommendations: { selectionRate: number; refinementRate: number; displayed: number; selected: number };
  satisfaction: { total: number; lovedIt: number; likedIt: number; meh: number; returned: number };
  timeToGift: { avgMs: number; p50Ms: number; p95Ms: number; count: number };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function msToMin(ms: number): string {
  if (ms === 0) return "—";
  const mins = Math.round(ms / 60000);
  return mins < 1 ? "<1m" : `${mins}m`;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="p-8 text-gray-500">Failed to load analytics.</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Funnel */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Session Funnel</h2>
      <div className="grid grid-cols-5 gap-3 mb-8">
        <StatCard label="Started" value={data.funnel.started} />
        <StatCard label="Completed" value={data.funnel.completed} sub={data.funnel.started > 0 ? pct(data.funnel.completed / data.funnel.started) : "—"} />
        <StatCard label="Ordered" value={data.funnel.ordered} sub={data.funnel.completed > 0 ? pct(data.funnel.ordered / data.funnel.completed) : "—"} />
        <StatCard label="Delivered" value={data.funnel.delivered} />
        <StatCard label="Feedback" value={data.funnel.feedbackReceived} />
      </div>

      {/* Conversation */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversation</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Avg turns" value={data.conversation.avgTurns} />
        <StatCard label="Voice adoption" value={pct(data.conversation.voiceAdoptionRate)} />
        <StatCard label="Total sessions" value={data.conversation.totalSessions} />
      </div>

      {/* Recommendations */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommendations</h2>
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Selection rate" value={pct(data.recommendations.selectionRate)} />
        <StatCard label="Refinement rate" value={pct(data.recommendations.refinementRate)} />
        <StatCard label="Displayed" value={data.recommendations.displayed} />
        <StatCard label="Selected" value={data.recommendations.selected} />
      </div>

      {/* Satisfaction */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recipient Satisfaction</h2>
      <div className="grid grid-cols-5 gap-3 mb-8">
        <StatCard label="Total ratings" value={data.satisfaction.total} />
        <StatCard label="Loved it" value={pct(data.satisfaction.lovedIt)} />
        <StatCard label="Liked it" value={pct(data.satisfaction.likedIt)} />
        <StatCard label="Meh" value={pct(data.satisfaction.meh)} />
        <StatCard label="Returned" value={pct(data.satisfaction.returned)} />
      </div>

      {/* Time to Gift */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Time to Gift</h2>
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Avg" value={msToMin(data.timeToGift.avgMs)} />
        <StatCard label="Median" value={msToMin(data.timeToGift.p50Ms)} />
        <StatCard label="p95" value={msToMin(data.timeToGift.p95Ms)} />
        <StatCard label="Completed" value={data.timeToGift.count} />
      </div>
    </div>
  );
}
