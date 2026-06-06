"use client";

import React, { useRef, useEffect } from "react";
import { Send, Bot, User, Zap, Mic, MicOff, Heart } from "lucide-react";
import { useAIAssistant } from "../hooks/useAIAssistant";

interface AIAssistantEnhancedProps {
  initialMessage?: string;
  placeholder?: string;
  title?: string;
  className?: string;
  userId?: string;
}

export default function AIAssistantEnhanced({
  initialMessage = "مرحباً! أنا مساعدك الذكي في منصة ثناوي. كيف يمكنني مساعدتك اليوم؟",
  placeholder = "اكتب سؤالك هنا أو اضغط على الميكروفون للتحدث...",
  title = "المساعد الذكي",
  className = "",
  userId,
}: AIAssistantEnhancedProps) {
  const {
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
  } = useAIAssistant({ initialMessage, userId });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "frustrated":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "tired":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "positive":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg flex flex-col h-full ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bot className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <div className="ml-auto flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            <Zap className="h-3 w-3" />
            <span>Gemini 2.0 Flash</span>
          </div>
        </div>
      </div>

      {/* Sentiment Alert */}
      {sentimentAlert && (
        <div
          className={`mx-4 mt-2 p-3 rounded-lg border ${getSentimentColor(
            sentimentAlert.sentiment
          )} flex items-start gap-2`}
        >
          <Heart className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {sentimentAlert.sentiment === "frustrated" ? "نلاحظ أنك تبدو محبطاً" : "نلاحظ أنك تبدو متعباً"}
            </p>
            {sentimentAlert.suggestions && sentimentAlert.suggestions.length > 0 && (
              <ul className="mt-1 text-xs list-disc list-inside">
                {sentimentAlert.suggestions.slice(0, 2).map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={() => setSentimentAlert(null)} className="text-current opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user" ? "bg-blue-500 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
              }`}
            >
              <div className="text-sm">{message.content}</div>
              <div className={`text-xs mt-1 flex items-center gap-2 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                <span>{formatTime(message.timestamp)}</span>
                {message.sentiment && message.sentiment.sentiment === "positive" && <span className="text-green-600">🤩</span>}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`rounded-full p-2 transition-colors ${
              isListening ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
            disabled={isLoading}
            title={isListening ? "إيقاف التسجيل" : "بدء التسجيل الصوتي"}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || (!input.trim() && !image)}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        {image && (
          <div className="mt-2 relative inline-block">
            <img src={image} alt="Upload preview" className="h-20 w-20 object-cover rounded-lg border border-gray-300" />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-blue-600 mt-2 hover:underline flex items-center gap-1"
        >
          <Zap className="h-3 w-3" />
          إرفاق صورة سؤال
        </button>
        {isListening && <p className="text-xs text-red-600 mt-2 text-center animate-pulse">🎙️ جاري الاستماع... تحدث الآن</p>}
      </form>
    </div>
  );
}
