"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Zap, MessageSquare, Trash2, Plus, Menu } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId?: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

interface AIAssistantProps {
  initialMessage?: string;
  placeholder?: string;
  title?: string;
  className?: string;
}

export default function AIAssistant({
  initialMessage = "مرحباً! أنا مساعدك الذكي في منصة ثناوي. كيف يمكنني مساعدتك اليوم؟",
  placeholder = "اكتب سؤالك هنا...",
  title = "المساعد الذكي",
  className = ""
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // التمرير التلقائي إلى آخر رسالة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // تحميل المحادثات عند فتح الشريط الجانبي
  useEffect(() => {
    if (showSidebar && conversations.length === 0) {
      loadConversations();
    }
  }, [showSidebar]);

  // تنظيف EventSource عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // تحميل المحادثات
  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch('/api/ai/chat?action=conversations', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      logger.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // تحميل محادثة محددة
  const loadConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/ai/chat?action=conversation&id=${convId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = data.messages?.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          messageId: msg.id
        })) || [];
        
        setMessages(loadedMessages);
        setConversationId(convId);
        setShowSidebar(false);
      }
    } catch (error) {
      logger.error('Failed to load conversation:', error);
    }
  };

  // حذف محادثة
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
      return;
    }

    try {
      const response = await fetch(`/api/ai/chat?id=${convId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setConversations(conversations.filter(c => c.id !== convId));
        if (conversationId === convId) {
          startNewConversation();
        }
      }
    } catch (error) {
      logger.error('Failed to delete conversation:', error);
    }
  };

  // بدء محادثة جديدة
  const startNewConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date()
      }
    ]);
    setConversationId(null);
    setShowSidebar(false);
  };

  // معالجة الاستجابة المتدفقة (SSE)
  const handleStreamingResponse = async (userMessage: Message) => {
    setIsStreaming(true);
    const newUserMessage = { ...userMessage, timestamp: new Date() };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId,
          stream: true,
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // التحقق مما إذا كانت الاستجابة متدفقة
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        // معالجة SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let newConversationId = conversationId;

        // إضافة رسالة المساعد الفارغة
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          timestamp: new Date()
        }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                setIsStreaming(false);
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.content) {
                  assistantContent += parsed.content;
                  // تحديث رسالة المساعد
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      lastMsg.content = assistantContent;
                    }
                    return newMessages;
                  });
                }

                if (parsed.conversationId) {
                  newConversationId = parsed.conversationId;
                  setConversationId(parsed.conversationId);
                }

                if (parsed.done) {
                  setIsStreaming(false);
                }
              } catch (e) {
                // تجاهل أخطاء التحليل للبيانات الجزئية
              }
            }
          }
        }
      } else {
        // استجابة JSON عادية
        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || data.reply || 'عذراً، حدث خطأ في المعالجة',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(data.conversationId || conversationId);
      }
    } catch (error) {
      logger.error('Streaming error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error ? `خطأ: ${error.message}` : 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // إرسال الرسالة (غير متدفق)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // استخدام التدفق افتراضياً
    await handleStreamingResponse(userMessage);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg flex h-full ${className}`} style={{ height: '600px' }}>
      {/* الشريط الجانبي للمحادثات */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>محادثة جديدة</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingConversations ? (
              <div className="text-center text-gray-500 py-4">جاري التحميل...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-4">لا توجد محادثات سابقة</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`p-3 rounded-lg mb-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                    conversationId === conv.id ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {conv.title || 'محادثة'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(conv.updatedAt)}
                        {conv._count && conv._count.messages > 0 && (
                          <span className="mr-2">({conv._count.messages} رسالة)</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* منطقة المحادثة الرئيسية */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="المحادثات السابقة"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            <Zap className="h-3 w-3" />
            <span>Qwen 3.6 Plus</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '450px' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-none'
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {(isLoading || isStreaming) && !isStreaming && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
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
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || isStreaming}
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || isStreaming || !input.trim()}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}