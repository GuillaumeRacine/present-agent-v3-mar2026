"use client";

export function sendFeedback(type: string, sessionId: string, data: Record<string, unknown>) {
  fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId, data }),
  }).catch(() => {}); // Fire and forget
}
