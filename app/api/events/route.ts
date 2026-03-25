import { NextResponse } from "next/server";
import { trackEvent, type EventType } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const { sessionId, userId, eventType, eventData } = await request.json();

    if (!eventType || !sessionId) {
      return NextResponse.json({ error: "Missing eventType or sessionId" }, { status: 400 });
    }

    trackEvent(sessionId || null, userId || null, eventType as EventType, eventData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Event tracking failed", detail: String(error) },
      { status: 500 }
    );
  }
}
