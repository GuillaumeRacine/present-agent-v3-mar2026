"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Speech-to-Text (Mic Input) ──────────────────────────────────

interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useSpeechToText(onResult?: (text: string) => void): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-CA";

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript((finalTranscript + interim).trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      const final = finalTranscript.trim();
      if (final && onResult) {
        onResult(final);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, [isSupported, onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, isSupported };
}

// ── Whisper STT Fallback ─────────────────────────────────────────

export function useWhisperFallback(onResult?: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());

        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        try {
          const res = await fetch("/api/voice/stt", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) {
            setTranscript(data.text);
            onResult?.(data.text);
          }
        } catch {
          // Fallback failed
        }
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("");
    } catch {
      setIsRecording(false);
    }
  }, [onResult]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return { isRecording, transcript, startRecording, stopRecording };
}

// ── Text-to-Speech (Voice Output) ───────────────────────────────

interface UseTextToSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-CA";
    utterance.rate = 1.05; // Slightly faster than default
    utterance.pitch = 1.0;

    // Prefer a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Samantha") || // macOS
      v.name.includes("Karen") ||    // macOS AU
      v.name.includes("Google") ||   // Chrome
      v.name.includes("Natural")     // Edge
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  // Preload voices
  useEffect(() => {
    if (isSupported) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}

// ── Server-Side TTS (OpenAI) ─────────────────────────────────────

export function useServerTTS(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, isSupported: true };
}

// ── Voice Mode (Combined) ───────────────────────────────────────

export interface VoiceModeState {
  enabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  toggle: () => void;
  startListening: () => void;
  stopListening: () => void;
  speakResponse: (text: string) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
}

export function useVoiceMode(onVoiceInput?: (text: string) => void): VoiceModeState {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("present-agent-voice") === "1";
    return false;
  });

  const browserSTT = useSpeechToText(onVoiceInput);
  const whisperSTT = useWhisperFallback(onVoiceInput);
  const serverTTS = useServerTTS();

  // Use browser STT if available, otherwise Whisper
  const useWhisper = !browserSTT.isSupported;
  const stt = useWhisper ? {
    isListening: whisperSTT.isRecording,
    transcript: whisperSTT.transcript,
    startListening: whisperSTT.startRecording,
    stopListening: whisperSTT.stopRecording,
    isSupported: true,
  } : browserSTT;

  // Use server TTS (OpenAI) for higher quality, fallback to browser
  const tts = serverTTS;

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      if (!next) {
        stt.stopListening();
        tts.stop();
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("present-agent-voice", next ? "1" : "0");
      }
      return next;
    });
  }, [stt, tts]);

  return {
    enabled,
    isListening: stt.isListening,
    isSpeaking: tts.isSpeaking,
    transcript: stt.transcript,
    toggle,
    startListening: stt.startListening,
    stopListening: stt.stopListening,
    speakResponse: tts.speak,
    stopSpeaking: tts.stop,
    isSupported: stt.isSupported,
  };
}

// ── Voice-Friendly Recommendation Narration ─────────────────────
// Converts card data into natural speech for voice mode

interface VoiceRec {
  name: string;
  brand: string;
  price: number;
  whyThisFits: string;
  whatThisSays: string;
  usageSignal: string;
}

export function narrateRecommendations(recs: VoiceRec[], recipientName?: string): string {
  const name = recipientName || "them";
  const parts: string[] = [];

  parts.push(`I found three great options for ${name}.`);

  const slotIntros = [
    "My top pick is",
    "Second option —",
    "And here's an unexpected one —",
  ];

  for (let i = 0; i < recs.length && i < 3; i++) {
    const rec = recs[i];
    let line = `${slotIntros[i]} the ${rec.name} by ${rec.brand}, $${rec.price}.`;
    line += ` ${rec.whyThisFits}`;
    if (rec.usageSignal) line += ` ${rec.usageSignal}.`;
    parts.push(line);
  }

  parts.push(`Which one speaks to you? Or should I find different options?`);

  return parts.join(" ");
}
