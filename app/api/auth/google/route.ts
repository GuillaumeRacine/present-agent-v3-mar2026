import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { googleId, email, name, picture } = body;

    if (!googleId) {
      return NextResponse.json({ error: "Missing googleId" }, { status: 400 });
    }

    const user = getOrCreateUser({
      sub: googleId,
      email,
      name,
      picture,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed", detail: String(error) },
      { status: 500 }
    );
  }
}
