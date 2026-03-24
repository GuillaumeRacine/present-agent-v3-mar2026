import { NextResponse } from "next/server";
import { getUserById, updateUserPreferences } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      preferences: user.preferences ? JSON.parse(user.preferences) : null,
    },
  });
}

export async function PATCH(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  if (body.preferences) {
    updateUserPreferences(userId, body.preferences);
  }

  const updated = getUserById(userId)!;
  return NextResponse.json({
    user: {
      ...updated,
      preferences: updated.preferences ? JSON.parse(updated.preferences) : null,
    },
  });
}
