import { NextResponse } from "next/server";
import { getUpcomingOccasions } from "@/lib/occasions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "90");

  try {
    const occasions = await getUpcomingOccasions(days);
    return NextResponse.json({ occasions });
  } catch (error) {
    console.error("Occasions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch occasions", detail: String(error) },
      { status: 500 }
    );
  }
}
