import { NextResponse } from "next/server";
import { getUserRecipients, createRecipient } from "@/lib/profiles";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const recipients = getUserRecipients(userId);
  return NextResponse.json({
    recipients: recipients.map((r) => ({
      ...r,
      interests: r.interests ? JSON.parse(r.interests) : [],
      personality: r.personality ? JSON.parse(r.personality) : null,
      wishes: r.wishes ? JSON.parse(r.wishes) : [],
      avoids: r.avoids ? JSON.parse(r.avoids) : [],
      shared_memories: r.shared_memories ? JSON.parse(r.shared_memories) : [],
      inside_jokes: r.inside_jokes ? JSON.parse(r.inside_jokes) : [],
    })),
  });
}

export async function POST(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  body.name = body.name.trim();

  const recipient = createRecipient(userId, body);
  return NextResponse.json({ recipient }, { status: 201 });
}
