import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";

const ETSY_CLIENT_ID = process.env.ETSY_API_KEY || "xygwwttxaix7z7ijpcceayck";
const REDIRECT_URI = "http://localhost:3000/api/etsy/callback";
const SCOPES = "listings_r shops_r";
const STATE_FILE = "/tmp/etsy-oauth-state.json";

function generateCodeVerifier(): string {
  // PKCE code_verifier: 43-128 chars from [A-Za-z0-9._~-]
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._~-";
  const length = 64;
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

function generateCodeChallenge(verifier: string): string {
  // SHA256 hash, base64url encoded (no padding)
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  // Store verifier and state for the callback
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ codeVerifier, state, createdAt: new Date().toISOString() }),
    "utf-8"
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: ETSY_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const etsyAuthUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`;

  return NextResponse.redirect(etsyAuthUrl);
}
