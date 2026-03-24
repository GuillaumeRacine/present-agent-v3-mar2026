// ── In-Memory Rate Limiter ──────────────────────────────────────────
// Simple sliding-window rate limiter. No external dependencies.
// Resets on server restart (acceptable for MVP).

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  });
}

interface RateLimitOptions {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given key (e.g., IP + endpoint).
 * Returns whether the request is allowed.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  cleanup(opts.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= opts.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + opts.windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: opts.maxRequests - entry.timestamps.length,
    resetMs: opts.windowMs,
  };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── Preset rate limit configs ──────────────────────────────────────

/** LLM endpoints: 10 requests per minute per IP */
export const LLM_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 10,
  windowMs: 60 * 1000,
};

/** Voice endpoints: 20 requests per minute per IP */
export const VOICE_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 20,
  windowMs: 60 * 1000,
};

/** General API: 60 requests per minute per IP */
export const GENERAL_RATE_LIMIT: RateLimitOptions = {
  maxRequests: 60,
  windowMs: 60 * 1000,
};
