import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { OAuth2Client } from "google-auth-library";
import { getDb } from "./db";

// Per-user auth cache (keyed by userId)
const authCache = new Map<string, OAuth2Client>();

/**
 * Get OAuth2 client configured with app credentials.
 * Does NOT set user credentials — call setUserCredentials() after.
 */
function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google";
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Get Google auth for a specific user (per-user tokens from DB).
 * Falls back to shared file-based token for backward compatibility.
 */
export function getGoogleAuth(userId?: string): OAuth2Client {
  // Try per-user auth from DB
  if (userId) {
    if (authCache.has(userId)) return authCache.get(userId)!;

    try {
      const db = getDb();
      const user = db.prepare("SELECT google_refresh_token FROM users WHERE id = ?").get(userId) as { google_refresh_token: string | null } | undefined;

      if (user?.google_refresh_token) {
        const auth = createOAuth2Client();
        const tokens = JSON.parse(user.google_refresh_token);
        auth.setCredentials(tokens);

        // Auto-refresh and save back to DB
        auth.on("tokens", (newTokens) => {
          const merged = { ...tokens, ...newTokens };
          db.prepare("UPDATE users SET google_refresh_token = ? WHERE id = ?")
            .run(JSON.stringify(merged), userId);
        });

        authCache.set(userId, auth);
        return auth;
      }
    } catch {
      // Fall through to file-based
    }
  }

  // Fallback: shared file-based token (backward compat, dev mode)
  if (authCache.has("__shared__")) return authCache.get("__shared__")!;

  const credPath = process.env.GOOGLE_CREDENTIALS_PATH;
  const tokenPath = process.env.GOOGLE_TOKEN_PATH;

  if (!credPath || !tokenPath || !existsSync(credPath) || !existsSync(tokenPath)) {
    // No credentials available — return unconfigured client
    return createOAuth2Client();
  }

  const creds = JSON.parse(readFileSync(credPath, "utf-8"));
  const { client_id, client_secret } = creds.installed || creds.web || {};
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google";
  const auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const token = JSON.parse(readFileSync(tokenPath, "utf-8"));
  auth.setCredentials(token);

  auth.on("tokens", (newTokens) => {
    try {
      const existing = JSON.parse(readFileSync(tokenPath, "utf-8"));
      const merged = { ...existing, ...newTokens };
      writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
    } catch { /* non-critical */ }
  });

  authCache.set("__shared__", auth);
  return auth;
}

/**
 * Store Google OAuth tokens for a user in the database.
 */
export function saveUserGoogleTokens(userId: string, tokens: Record<string, unknown>): void {
  const db = getDb();
  db.prepare("UPDATE users SET google_refresh_token = ? WHERE id = ?")
    .run(JSON.stringify(tokens), userId);
  // Invalidate cache
  authCache.delete(userId);
}

export function getCalendarService(userId?: string) {
  return google.calendar({ version: "v3", auth: getGoogleAuth(userId) });
}

export function getPeopleService(userId?: string) {
  return google.people({ version: "v1", auth: getGoogleAuth(userId) });
}
