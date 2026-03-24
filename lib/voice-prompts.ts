// ── Voice-Optimized System Prompt ────────────────────────────────────
// When voice mode is active, we inject a modified system prompt
// that produces shorter, more conversational responses.

export const VOICE_PROMPT_ADDON = `

## VOICE MODE ACTIVE
The user is speaking to you, and you will be read aloud. Adapt your response:
- Maximum 1-2 SHORT sentences. Be concise.
- No formatting: no bullets, no bold, no numbered lists, no emojis.
- Conversational tone: use verbal pauses naturally ("So...", "Let me think...")
- Speak numbers naturally: "about fifty bucks" not "$50", "a hundred to two hundred" not "$100-200"
- When suggesting options, number them simply: "First option is... Second one is..."
- Don't describe visual elements you can't show in voice
- End with a clear question or prompt to keep conversation flowing
`;

export function makeVoiceFriendly(text: string): string {
  // Strip markdown formatting for TTS
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // bold
    .replace(/\*([^*]+)\*/g, "$1")      // italic
    .replace(/`([^`]+)`/g, "$1")         // inline code
    .replace(/^[-*]\s+/gm, "")           // bullet points
    .replace(/^\d+\.\s+/gm, "")          // numbered lists
    .replace(/#{1,3}\s+/g, "")           // headers
    .replace(/\$(\d+)/g, (_, n) => `${n} dollars`)  // $50 → 50 dollars
    .trim();
}
