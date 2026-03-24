"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CardPreview from "@/components/CardPreview";
import CardEditor from "@/components/CardEditor";
import PresentationGuide from "@/components/PresentationGuide";
import type { CardContent, PresentationGuide as PresentationGuideType } from "@/lib/cards";

type Step = "card" | "presentation" | "summary";

export default function CardPage({ params }: { params: { sessionId: string } }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("card");
  const [card, setCard] = useState<CardContent | null>(null);
  const [presentation, setPresentation] = useState<PresentationGuideType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingSlow, setLoadingSlow] = useState(false);

  // Parse product and context from search params (passed from gift session page)
  const productJson = searchParams.get("product");
  const contextJson = searchParams.get("context");
  const recipientId = searchParams.get("recipientId");
  const userId = searchParams.get("userId");

  const product = productJson ? JSON.parse(decodeURIComponent(productJson)) : null;
  const context = contextJson ? JSON.parse(decodeURIComponent(contextJson)) : {};
  const recipientName = context?.recipient?.name;

  useEffect(() => {
    if (!product) {
      setError("No product selected");
      setLoading(false);
      return;
    }

    // Show slow-loading message after 8 seconds
    const slowTimer = setTimeout(() => setLoadingSlow(true), 8000);

    fetch("/api/cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context,
        recipientId,
        product,
        sessionId: params.sessionId,
        userId,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCard(data.card);
          setPresentation(data.presentation);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Card generation failed. Please go back and try again.");
        setLoading(false);
      })
      .finally(() => clearTimeout(slowTimer));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Crafting your card...</p>
          {loadingSlow && (
            <p className="text-xs text-gray-400 mt-2">Taking a bit longer than usual. Almost there...</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition"
            >
              Try again
            </button>
            <a href={`/gift/${params.sessionId}`} className="block w-full py-2 text-sm text-gray-500 hover:text-gray-700">
              Back to recommendations
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1.5">
          {(["card", "presentation", "summary"] as Step[]).map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  s === step ? "bg-black w-1/2" : i < ["card", "presentation", "summary"].indexOf(step) ? "bg-green-500 w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {step === "card" ? "Your card" : step === "presentation" ? "How to give it" : "All set"}
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Step 1: Card preview + edit */}
        {step === "card" && card && (
          <>
            <div className="text-center mb-2">
              <h2 className="font-semibold text-lg">Your card for {recipientName || "them"}</h2>
              <p className="text-xs text-gray-400">Review and edit the message</p>
            </div>
            <CardPreview card={card} recipientName={recipientName} />
            <CardEditor card={card} onSave={setCard} />
            <button
              onClick={() => setStep("presentation")}
              className="w-full py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 active:scale-[0.98] transition"
            >
              Looks good — next
            </button>
          </>
        )}

        {/* Step 2: Presentation guide */}
        {step === "presentation" && presentation && (
          <>
            <div className="text-center mb-2">
              <h2 className="font-semibold text-lg">How to give it</h2>
              <p className="text-xs text-gray-400">Tips for the perfect moment</p>
            </div>
            <PresentationGuide guide={presentation} />
            <button
              onClick={() => setStep("summary")}
              className="w-full py-3.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 active:scale-[0.98] transition"
            >
              Got it — show summary
            </button>
            <button
              onClick={() => setStep("card")}
              className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
            >
              Back to card
            </button>
          </>
        )}

        {/* Step 3: Summary + Purchase */}
        {step === "summary" && card && product && !purchased && (
          <>
            <div className="text-center mb-2">
              <h2 className="font-semibold text-lg">Ready to go</h2>
              <p className="text-xs text-gray-400">Everything you need for {recipientName || "them"}</p>
            </div>

            {/* Product summary */}
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-gray-400">{product.brand} &middot; ${product.price}</p>
            </div>

            {/* Card summary */}
            <CardPreview card={card} recipientName={recipientName} />

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <a
                href={product.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3.5 bg-black text-white rounded-xl font-medium text-center hover:bg-gray-800 active:scale-[0.98] transition"
              >
                Buy this gift — ${product.price}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(card.message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
              >
                {copied ? "Copied!" : "Copy card message"}
              </button>
              <button
                onClick={async () => {
                  setPurchased(true);
                  // Persist purchase to API
                  try {
                    await fetch(`/api/sessions/${params.sessionId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        selected_product_id: product.id,
                        selected_product_data: product,
                        card_content: card,
                        status: "ordered",
                      }),
                    });
                  } catch { /* non-critical */ }
                }}
                className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition"
              >
                I already bought it
              </button>
              <a
                href={`/gift/${params.sessionId}`}
                className="block w-full py-2 text-gray-400 text-sm text-center hover:text-gray-600 transition"
              >
                Back to options
              </a>
            </div>
          </>
        )}

        {/* Step 4: Post-Purchase Confirmation */}
        {purchased && card && product && (
          <>
            <div className="text-center mb-4">
              <p className="text-4xl mb-2">🎉</p>
              <h2 className="font-semibold text-lg">
                {recipientName ? `Great gift for ${recipientName}!` : "Great gift choice!"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {product.name} by {product.brand}
              </p>
            </div>

            {/* Card message to include */}
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Your card message</div>
              <p className="text-sm text-gray-700 italic">&ldquo;{card.message}&rdquo;</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(card.message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition"
              >
                {copied ? "Copied!" : "Copy message"}
              </button>
            </div>

            {/* Get feedback link */}
            {!feedbackLink && (
              <button
                onClick={async () => {
                  try {
                    // Save product to session + create feedback token
                    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                      .map(b => b.toString(16).padStart(2, "0")).join("");
                    await fetch(`/api/sessions/${params.sessionId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        selected_product_id: product.id,
                        selected_product_data: product,
                        card_content: card,
                        feedback_token: token,
                        status: "ordered",
                      }),
                    });
                    setFeedbackLink(`${window.location.origin}/feedback/${token}`);
                  } catch {
                    // Non-critical
                  }
                }}
                className="w-full py-3 bg-violet-50 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-100 transition border border-violet-100"
              >
                Get a feedback link to share with {recipientName || "them"}
              </button>
            )}

            {feedbackLink && (
              <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4">
                <div className="text-[10px] text-violet-500 uppercase tracking-wider mb-2">Feedback link</div>
                <p className="text-xs text-violet-700 mb-2">
                  After you give the gift, send this link to {recipientName || "them"} so they can share their reaction:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedbackLink}
                    readOnly
                    className="flex-1 text-xs px-3 py-2 bg-white border border-violet-200 rounded-lg text-violet-900"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(feedbackLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <a
              href="/"
              className="block w-full py-3 bg-black text-white rounded-xl font-medium text-center hover:bg-gray-800 active:scale-[0.98] transition mt-2"
            >
              Find another gift
            </a>
          </>
        )}
      </div>
    </div>
  );
}
