"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Zap, Trash2, Plus, Menu, Copy, Check, Sparkles, MessageSquare, BookOpen, Atom, FlaskConical, PenLine } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  deleteAiConversationRaw,
  fetchAiConversationRaw,
  fetchAiConversationsRaw,
} from '@/lib/ai/ai-client';
import { SafeMarkdown } from '@/components/SafeMarkdown';
import type { Components } from 'react-markdown';
import { useTokenStreamBuffer } from '@/app/(common)/hooks/useTokenStreamBuffer';
import { useAIWorkspace } from '../context/AIWorkspaceContext';

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

const quickSuggestions = [
  { icon: BookOpen, text: 'اشرح لي نظرية فيثاغورس بأمثلة', category: 'رياضيات' },
  { icon: Atom, text: 'ما هي قوانين نيوتن الثلاثة؟', category: 'فيزياء' },
  { icon: FlaskConical, text: 'اشرح التفاعلات الكيميائية ببساطة', category: 'كيمياء' },
  { icon: PenLine, text: 'ساعدني في كتابة موضوع تعبير', category: 'اللغة العربية' },
];

export default function AIAssistant({
  initialMessage = "مرحباً! أنا مساعدك الذكي في منصة ثناوي. كيف يمكنني مساعدتك اليوم؟",
  placeholder = "اكتب سؤالك هنا...",
  title = "المساعد الذكي",
  className = ""
}: AIAssistantProps) {
  const { context, streamChat } = useAIWorkspace();
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
  const abortRef = useRef<AbortController | null>(null);
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

  // Cancel any in-flight streaming request on unmount. Without this, a
  // reader keeps consuming the stream and calls setState after the
  // component is gone.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
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
      const data = await fetchAiConversationsRaw<{ conversations?: Conversation[] }>();
      setConversations(data?.conversations || []);
    } catch (error) {
      logger.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (showSidebar && conversations.length === 0) {
      loadConversations();
    }
  }, [conversations.length, loadConversations, showSidebar]);

  const loadConversation = async (convId: string) => {
    try {
      const payload = await fetchAiConversationRaw<{ messages?: { role: 'user' | 'assistant'; content: string; createdAt: string; id?: string }[] }>(convId);
      const loadedMessages: Message[] = payload.messages?.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        messageId: msg.id
      })) || [];

      setMessages(loadedMessages);
      setConversationId(convId);
      setShowSidebar(false);
    } catch (error) {
      logger.error('Failed to load conversation:', error);
    }
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;

    try {
      await deleteAiConversationRaw(convId);
      setConversations(conversations.filter(c => c.id !== convId));
      if (conversationId === convId) {
        startNewConversation();
      }
    } catch (error) {
      logger.error('Failed to delete conversation:', error);
    }
  };

  const startNewConversation = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([{ role: 'assistant', content: initialMessage, timestamp: new Date() }]);
    setConversationId(null);
    setShowSidebar(false);
    setIsLoading(false);
    setIsStreaming(false);
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    flush();
    setIsLoading(false);
    setIsStreaming(false);
  };

  const exportChat = () => {
    const text = messages.map((m) => `${m.role === 'user' ? 'الطالب' : 'المساعد'} [${formatTime(m.timestamp)}]:\n${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `محادثة-${conversationId ?? 'جديدة'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const retryLast = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || isLoading || isStreaming) return;
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1]?.role === 'assistant') copy.pop();
      return copy;
    });
    setInput(lastUser.content);
    if (textareaRef.current) textareaRef.current.focus();
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

  const processSSEStream = async (response: Response, signal: AbortSignal) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

    // A single SSE `data:` line can be split across several network chunks.
    // Without carrying the unfinished tail over to the next chunk, a split
    // JSON payload fails to parse and its tokens are silently dropped.
    let partial = '';

    try {
      while (true) {
        if (signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });
        const lines = partial.split('\n');
        // Keep the last (possibly incomplete) segment for the next iteration.
        partial = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            handleStreamPayload(trimmed.slice(5).trim());
          }
        }
      }
      // Flush whatever the final, unterminated line was carrying.
      const tail = partial.trim();
      if (tail.startsWith('data:')) {
        handleStreamPayload(tail.slice(5).trim());
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

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await streamChat({
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          stream: true,
          messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
          context: { ...context, feature: 'chat' },
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Server error: ${response.status} ${text.substring(0, 100)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        await processSSEStream(response, controller.signal);
        if (controller.signal.aborted) return;
      } else {
        const data = await response.json();
        const payload = data.data || data;
        const reply = payload.message || payload.reply;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: reply || 'عذراً، لم أتمكن من توليد رد. حاول مرة أخرى.',
          timestamp: new Date()
        }]);
        setConversationId(payload.conversationId || conversationId);
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' || controller.signal.aborted) return;
      logger.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error instanceof Error ? `خطأ: ${error.message}` : 'حدث خطأ في الاتصال',
        timestamp: new Date()
      }]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return;
    await handleStreamingResponse({ role: 'user', content: input.trim(), timestamp: new Date() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
    <div className={`overflow-hidden rounded-3xl border border-border bg-card shadow-sm flex h-[720px] max-h-[80vh] min-h-[540px] ${className}`}>
      {showSidebar && (
        <div className="w-72 shrink-0 border-l border-border flex flex-col bg-muted/40">
          <div className="border-b border-border p-4">
            <button
              onClick={startNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 font-bold text-primary transition-all hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" />
              <span>محادثة جديدة</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingConversations ? (
              <div className="py-8 text-center text-muted-foreground">
                <div className="animate-pulse">جاري التحميل...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">لا توجد محادثات سابقة</p>
                <p className="mt-1 text-[11px]">ابدأ سؤالك وستُحفظ محادثتك هنا تلقائياً</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`cursor-pointer rounded-xl border p-3 transition-all group ${
                    conversationId === conv.id
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-transparent bg-muted/50 hover:bg-muted hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{conv.title || 'محادثة'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(conv.updatedAt)}
                        {conv._count && conv._count.messages > 0 && (
                          <span className="me-2">({conv._count.messages} رسالة)</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="p-1 text-destructive/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="المحادثات السابقة"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="relative">
              <div className="relative p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-foreground">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={retryLast} disabled={isLoading || isStreaming} className="hidden sm:flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border hover:text-foreground disabled:opacity-50" title="إعادة توليد آخر رد">
              <Sparkles className="h-3 w-3" />
              <span>إعادة التوليد</span>
            </button>
            <button onClick={exportChat} className="hidden sm:flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border hover:text-foreground" title="تنزيل المحادثة">
              <Copy className="h-3 w-3" />
              <span>تصدير</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30">
              <Zap className="h-3 w-3" />
              <span>مساعد المذاكرة</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((message, index) => {
            const msgId = message.messageId || `msg-${index}`;
            return (
              <div
                key={msgId}
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
                      ? 'bg-primary text-primary-foreground rounded-tr-md'
                      : 'bg-muted border border-border text-foreground rounded-tl-md'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <SafeMarkdown
                        components={{
                          code: ({ className, children, ...props }) => {
                            const isInline = !className && typeof children === 'string' && !children?.toString().includes('\n');
                            if (isInline) {
                              return (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <code dir="ltr" className="block overflow-x-auto rounded-lg bg-muted p-3 text-left text-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                        } satisfies Components}
                      >
                        {message.content}
                      </SafeMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  )}
                  <div className={`flex items-center justify-between mt-3 pt-2 border-t ${
                    message.role === 'user' ? 'border-primary-foreground/20' : 'border-border'
                  }`}>
                    <span className={`text-xs ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatTime(message.timestamp)}
                    </span>
                    {message.role === 'assistant' && message.content && (
                      <button
                        onClick={() => copyToClipboard(message.content, msgId)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
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
              <div className="bg-muted border border-border rounded-2xl rounded-tl-md px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground me-2">جاري التفكير... يمكنك الضغط على إيقاف</span>
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
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">اقتراحات سريعة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickSuggestions.map((suggestion, idx) => {
                const SuggestionIcon = suggestion.icon;
                return (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  disabled={isLoading || isStreaming}
                  className="flex items-center gap-3 p-3 bg-muted/60 hover:bg-muted border border-border hover:border-primary/30 rounded-xl transition-all text-start disabled:opacity-50 group"
                >
                  <span className="rounded-lg bg-primary/10 border border-primary/20 p-2"><SuggestionIcon className="h-5 w-5 text-primary" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{suggestion.text}</div>
                    <div className="text-[10px] text-muted-foreground">{suggestion.category}</div>
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-muted/40">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 4000))}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="w-full bg-background border border-border rounded-2xl px-5 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none text-sm transition-all"
                disabled={isLoading || isStreaming}
              />
              <span className="pointer-events-none absolute bottom-2 end-4 text-[10px] text-muted-foreground">{input.length}/4000</span>
            </div>
            {(isLoading || isStreaming) ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl px-4 py-3.5 transition-all text-sm font-bold flex-shrink-0"
              >
                إيقاف
              </button>
            ) : (
              <button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl p-3.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex-shrink-0"
                disabled={!input.trim()}
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Enter للإرسال • Shift+Enter لسطر جديد • المحادثات تُحفظ في حسابك</p>
        </form>
      </div>
    </div>
  );
}

