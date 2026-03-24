import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/models";
import { checkRateLimit, getClientIp, VOICE_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Rate limit check
    const ip = getClientIp(request);
    const rl = checkRateLimit(`stt:${ip}`, VOICE_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    return NextResponse.json({
      text: transcription.text,
    });
  } catch (error) {
    console.error("STT error:", error);
    return NextResponse.json(
      { error: "Speech-to-text failed", detail: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
