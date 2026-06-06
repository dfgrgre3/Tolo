"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useTokenStreamBuffer } from "@/app/(common)/hooks/useTokenStreamBuffer";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sentiment?: {
    sentiment: string;
    score: number;
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
  userId,
}: UseAIAssistantProps = {}) {
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

  // Streaming batch handler
  const onBatch = useCallback((tokens: string[]) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        const updated = { ...last, content: last.content + tokens.join("") };
        return [...prev.slice(0, -1), updated];
      }
      const assistantMessage: Message = {
        role: "assistant",
        content: tokens.join(""),
        timestamp: new Date(),
      };
      return [...prev, assistantMessage];
    });
  }, []);

  const { addItem, flush } = useTokenStreamBuffer<string>(onBatch, 150);

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
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentInput,
            image: image,
            history: messages.slice(-5).map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: abortController.signal,
        });
        setImage(null);

        if (!response.ok) {
          throw new Error("فشلت عملية الاتصال بالمساعد الذكي");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              const tokens = chunk.split(/\n/).filter(Boolean);
              tokens.forEach((t) => addItem(t));
            }
          }
          flush();
        } else {
          const data = await response.json();
          if (data.sentiment && (data.sentiment.sentiment === "frustrated" || data.sentiment.sentiment === "tired")) {
            setSentimentAlert({
              sentiment: data.sentiment.sentiment,
              suggestions: data.sentiment.suggestions,
            });
          }
          const assistantMessage: Message = {
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
            sentiment: data.sentiment,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
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
    [input, isLoading, image, messages, addItem, flush]
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
