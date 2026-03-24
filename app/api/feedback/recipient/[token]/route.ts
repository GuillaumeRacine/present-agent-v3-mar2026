import { NextResponse } from "next/server";
import { validateFeedbackToken, submitFeedback } from "@/lib/recipient-feedback";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const data = validateFeedbackToken(params.token);
  if (!data) {
    return NextResponse.json(
      { error: "Invalid or expired feedback link" },
      { status: 404 }
    );
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { reaction, whatTheyLiked, note } = body;

    if (!reaction || !["loved_it", "liked_it", "meh", "returned"].includes(reaction)) {
      return NextResponse.json(
        { error: "Invalid reaction" },
        { status: 400 }
      );
    }

    const success = submitFeedback(params.token, { reaction, whatTheyLiked, note });
    if (!success) {
      return NextResponse.json(
        { error: "Feedback already submitted or invalid token" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback", detail: String(error) },
      { status: 500 }
    );
  }
}
