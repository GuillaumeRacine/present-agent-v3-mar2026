"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  dropoff: number;
}

interface ConversionData {
  funnel: FunnelStage[];
  factors: {
    avgTurnsConverted: number;
    avgTurnsAbandoned: number;
    topPickSelectionRate: number;
    avgTimeToSelectMs: number;
    refinementRate: number;
    budgetComplianceRate: number;
  };
  recentSessions: {
    id: string;
    recipientName: string;
    status: string;
    turnCount: number;
    hasProduct: boolean;
    created: string;
  }[];
}

export default function ConversionDashboard() {
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/conversion")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Failed to load conversion data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Conversion Funnel</h1>
          <p className="text-sm text-gray-500">North Star: % of sessions ending in purchase</p>
        </div>
        <Link href="/admin/analytics" className="text-sm text-gray-500 hover:text-gray-700">
          Back to analytics
        </Link>
      </div>

      {/* Funnel visualization */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Session Funnel</h2>
        <div className="space-y-2">
          {data.funnel.map((stage, i) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <div className="w-40 text-sm text-gray-600 text-right">{stage.stage}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg transition-all ${
                    i === data.funnel.length - 1 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${stage.rate}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {stage.count} ({stage.rate.toFixed(0)}%)
                </span>
              </div>
              {stage.dropoff > 0 && (
                <span className="text-xs text-red-500 w-16">-{stage.dropoff.toFixed(0)}%</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conversion factors */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Avg turns (converted)", value: data.factors.avgTurnsConverted.toFixed(1), good: data.factors.avgTurnsConverted <= 3 },
          { label: "Avg turns (abandoned)", value: data.factors.avgTurnsAbandoned.toFixed(1), good: false },
          { label: "Top Pick selection", value: `${(data.factors.topPickSelectionRate * 100).toFixed(0)}%`, good: data.factors.topPickSelectionRate > 0.4 },
          { label: "Avg time to select", value: `${(data.factors.avgTimeToSelectMs / 1000).toFixed(0)}s`, good: data.factors.avgTimeToSelectMs < 30000 },
          { label: "Refinement rate", value: `${(data.factors.refinementRate * 100).toFixed(0)}%`, good: data.factors.refinementRate < 0.3 },
          { label: "Budget compliant", value: `${(data.factors.budgetComplianceRate * 100).toFixed(0)}%`, good: data.factors.budgetComplianceRate > 0.9 },
        ].map(({ label, value, good }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${good ? "text-green-700" : "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent sessions with conversion status */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Sessions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentSessions.map((s) => (
            <Link
              key={s.id}
              href={`/admin/sessions/${s.id}`}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition"
            >
              <span className={`w-2 h-2 rounded-full ${s.hasProduct ? "bg-green-500" : "bg-gray-300"}`} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{s.recipientName || "Unknown"}</span>
                <span className="text-xs text-gray-400 ml-2">{s.turnCount} turns</span>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                s.hasProduct ? "bg-green-100 text-green-700" :
                s.status === "completed" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {s.hasProduct ? "purchased" : s.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
