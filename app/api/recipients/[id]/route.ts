import { NextResponse } from "next/server";
import { getRecipient, updateRecipient, getRecipientHistory } from "@/lib/profiles";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const recipient = getRecipient(params.id);
  if (!recipient || recipient.user_id !== userId) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const history = getRecipientHistory(params.id);

  return NextResponse.json({
    recipient: {
      ...recipient,
      interests: recipient.interests ? JSON.parse(recipient.interests) : [],
      personality: recipient.personality ? JSON.parse(recipient.personality) : null,
      wishes: recipient.wishes ? JSON.parse(recipient.wishes) : [],
      avoids: recipient.avoids ? JSON.parse(recipient.avoids) : [],
      shared_memories: recipient.shared_memories ? JSON.parse(recipient.shared_memories) : [],
      inside_jokes: recipient.inside_jokes ? JSON.parse(recipient.inside_jokes) : [],
    },
    history,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const recipient = getRecipient(params.id);
  if (!recipient || recipient.user_id !== userId) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const body = await request.json();
  updateRecipient(params.id, body);

  const updated = getRecipient(params.id)!;
  return NextResponse.json({
    recipient: {
      ...updated,
      interests: updated.interests ? JSON.parse(updated.interests) : [],
      personality: updated.personality ? JSON.parse(updated.personality) : null,
      wishes: updated.wishes ? JSON.parse(updated.wishes) : [],
      avoids: updated.avoids ? JSON.parse(updated.avoids) : [],
      shared_memories: updated.shared_memories ? JSON.parse(updated.shared_memories) : [],
      inside_jokes: updated.inside_jokes ? JSON.parse(updated.inside_jokes) : [],
    },
  });
}
