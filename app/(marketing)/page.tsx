"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trackLandingCTA, trackWaitlistSignup } from "@/lib/posthog";
import posthog from "posthog-js";

// ── Scroll depth tracker ───────────────────────────────────────────
function useScrollDepth() {
  const tracked = useRef(new Set<number>());

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !tracked.current.has(threshold)) {
          tracked.current.add(threshold);
          posthog.capture("landing_scroll_depth", { depth: threshold });
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

// ── Steps data ─────────────────────────────────────────────────────
const steps = [
  {
    num: "1",
    title: "Tell us about them",
    desc: "A quick, guided conversation. No browsing required.",
    icon: (
      <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
  },
  {
    num: "2",
    title: "See 3 perfect options",
    desc: "Not 3,000. Just three, chosen for this person.",
    icon: (
      <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    num: "3",
    title: "We explain why each works",
    desc: "Real reasoning, not generic reviews. Buy with confidence.",
    icon: (
      <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
      </svg>
    ),
  },
];

// ── Main Page Component ────────────────────────────────────────────
export default function LandingPage() {
  useScrollDepth();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      trackWaitlistSignup(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-2xl mx-auto text-center animate-in">

          {/* Trust chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full bg-black/5 text-sm font-medium text-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Built for ADHD brains
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-5">
            Stop second-guessing<br className="hidden sm:block" /> every gift
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
            AI-powered gift confidence<br className="sm:hidden" /> for ADHD brains
          </p>

          <Link
            href="/gift/new"
            onClick={() => trackLandingCTA("anxiety", "hero_cta")}
            className="inline-flex items-center justify-center px-8 py-4 bg-black text-white text-lg font-medium rounded-2xl hover:bg-gray-800 active:scale-[0.98] transition-all"
            data-ph-capture
          >
            Find a gift in 3 minutes
          </Link>

          <p className="mt-4 text-sm text-gray-400">
            No account needed. Free to try.
          </p>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24 bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
            How it works
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-md mx-auto">
            Three steps. Three minutes. Zero decision fatigue.
          </p>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="flex flex-col items-center text-center px-4 animate-in"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Step {step.num}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ADHD brains love this ─────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            Why ADHD brains love this
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "No endless scrolling",
                desc: "We show you 3 options. That's it. No rabbit holes.",
              },
              {
                title: "Explains the 'why'",
                desc: "Each pick comes with reasoning so you stop second-guessing.",
              },
              {
                title: "Done in minutes",
                desc: "Short conversation, fast results. Before your focus drifts.",
              },
              {
                title: "Zero account friction",
                desc: "No signup, no profile. Just start and get answers.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-5 rounded-2xl bg-white border border-gray-100 animate-in"
              >
                <h3 className="font-semibold text-gray-900 mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Second CTA ────────────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-20 bg-white border-y border-gray-100">
        <div className="max-w-lg mx-auto text-center animate-in">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Ready to stop overthinking?
          </h2>
          <p className="text-gray-500 mb-8">
            Gift confidence is 3 minutes away.
          </p>
          <Link
            href="/gift/new"
            onClick={() => trackLandingCTA("anxiety", "mid_cta")}
            className="inline-flex items-center justify-center px-8 py-4 bg-black text-white text-lg font-medium rounded-2xl hover:bg-gray-800 active:scale-[0.98] transition-all"
            data-ph-capture
          >
            Find a gift in 3 minutes
          </Link>
        </div>
      </section>

      {/* ── Waitlist ──────────────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center animate-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Get early access
          </h2>
          <p className="text-gray-500 mb-8">
            Arrive-ready gifting. Join the waitlist.
          </p>

          {submitted ? (
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 font-medium">
              You&apos;re on the list. We&apos;ll be in touch.
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 px-4 py-3.5 text-base border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3.5 bg-black text-white font-medium rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? "Joining..." : "Join waitlist"}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="px-5 py-8 border-t border-gray-100">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>Present Agent</span>
          <span>Gift confidence for the rest of us.</span>
        </div>
      </footer>
    </div>
  );
}
