"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Contact {
  resourceName: string;
  name: string;
  birthday: { month: number; day: number; year?: number } | null;
  emails: string[];
  photo: string | null;
}

interface Occasion {
  type: string;
  personName: string;
  date: string;
  daysUntil: number;
  source: string;
  contact?: Contact;
}

interface RecipientSummary {
  id: string;
  name: string;
  relationship: string | null;
  birthday: string | null;
  updated_at: string;
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [userId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("present-agent-user-id");
    return null;
  });

  // Load upcoming occasions + recipients on mount
  useEffect(() => {
    fetch("/api/occasions?days=90")
      .then((r) => r.json())
      .then((data) => {
        setOccasions(data.occasions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (userId) {
      fetch("/api/recipients", { headers: { "x-user-id": userId } })
        .then((r) => r.json())
        .then((data) => setRecipients(data.recipients || []))
        .catch(() => {});
    }
  }, [userId]);

  // Debounced contact search
  const searchContacts = useCallback(async (q: string) => {
    if (q.length < 2) {
      setContacts([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      setContacts([]);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchContacts(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchContacts]);

  function startGift(params: {
    name?: string;
    occasion?: string;
    date?: string;
    birthday?: { month: number; day: number } | null;
  }) {
    const sp = new URLSearchParams();
    if (params.name) sp.set("name", params.name);
    if (params.occasion) sp.set("occasion", params.occasion);
    if (params.date) sp.set("date", params.date);
    if (params.birthday) sp.set("birthday", `${params.birthday.month}/${params.birthday.day}`);
    router.push(`/gift/new?${sp.toString()}`);
  }

  function startFreeform() {
    if (query.trim()) {
      startGift({ name: query.trim() });
    } else {
      startGift({});
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2">Present Agent</h1>
        <p className="text-gray-500 mb-8">
          Who needs a gift?
        </p>

        {/* Search input */}
        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startFreeform()}
            placeholder="Type a name..."
            autoFocus
            className="w-full px-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
          />
          {searching && (
            <div className="absolute right-3 top-3.5 text-gray-400 text-sm">searching...</div>
          )}
        </div>

        {/* Contact matches */}
        {contacts.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">From your contacts</p>
            <div className="space-y-1">
              {contacts.slice(0, 8).map((contact) => (
                <button
                  key={contact.resourceName}
                  onClick={() =>
                    startGift({
                      name: contact.name,
                      birthday: contact.birthday,
                    })
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white hover:shadow-sm transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {contact.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{contact.name}</div>
                    {contact.birthday && (
                      <div className="text-xs text-gray-400">
                        Birthday: {contact.birthday.month}/{contact.birthday.day}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start without match */}
        {query.length >= 2 && (
          <button
            onClick={startFreeform}
            className="w-full mb-8 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition"
          >
            Start with &ldquo;{query}&rdquo; (not in contacts)
          </button>
        )}

        {/* Your People — shown for authenticated users with saved recipients */}
        {recipients.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Your people</p>
            <div className="grid grid-cols-3 gap-2">
              {recipients.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  onClick={() => startGift({ name: r.name })}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl hover:bg-white hover:shadow-sm transition"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-sm font-medium text-violet-700">
                    {r.name[0]}
                  </div>
                  <div className="text-xs font-medium text-center truncate w-full">{r.name}</div>
                  {r.relationship && (
                    <div className="text-[10px] text-gray-400">{r.relationship}</div>
                  )}
                </button>
              ))}
              <button
                onClick={() => startGift({})}
                className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-dashed border-gray-200 hover:border-gray-400 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg text-gray-400">+</div>
                <div className="text-xs text-gray-400">Add someone</div>
              </button>
            </div>
          </div>
        )}

        {/* Upcoming occasions */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            {loading ? "Checking your calendar..." : "Upcoming occasions"}
          </p>

          {!loading && occasions.length === 0 && (
            <p className="text-gray-400 text-sm py-4">
              No upcoming birthdays or occasions found in your calendar.
            </p>
          )}

          <div className="space-y-1">
            {occasions.map((occ, i) => (
              <button
                key={i}
                onClick={() =>
                  startGift({
                    name: occ.personName,
                    occasion: occ.type,
                    date: occ.date,
                  })
                }
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white hover:shadow-sm transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">
                  {occ.type === "birthday" ? "🎂" : "📅"}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{occ.personName}</div>
                  <div className="text-xs text-gray-400">
                    {occ.type === "birthday" ? "Birthday" : occ.personName} &middot; {occ.date}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {occ.daysUntil === 0
                    ? "Today"
                    : occ.daysUntil === 1
                    ? "Tomorrow"
                    : `${occ.daysUntil}d`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Or just start */}
        {!query && (
          <button
            onClick={() => startGift({})}
            className="mt-8 w-full px-4 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition"
          >
            I just need help with a gift
          </button>
        )}
      </div>
    </div>
  );
}
