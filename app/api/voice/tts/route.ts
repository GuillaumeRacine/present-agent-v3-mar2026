import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/models";
import { checkRateLimit, getClientIp, VOICE_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    const { text, voice = "nova" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Rate limit check
    const ip = getClientIp(request);
    const rl = checkRateLimit(`tts:${ip}`, VOICE_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const openai = getOpenAIClient();
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as "nova" | "alloy" | "echo" | "fable" | "onyx" | "shimmer",
      input: text,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Text-to-speech failed", detail: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
