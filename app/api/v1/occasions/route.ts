import { NextResponse } from "next/server";
import { getUpcomingOccasions } from "@/lib/occasions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90");

    const occasions = await getUpcomingOccasions(days);
    return NextResponse.json({
      occasions: occasions.map((o) => ({
        name: o.personName,
        type: o.type,
        date: o.date,
        daysUntil: o.daysUntil,
        source: o.source,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load occasions", detail: String(error) },
      { status: 500 }
    );
  }
}
