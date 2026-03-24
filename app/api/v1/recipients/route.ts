import { NextResponse } from "next/server";
import { getUserRecipients } from "@/lib/profiles";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "x-user-id header required" }, { status: 401 });
  }

  const recipients = getUserRecipients(userId);
  return NextResponse.json({
    recipients: recipients.map((r) => ({
      id: r.id,
      name: r.name,
      relationship: r.relationship,
      closeness: r.closeness,
      interests: r.interests ? JSON.parse(r.interests) : [],
      birthday: r.birthday,
      updated_at: r.updated_at,
    })),
  });
}
