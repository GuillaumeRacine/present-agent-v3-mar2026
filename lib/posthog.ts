// ── PostHog Client-Side Analytics ────────────────────────────────────
// Provides detailed behavioral tracking: session recording, heatmaps,
// custom events, and user identification. Server-side events (lib/events.ts)
// track the data layer; this tracks the UX layer.

import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined" || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",

    // Session recording — full behavioral replay
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: false, // We want to see what users type (gift context)
      maskInputFn: (text: string, element?: HTMLElement) => {
        // Only mask email inputs
        if (element instanceof HTMLInputElement && element.type === "email") {
          return "*".repeat(text.length);
        }
        return text;
      },
    },

    // Heatmaps
    enable_heatmaps: true,

    // Autocapture — clicks, form submissions, page views
    autocapture: {
      dom_event_allowlist: ["click", "submit", "change"],
      element_allowlist: ["a", "button", "form", "input", "select", "textarea"],
      css_selector_allowlist: ["[data-ph-capture]"],
    },

    // Page view tracking
    capture_pageview: true,
    capture_pageleave: true,

    // Performance
    loaded: (ph) => {
      // Enable debug in development
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });

  initialized = true;
}

// ── Typed Event Helpers ─────────────────────────────────────────────
// Mirror the server-side event types for consistent tracking

export function trackPageView(pageName: string, properties?: Record<string, unknown>) {
  posthog.capture("$pageview", { page_name: pageName, ...properties });
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits);
}

export function resetUser() {
  posthog.reset();
}

// ── Conversation Events ─────────────────────────────────────────────

export function trackConversationStart(sessionId: string, source?: string) {
  posthog.capture("conversation_started", {
    session_id: sessionId,
    source,
    timestamp: new Date().toISOString(),
  });
}

export function trackMessageSent(sessionId: string, turnCount: number, inputLength: number, usedSuggestedReply: boolean) {
  posthog.capture("message_sent", {
    session_id: sessionId,
    turn_count: turnCount,
    input_length: inputLength,
    used_suggested_reply: usedSuggestedReply,
  });
}

export function trackConversationPhase(sessionId: string, phase: string, readiness: number) {
  posthog.capture("conversation_phase_changed", {
    session_id: sessionId,
    phase,
    readiness,
  });
}

export function trackConversationComplete(sessionId: string, turnCount: number, durationMs: number) {
  posthog.capture("conversation_completed", {
    session_id: sessionId,
    turn_count: turnCount,
    duration_ms: durationMs,
  });
}

// ── Recommendation Events ───────────────────────────────────────────

export function trackRecommendationsViewed(sessionId: string, productIds: string[], categories: string[]) {
  posthog.capture("recommendations_viewed", {
    session_id: sessionId,
    product_ids: productIds,
    categories,
    count: productIds.length,
  });
}

export function trackCardReaction(sessionId: string, productId: string, reaction: string, slot: number) {
  posthog.capture("card_reaction", {
    session_id: sessionId,
    product_id: productId,
    reaction,
    slot,
  });
}

export function trackProductSelected(sessionId: string, productId: string, slot: number, price: number, category: string) {
  posthog.capture("product_selected", {
    session_id: sessionId,
    product_id: productId,
    slot,
    price,
    category,
  });
}

export function trackJustPickForMe(sessionId: string, productId: string) {
  posthog.capture("just_pick_for_me", {
    session_id: sessionId,
    product_id: productId,
  });
}

export function trackBuyLinkClicked(sessionId: string, productId: string, price: number, buyUrl: string) {
  posthog.capture("buy_link_clicked", {
    session_id: sessionId,
    product_id: productId,
    price,
    buy_url_domain: new URL(buyUrl).hostname,
  });
}

export function trackMarkedAsPurchased(sessionId: string, productId: string, didBuy: boolean) {
  posthog.capture("marked_as_purchased", {
    session_id: sessionId,
    product_id: productId,
    did_buy: didBuy,
  });
}

// ── Refinement Events ───────────────────────────────────────────────

export function trackRefineClicked(sessionId: string) {
  posthog.capture("refine_clicked", { session_id: sessionId });
}

export function trackNotQuiteRight(sessionId: string, reason?: string) {
  posthog.capture("not_quite_right", {
    session_id: sessionId,
    reason,
  });
}

// ── Voice Events ────────────────────────────────────────────────────

export function trackVoiceToggled(sessionId: string, enabled: boolean) {
  posthog.capture("voice_toggled", {
    session_id: sessionId,
    enabled,
  });
}

// ── Card & Presentation Events ──────────────────────────────────────

export function trackCardViewed(sessionId: string) {
  posthog.capture("card_page_viewed", { session_id: sessionId });
}

export function trackCardEdited(sessionId: string) {
  posthog.capture("card_edited", { session_id: sessionId });
}

// ── Landing Page Events ─────────────────────────────────────────────

export function trackLandingCTA(variant: string, action: string) {
  posthog.capture("landing_cta_clicked", { variant, action });
}

export function trackWaitlistSignup(email: string) {
  // Don't send actual email to PostHog — just track the event
  posthog.capture("waitlist_signup", { has_email: !!email });
}

// ── Feedback Events ─────────────────────────────────────────────────

export function trackQuickReaction(sessionId: string, reaction: string) {
  posthog.capture("quick_reaction", {
    session_id: sessionId,
    reaction,
  });
}

export function trackConversationFeedback(sessionId: string, felt: string) {
  posthog.capture("conversation_feedback", {
    session_id: sessionId,
    felt,
  });
}

// ── Timing Helpers ──────────────────────────────────────────────────

export function startTimer(): number {
  return Date.now();
}

export function trackTimedEvent(eventName: string, startTime: number, properties?: Record<string, unknown>) {
  posthog.capture(eventName, {
    duration_ms: Date.now() - startTime,
    ...properties,
  });
}

// ── Feature Flags ───────────────────────────────────────────────────

export function getFeatureFlag(flagName: string): boolean | string | undefined {
  return posthog.getFeatureFlag(flagName) as boolean | string | undefined;
}

export function isFeatureEnabled(flagName: string): boolean {
  return posthog.isFeatureEnabled(flagName) ?? false;
}

// ── Raw access for custom usage ─────────────────────────────────────

export { posthog };
