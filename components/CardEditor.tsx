"use client";

import { useState } from "react";
import type { CardContent } from "@/lib/cards";

export default function CardEditor({
  card,
  onSave,
}: {
  card: CardContent;
  onSave: (updated: CardContent) => void;
}) {
  const [message, setMessage] = useState(card.message);
  const [editing, setEditing] = useState(false);

  function handleSave() {
    onSave({ ...card, message });
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left text-xs text-gray-400 hover:text-gray-600 transition px-1 py-1"
      >
        Edit message
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={300}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
        autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{message.length}/300</span>
        <div className="flex gap-2">
          <button
            onClick={() => { setMessage(card.message); setEditing(false); }}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
