"use client";

import type { CardContent } from "@/lib/cards";

const THEME_STYLES: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  warm_minimal: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", accent: "text-amber-600" },
  playful: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-900", accent: "text-pink-600" },
  elegant: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-900", accent: "text-gray-500" },
  bold: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", accent: "text-indigo-600" },
  nostalgic: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", accent: "text-orange-600" },
};

const TONE_LABELS: Record<string, string> = {
  heartfelt: "Heartfelt",
  funny: "Playful",
  understated: "Understated",
  celebratory: "Celebratory",
};

export default function CardPreview({
  card,
  recipientName,
}: {
  card: CardContent;
  recipientName?: string;
}) {
  const style = THEME_STYLES[card.designTheme] || THEME_STYLES.warm_minimal;

  return (
    <div className={`${style.bg} ${style.border} border rounded-2xl p-6 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${style.accent}`}>
          Gift card
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.bg} ${style.accent} border ${style.border}`}>
          {TONE_LABELS[card.toneMatch] || card.toneMatch}
        </span>
      </div>

      <p className={`text-lg leading-relaxed ${style.text} font-serif italic`}>
        &ldquo;{card.message}&rdquo;
      </p>

      {card.memoryRef && (
        <p className={`text-[11px] ${style.accent} mt-3`}>
          References: {card.memoryRef}
        </p>
      )}

      {recipientName && (
        <p className={`text-sm ${style.accent} mt-4 text-right`}>
          For {recipientName}
        </p>
      )}
    </div>
  );
}
