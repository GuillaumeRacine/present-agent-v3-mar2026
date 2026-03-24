import { getCalendarService, getPeopleService } from "./google";

export interface Contact {
  resourceName: string;
  name: string;
  birthday: { month: number; day: number; year?: number } | null;
  emails: string[];
  photo: string | null;
}

export interface CalendarOccasion {
  id: string;
  summary: string;
  date: string;
  isAllDay: boolean;
  calendarId: string;
}

export interface Occasion {
  type: "birthday" | "calendar_event";
  personName: string;
  date: string;
  daysUntil: number;
  source: "contacts" | "calendar" | "birthday_calendar";
  contact?: Contact;
  calendarEvent?: CalendarOccasion;
}

// Fetch all contacts with pagination
export async function getAllContacts(): Promise<Contact[]> {
  const people = getPeopleService();
  const contacts: Contact[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 200,
      personFields: "names,birthdays,emailAddresses,photos",
      pageToken: nextPageToken,
    });

    for (const person of res.data.connections || []) {
      const name = person.names?.[0]?.displayName;
      if (!name) continue;

      const bday = person.birthdays?.[0]?.date;
      contacts.push({
        resourceName: person.resourceName || "",
        name,
        birthday: bday ? { month: bday.month!, day: bday.day!, year: bday.year || undefined } : null,
        emails: (person.emailAddresses || []).map((e) => e.value || ""),
        photo: person.photos?.[0]?.url || null,
      });
    }

    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken);

  return contacts;
}

// Search contacts by name (fuzzy)
export async function searchContacts(query: string): Promise<Contact[]> {
  const all = await getAllContacts();
  const q = query.toLowerCase();
  return all.filter((c) => c.name.toLowerCase().includes(q));
}

// Keywords that signal a gift-relevant calendar event
const OCCASION_KEYWORDS = [
  "birthday", "bday", "anniversary", "wedding", "baby shower",
  "graduation", "housewarming", "retirement", "fête", "anniversaire",
  "shower", "engagement", "baptism", "bar mitzvah", "bat mitzvah",
  "quinceañera", "mother", "father", "valentine",
];

// Calendar IDs that are never useful for gift occasions
const SKIP_CALENDARS = new Set([
  "en.canadian#holiday@group.v.calendar.google.com",
  "en.usa#holiday@group.v.calendar.google.com",
  "addressbook#contacts@group.v.calendar.google.com",
]);

function isBirthdayCalendar(id: string, summary: string): boolean {
  return id.includes("contacts@group.v.calendar.google.com") ||
    summary.toLowerCase().includes("birthday") ||
    summary.toLowerCase().includes("anniversaire");
}

function extractPersonName(summary: string): string {
  return summary
    .replace(/'s birthday/i, "")
    .replace(/'s birthday/i, "")
    .replace(/birthday\s*[-:]\s*/i, "")
    .replace(/\s*b\s*day$/i, "")
    .replace(/\s*bday$/i, "")
    .replace(/\s*birthday[!.]*$/i, "")
    .replace(/\s*anniversaire$/i, "")
    .replace(/^happy\s*birthday[!.]*$/i, "") // "Happy birthday!" → empty → use summary
    .trim() || summary;
}

// Get upcoming occasions from ALL sources: contacts + every calendar
export async function getUpcomingOccasions(daysAhead: number = 90): Promise<Occasion[]> {
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const occasions: Occasion[] = [];

  // 1. Birthdays from Google Contacts (People API)
  const contacts = await getAllContacts();
  for (const contact of contacts) {
    if (!contact.birthday) continue;

    const { month, day } = contact.birthday;
    const thisYear = new Date(now.getFullYear(), month - 1, day);
    const nextYear = new Date(now.getFullYear() + 1, month - 1, day);

    for (const bdate of [thisYear, nextYear]) {
      if (bdate >= now && bdate <= end) {
        const daysUntil = Math.ceil((bdate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        occasions.push({
          type: "birthday",
          personName: contact.name,
          date: bdate.toISOString().slice(0, 10),
          daysUntil,
          source: "contacts",
          contact,
        });
      }
    }
  }

  // 2. Scan ALL calendars the user has access to
  const cal = getCalendarService();
  let calendars: { id: string; summary: string }[] = [];

  try {
    const calList = await cal.calendarList.list();
    calendars = (calList.data.items || [])
      .filter((c) => c.id && !SKIP_CALENDARS.has(c.id))
      .map((c) => ({ id: c.id!, summary: c.summary || "" }));
  } catch {
    // Fallback: just try primary
    calendars = [{ id: "primary", summary: "Primary" }];
  }

  // Also try the well-known birthday calendar even if not in the list
  const birthdayCalId = "#contacts@group.v.calendar.google.com";
  if (!calendars.some((c) => c.id === birthdayCalId)) {
    calendars.push({ id: birthdayCalId, summary: "Contacts Birthdays" });
  }

  // Fetch events from all calendars in parallel
  const calendarResults = await Promise.allSettled(
    calendars.map(async (c) => {
      const events = await cal.events.list({
        calendarId: c.id,
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100,
      });
      return { calendar: c, events: events.data.items || [] };
    })
  );

  for (const result of calendarResults) {
    if (result.status !== "fulfilled") continue;
    const { calendar, events } = result.value;
    const isBdayCal = isBirthdayCalendar(calendar.id, calendar.summary);

    for (const event of events) {
      const summary = event.summary || "";
      const summaryLower = summary.toLowerCase();
      const date = event.start?.date || event.start?.dateTime?.slice(0, 10);
      if (!date) continue;

      // For birthday calendars: every event is a birthday
      // For other calendars: only include events matching occasion keywords
      if (!isBdayCal && !OCCASION_KEYWORDS.some((kw) => summaryLower.includes(kw))) continue;

      const eventDate = new Date(date + "T00:00:00");
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const personName = isBdayCal || summaryLower.includes("birthday")
        ? extractPersonName(summary)
        : summary;

      const eventType = isBdayCal || summaryLower.includes("birthday") ? "birthday" : "calendar_event";

      // Deduplicate: skip if same person + same date already exists
      if (occasions.some((o) =>
        o.date === date &&
        o.personName.toLowerCase() === personName.toLowerCase()
      )) continue;

      occasions.push({
        type: eventType,
        personName,
        date,
        daysUntil,
        source: isBdayCal ? "birthday_calendar" : "calendar",
        calendarEvent: {
          id: event.id || "",
          summary,
          date,
          isAllDay: !!event.start?.date,
          calendarId: calendar.id,
        },
      });
    }
  }

  // Sort by date (soonest first)
  occasions.sort((a, b) => a.daysUntil - b.daysUntil);
  return occasions;
}
