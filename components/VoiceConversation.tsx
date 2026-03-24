"use client";

import { useState, useEffect, useRef } from "react";
import type { VoiceModeState } from "@/lib/useVoice";

interface VoiceConversationProps {
  voice: VoiceModeState;
  lastMessage?: string;
  isLoading: boolean;
  onBack: () => void;
}

export default function VoiceConversation({
  voice,
  lastMessage,
  isLoading,
  onBack,
}: VoiceConversationProps) {
  const [history, setHistory] = useState<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef("");

  // Track transcript for VAD (voice activity detection)
  useEffect(() => {
    if (!voice.isListening || !voice.transcript) return;

    // Reset silence timer on new speech
    if (voice.transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = voice.transcript;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Auto-send after 1.5s silence
      silenceTimerRef.current = setTimeout(() => {
        if (voice.isListening && voice.transcript) {
          voice.stopListening();
        }
      }, 1500);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [voice.transcript, voice.isListening, voice]);

  // Add messages to history
  useEffect(() => {
    if (lastMessage && !history.includes(lastMessage)) {
      setHistory(prev => [...prev.slice(-4), lastMessage]);
    }
  }, [lastMessage, history]);

  // Continuous conversation: after speaking, auto-listen
  useEffect(() => {
    if (!voice.enabled) return;
    if (!voice.isSpeaking && !voice.isListening && !isLoading) {
      const timer = setTimeout(() => {
        voice.startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [voice.isSpeaking, voice.isListening, isLoading, voice]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-white/50 hover:text-white text-sm px-3 py-2 rounded-lg transition"
      >
        Back
      </button>

      {/* Transcript display */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-md">
        {/* Last AI response */}
        {lastMessage && (
          <p className="text-white/70 text-center text-lg leading-relaxed mb-8 max-h-48 overflow-y-auto">
            {lastMessage}
          </p>
        )}

        {/* Current transcript */}
        {voice.transcript && (
          <p className="text-white text-center text-xl font-medium mb-4">
            {voice.transcript}
          </p>
        )}

        {/* Status */}
        <p className="text-white/40 text-sm mb-8">
          {isLoading
            ? "Thinking..."
            : voice.isSpeaking
            ? "Speaking..."
            : voice.isListening
            ? "Listening..."
            : "Tap to speak"}
        </p>
      </div>

      {/* Mic button */}
      <div className="pb-16">
        <button
          onClick={() => {
            if (voice.isSpeaking) {
              voice.stopSpeaking();
            } else if (voice.isListening) {
              voice.stopListening();
            } else {
              voice.startListening();
            }
          }}
          disabled={isLoading}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            voice.isListening
              ? "bg-red-500 scale-110 animate-pulse"
              : voice.isSpeaking
              ? "bg-violet-500 scale-105"
              : "bg-white hover:scale-105"
          } disabled:opacity-30`}
        >
          <svg
            className={`w-8 h-8 ${voice.isListening || voice.isSpeaking ? "text-white" : "text-gray-900"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
