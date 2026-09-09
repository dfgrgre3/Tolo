"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useAIWorkspace } from "../context/AIWorkspaceContext";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sentiment?: {
    sentiment: string;
    score?: number;
    suggestions?: string[];
  };
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface UseAIAssistantProps {
  initialMessage?: string;
  userId?: string;
}

export function useAIAssistant({
  initialMessage = "مرحباً! أنا مساعدك الذكي في منصة ثناوي. كيف يمكنني مساعدتك اليوم؟",
  userId: _userId,
}: UseAIAssistantProps = {}) {
  const { chat } = useAIWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: initialMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sentimentAlert, setSentimentAlert] = useState<{
    sentiment: string;
    suggestions?: string[];
  } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognitionConstructor =
        (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = "ar-SA";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        logger.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-hide sentiment alert
  useEffect(() => {
    if (sentimentAlert) {
      const timer = setTimeout(() => setSentimentAlert(null), 10000);
      return () => clearTimeout(timer);
    }
    return;
  }, [sentimentAlert]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage: Message = {
        role: "user",
        content: input,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      const currentInput = input;
      setInput("");
      setIsLoading(true);

      const abortController = new AbortController();

      try {
        const data = await chat<{
          message?: string;
          sentiment?: { sentiment: string; score?: number; suggestions?: string[] };
        }>({
            message: currentInput,
            image: image,
            history: messages.slice(-5).map((m) => ({ role: m.role, content: m.content })),
        }, { signal: abortController.signal });
        setImage(null);

        if (data.sentiment && (data.sentiment.sentiment === "frustrated" || data.sentiment.sentiment === "tired")) {
          setSentimentAlert({
            sentiment: data.sentiment.sentiment,
            suggestions: data.sentiment.suggestions,
          });
        }
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message || "عذراً، لم تصل إجابة من المساعد.",
          timestamp: new Date(),
          sentiment: data.sentiment ? { ...data.sentiment, score: data.sentiment.score ?? 0 } : undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: unknown) {
        logger.error("Error sending message:", error instanceof Error ? error.message : String(error));
        const errorMessage: Message = {
          role: "assistant",
          content: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        abortController.abort();
      }
    },
    [chat, input, isLoading, image, messages]
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    isListening,
    sentimentAlert,
    setSentimentAlert,
    image,
    clearImage,
    startListening,
    stopListening,
    handleImageUpload,
    handleSubmit,
  };
}
