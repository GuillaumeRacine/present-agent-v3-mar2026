// ── Input Sanitization for LLM Prompts ──────────────────────────────
// Prevents prompt injection by stripping control characters and
// limiting length of user-supplied data before it enters system prompts.

/**
 * Sanitize a string before injecting into an LLM prompt.
 * Strips newlines, code blocks, XML-like tags, and limits length.
 */
export function sanitizeForPrompt(input: string, maxLength = 200): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[\r\n]+/g, " ")           // Flatten newlines
    .replace(/```[\s\S]*?```/g, "")      // Remove code blocks
    .replace(/<[^>]*>/g, "")             // Remove XML/HTML tags
    .replace(/#{1,6}\s/g, "")            // Remove markdown headers
    .replace(/\s+/g, " ")               // Collapse whitespace
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize an array of strings for prompt injection.
 */
export function sanitizeArrayForPrompt(items: string[], maxPerItem = 50): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => typeof item === "string")
    .map((item) => sanitizeForPrompt(item, maxPerItem))
    .filter(Boolean)
    .slice(0, 20); // Max 20 items
}

/**
 * Strip error details for production responses.
 * Only includes the generic message, never the stack trace.
 */
export function safeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === "development") {
    return String(error);
  }
  return "An internal error occurred";
}
