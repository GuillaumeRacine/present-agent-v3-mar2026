import { NextResponse } from "next/server";
import { getSessionEvents } from "@/lib/events";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  const auth = requireAdmin(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const events = getSessionEvents(params.sessionId);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch events", detail: process.env.NODE_ENV === "development" ? String(error) : "An internal error occurred" },
      { status: 500 }
    );
  }
}
