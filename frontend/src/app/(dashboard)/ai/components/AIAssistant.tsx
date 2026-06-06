"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Zap, Trash2, Plus, Menu, Copy, Check, Sparkles, MessageSquare } from 'lucide-react';
import { logger } from '@/lib/logger';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/auth-context';
import { useTokenStreamBuffer } from '@/app/(common)/hooks/useTokenStreamBuffer';

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

const getCsrfToken = () => {
  const cookies = document.cookie.split(';').map(c => c.trim());
  for (const name of ['_csrf', 'X-CSRF-Token', 'csrf', 'csrf_token']) {
    const entry = cookies.find(c => c.startsWith(name + '='));
    if (entry) {
      try {
        return decodeURIComponent(entry.split('=')[1]!);
      } catch (_e) {
        return entry.split('=')[1];
      }
    }
  }
  return undefined;
};

const ensureCsrfToken = async () => {
  let token = getCsrfToken();
  if (!token) {
    try {
      await fetch('/api/ai/chat?action=conversations', { method: 'GET', credentials: 'include' });
      token = getCsrfToken();
    } catch (_e) {
      // ignore
    }
  }
  return token;
};

const quickSuggestions = [
  { icon: '📐', text: 'اشرح لي نظرية فيثاغورس', category: 'رياضيات' },
  { icon: '🔬', text: 'ما هي قوانين نيوتن الثلاثة؟', category: 'فيزياء' },
  { icon: '🧪', text: 'اشرح التفاعلات الكيميائية', category: 'كيمياء' },
  { icon: '📝', text: 'ساعدني في كتابة تعبير', category: 'عربي' },
];

export default function AIAssistant({
  initialMessage = "مرحباً! أنا مساعدك الذكي في منصة ثناوي. كيف يمكنني مساعدتك اليوم؟",
  placeholder = "اكتب سؤالك هنا...",
  title = "المساعد الذكي",
  className = ""
}: AIAssistantProps) {
  const { fetchWithAuth } = useAuth();
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Streaming batch handler
  const onBatch = useCallback((tokens: string[]) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.content += tokens.join('');
      }
      return newMessages;
    });
  }, []);

  const { addItem, flush } = useTokenStreamBuffer<string>(onBatch, 150);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const eventSource = eventSourceRef.current;
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetchWithAuth('/api/ai/chat?action=conversations', {
        method: 'GET'
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
  }, [fetchWithAuth]);

  useEffect(() => {
    if (showSidebar && conversations.length === 0) {
      loadConversations();
    }
  }, [conversations.length, loadConversations, showSidebar]);

  const loadConversation = async (convId: string) => {
    try {
      const response = await fetchWithAuth(`/api/ai/chat?action=conversation&id=${convId}`, {
        method: 'GET'
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

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetchWithAuth(`/api/ai/chat?id=${convId}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        }
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

  const startNewConversation = () => {
    setMessages([{ role: 'assistant', content: initialMessage, timestamp: new Date() }]);
    setConversationId(null);
    setShowSidebar(false);
  };

  const handleStreamPayload = (data: string) => {
    if (data === '[DONE]') {
      setIsStreaming(false);
      return;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.content) {
        addItem(parsed.content);
      }
      if (parsed.conversationId) setConversationId(parsed.conversationId);
      if (parsed.done) setIsStreaming(false);
    } catch (_e) {
      // Ignore partial JSON errors
    }
  };

  const processSSEStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            handleStreamPayload(line.slice(6).trim());
          }
        }
      }
      flush();
    } finally {
      reader.releaseLock();
    }
  };

  const handleStreamingResponse = async (userMessage: Message) => {
    setIsStreaming(true);
    const updatedMessages = [...messages, { ...userMessage, timestamp: new Date() }];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetchWithAuth('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          stream: true,
          messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content }))
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Server error: ${response.status} ${text.substring(0, 100)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        await processSSEStream(response);
      } else {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message || data.reply || 'عذراً، حدث خطأ',
          timestamp: new Date()
        }]);
        setConversationId(data.conversationId || conversationId);
      }
    } catch (error) {
      logger.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error instanceof Error ? `خطأ: ${error.message}` : 'حدث خطأ في الاتصال',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    await handleStreamingResponse({ role: 'user', content: input.trim(), timestamp: new Date() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      logger.error('Copy failed:', err);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

  return (
    <div className={`bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl flex h-full overflow-hidden ${className}`} style={{ height: '650px' }}>
      {showSidebar && (
        <div className="w-72 border-l border-white/10 flex flex-col bg-black/80 backdrop-blur-xl">
          <div className="p-4 border-b border-white/10">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl px-4 py-3 transition-all font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>محادثة جديدة</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingConversations ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-pulse">جاري التحميل...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد محادثات سابقة</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all group ${
                    conversationId === conv.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{conv.title || 'محادثة'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(conv.updatedAt)}
                        {conv._count && conv._count.messages > 0 && (
                          <span className="mr-2">({conv._count.messages} رسالة)</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="text-red-400/50 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="المحادثات السابقة"
            >
              <Menu className="h-5 w-5 text-gray-400" />
            </button>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
              <div className="relative p-2 bg-primary/20 rounded-lg border border-primary/30">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30">
            <Zap className="h-3 w-3" />
            <span>Gemini 2.0 Flash</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" style={{ maxHeight: '480px' }}>
          {messages.map((message, index) => {
            const msgId = `${message.messageId || index}`;
            return (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-tr-md'
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-md'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          code: ({ className, children, ...props }: any) => {
                            const isInline = !className && typeof children === 'string' && !children?.toString().includes('\n');
                            if (isInline) {
                              return (
                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <code className="block bg-black/40 p-3 rounded-lg text-sm overflow-x-auto" {...props}>
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  )}
                  <div className={`flex items-center justify-between mt-3 pt-2 border-t ${
                    message.role === 'user' ? 'border-white/20' : 'border-white/5'
                  }`}>
                    <span className={`text-xs ${message.role === 'user' ? 'text-white/60' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.role === 'assistant' && message.content && (
                      <button
                        onClick={() => copyToClipboard(message.content, msgId)}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                        title="نسخ"
                      >
                        {copiedId === msgId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            );
          })}
          {(isLoading || isStreaming) && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-md px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-500 mr-2">جاري التفكير...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && (
          <div className="px-4 sm:px-6 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">اقتراحات سريعة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  disabled={isLoading || isStreaming}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-xl transition-all text-right disabled:opacity-50 group"
                >
                  <span className="text-xl">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 group-hover:text-white truncate">{suggestion.text}</div>
                    <div className="text-[10px] text-gray-500">{suggestion.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/40">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none text-sm transition-all"
                disabled={isLoading || isStreaming}
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-black rounded-xl p-3.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex-shrink-0"
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
