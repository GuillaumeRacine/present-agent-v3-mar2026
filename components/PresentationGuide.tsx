"use client";

import type { PresentationGuide as PresentationGuideType } from "@/lib/cards";

const SECTIONS = [
  { key: "wrappingIdea" as const, label: "Wrapping", icon: "🎁" },
  { key: "timingAdvice" as const, label: "When", icon: "🕐" },
  { key: "settingAdvice" as const, label: "Where", icon: "📍" },
  { key: "whatToSay" as const, label: "What to say", icon: "💬" },
  { key: "pairingIdea" as const, label: "Pair with", icon: "✨" },
];

export default function PresentationGuide({
  guide,
}: {
  guide: PresentationGuideType;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-[13px] font-semibold text-gray-700">How to give it</h3>
        <p className="text-[11px] text-gray-400">Make the moment count</p>
      </div>
      <div className="divide-y divide-gray-50">
        {SECTIONS.map(({ key, label, icon }) => {
          const value = guide[key];
          if (!value) return null;
          return (
            <div key={key} className="px-5 py-3 flex gap-3">
              <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
                <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
