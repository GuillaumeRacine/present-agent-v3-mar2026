import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";

let cachedAuth: OAuth2Client | null = null;

export function getGoogleAuth(): OAuth2Client {
  if (cachedAuth) return cachedAuth;

  const credPath = process.env.GOOGLE_CREDENTIALS_PATH!;
  const tokenPath = process.env.GOOGLE_TOKEN_PATH!;

  const creds = JSON.parse(readFileSync(credPath, "utf-8"));
  const { client_id, client_secret } = creds.installed;

  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://localhost";
  const auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const token = JSON.parse(readFileSync(tokenPath, "utf-8"));
  auth.setCredentials(token);

  // Auto-refresh and save
  auth.on("tokens", (newTokens) => {
    const existing = JSON.parse(readFileSync(tokenPath, "utf-8"));
    const merged = { ...existing, ...newTokens };
    writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
  });

  cachedAuth = auth;
  return auth;
}

export function getCalendarService() {
  return google.calendar({ version: "v3", auth: getGoogleAuth() });
}

export function getPeopleService() {
  return google.people({ version: "v1", auth: getGoogleAuth() });
}
