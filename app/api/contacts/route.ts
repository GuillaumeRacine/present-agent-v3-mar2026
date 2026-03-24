import { NextResponse } from "next/server";
import { searchContacts, getAllContacts } from "@/lib/occasions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  try {
    const contacts = query ? await searchContacts(query) : await getAllContacts();
    return NextResponse.json({ contacts, total: contacts.length });
  } catch (error) {
    console.error("Contacts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts", detail: String(error) },
      { status: 500 }
    );
  }
}
