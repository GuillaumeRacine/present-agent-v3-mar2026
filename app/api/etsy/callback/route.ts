import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

const ETSY_CLIENT_ID = process.env.ETSY_API_KEY || "xygwwttxaix7z7ijpcceayck";
const REDIRECT_URI = "http://localhost:3000/api/etsy/callback";
const STATE_FILE = "/tmp/etsy-oauth-state.json";
const TOKENS_FILE = "/tmp/etsy-tokens.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<html><body><h1>Etsy OAuth Error</h1><p>${error}</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      `<html><body><h1>Missing code or state parameter</h1></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Read stored state and verifier
  let stored: { codeVerifier: string; state: string };
  try {
    stored = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return new NextResponse(
      `<html><body><h1>No stored OAuth state found</h1><p>Start the flow again at <a href="/api/etsy/connect">/api/etsy/connect</a></p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Validate state
  if (state !== stored.state) {
    return new NextResponse(
      `<html><body><h1>State mismatch — possible CSRF attack</h1></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  // Exchange authorization code for tokens
  try {
    const tokenResponse = await fetch(
      "https://api.etsy.com/v3/public/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: ETSY_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          code,
          code_verifier: stored.codeVerifier,
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      return new NextResponse(
        `<html><body><h1>Token exchange failed</h1><p>Status: ${tokenResponse.status}</p><pre>${errorBody}</pre></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    const tokens = await tokenResponse.json();

    // Save tokens
    fs.writeFileSync(
      TOKENS_FILE,
      JSON.stringify(
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          saved_at: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf-8"
    );

    // Clean up state file
    try {
      fs.unlinkSync(STATE_FILE);
    } catch {}

    return new NextResponse(
      `<html>
<body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px;">
  <h1>Etsy Connected!</h1>
  <p>Tokens saved to <code>${TOKENS_FILE}</code></p>
  <p>Access token expires in ${tokens.expires_in} seconds.</p>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      `<html><body><h1>Error exchanging token</h1><pre>${message}</pre></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
