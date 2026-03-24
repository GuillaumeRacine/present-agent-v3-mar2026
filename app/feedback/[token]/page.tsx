"use client";

import { useState, useEffect } from "react";

interface FeedbackData {
  sessionId: string;
  recipientName: string | null;
  productName: string | null;
  productImage: string | null;
}

const REACTIONS = [
  { value: "loved_it", emoji: "😍", label: "Loved it!" },
  { value: "liked_it", emoji: "😊", label: "Liked it" },
  { value: "meh", emoji: "😐", label: "It was okay" },
  { value: "returned", emoji: "🔄", label: "Not for me" },
];

export default function FeedbackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/feedback/recipient/${params.token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid link");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleSubmit() {
    if (!selectedReaction) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/feedback/recipient/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: selectedReaction, note: note || undefined }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch (err) {
      setError(String(err));
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🎁</p>
          <h1 className="text-xl font-semibold mb-2">Link expired</h1>
          <p className="text-sm text-gray-500">
            This feedback link is no longer valid. It may have already been used.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🙏</p>
          <h1 className="text-xl font-semibold mb-2">Thanks for the feedback!</h1>
          <p className="text-sm text-gray-500">
            This helps make future gifts even better.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🎁</p>
          <h1 className="text-xl font-semibold">
            How was your gift?
          </h1>
          {data.productName && (
            <p className="text-sm text-gray-500 mt-1">{data.productName}</p>
          )}
        </div>

        {/* Reaction buttons */}
        <div className="grid grid-cols-2 gap-3">
          {REACTIONS.map(({ value, emoji, label }) => (
            <button
              key={value}
              onClick={() => setSelectedReaction(value)}
              className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all ${
                selectedReaction === value
                  ? "border-black bg-white shadow-sm scale-[1.02]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>

        {/* Optional note */}
        {selectedReaction && (
          <div className="animate-in">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Want to add a note? (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedReaction || submitting}
          className="w-full py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-30 active:scale-[0.98] transition"
        >
          {submitting ? "Sending..." : "Submit"}
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          Your feedback is anonymous and only used to improve gift suggestions.
        </p>
      </div>
    </div>
  );
}
