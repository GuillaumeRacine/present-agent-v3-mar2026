// ── Centralized Model Router ─────────────────────────────────────────
// Returns the correct model config for each task type.
// Single place to change models, max tokens, or add new providers.

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type TaskType =
  | "chat"
  | "recommend"
  | "card"
  | "presentation"
  | "profile_merge"
  | "event_summary"
  | "stt"
  | "tts";

interface ModelConfig {
  provider: "anthropic" | "gemini" | "openai";
  model: string;
  maxTokens: number;
}

const MODEL_MAP: Record<TaskType, ModelConfig> = {
  chat: { provider: "gemini", model: "gemini-2.5-flash", maxTokens: 800 },
  recommend: { provider: "anthropic", model: "claude-sonnet-4-20250514", maxTokens: 1200 },
  card: { provider: "anthropic", model: "claude-sonnet-4-20250514", maxTokens: 800 },
  presentation: { provider: "anthropic", model: "claude-sonnet-4-20250514", maxTokens: 600 },
  profile_merge: { provider: "anthropic", model: "claude-haiku-4-5-20251001", maxTokens: 400 },
  event_summary: { provider: "gemini", model: "gemini-2.5-flash", maxTokens: 400 },
  stt: { provider: "openai", model: "whisper-1", maxTokens: 0 },
  tts: { provider: "openai", model: "tts-1", maxTokens: 0 },
};

// Lazy singletons
let _anthropic: Anthropic | null = null;
let _gemini: GoogleGenerativeAI | null = null;
let _openai: OpenAI | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  return _gemini;
}

export function getOpenAIClient(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

export function getModel(task: TaskType): ModelConfig & {
  anthropic?: Anthropic;
  gemini?: GoogleGenerativeAI;
  openai?: OpenAI;
} {
  const config = MODEL_MAP[task];
  return {
    ...config,
    anthropic: config.provider === "anthropic" ? getAnthropicClient() : undefined,
    gemini: config.provider === "gemini" ? getGeminiClient() : undefined,
    openai: config.provider === "openai" ? getOpenAIClient() : undefined,
  };
}
