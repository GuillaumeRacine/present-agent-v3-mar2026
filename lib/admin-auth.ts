// ── Admin Authentication Middleware ─────────────────────────────────
// Validates that the requesting user is an admin before allowing access
// to admin endpoints. For MVP: checks x-user-id header + admin flag in DB.

import { getUserById } from "./auth";

const ADMIN_EMAILS = new Set([
  // Add admin emails here
  process.env.ADMIN_EMAIL,
].filter(Boolean));

/**
 * Checks if the request has valid admin credentials.
 * Returns { ok: true, userId } or { ok: false, status, error }.
 */
export function requireAdmin(request: Request):
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string } {
  // Skip auth in development for local admin access
  if (process.env.NODE_ENV === "development") {
    return { ok: true, userId: "dev-admin" };
  }

  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const user = getUserById(userId);
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  // Check if user is admin by email
  if (!user.email || !ADMIN_EMAILS.has(user.email)) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, userId };
}

/**
 * Checks if the request has a valid authenticated user.
 * Returns { ok: true, userId } or { ok: false, status, error }.
 */
export function requireAuth(request: Request):
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string } {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const user = getUserById(userId);
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  return { ok: true, userId };
}
