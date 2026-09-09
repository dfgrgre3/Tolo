"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { aiClient, type AIContext } from '@/lib/ai/ai-client';

interface AIWorkspaceValue {
  context: AIContext;
  setContext: (context: Partial<AIContext>) => void;
  request: typeof aiClient.request;
  chat: typeof aiClient.chat;
  generateExam: typeof aiClient.generateExam;
  generateStudyPlan: typeof aiClient.generateStudyPlan;
  summarize: typeof aiClient.summarize;
  gradeEssay: typeof aiClient.gradeEssay;
  tips: typeof aiClient.tips;
  teachers: typeof aiClient.teachers;
  streamChat: typeof aiClient.streamChat;
  poll: typeof aiClient.poll;
}

const AIWorkspaceContext = createContext<AIWorkspaceValue | null>(null);

export function AIWorkspaceProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<AIContext>({
    app: 'thanawy',
    language: 'ar',
  });

  const setContext = useCallback((nextContext: Partial<AIContext>) => {
    setContextState((current) => ({ ...current, ...nextContext }));
  }, []);

  const withContext = useCallback((body: unknown, feature: string) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { context: { ...context, feature }, input: body };
    }

    return { ...(body as Record<string, unknown>), context: { ...context, feature } };
  }, [context]);

  const value = useMemo<AIWorkspaceValue>(() => ({
    context,
    setContext,
    request: aiClient.request,
    chat: (body, options) => aiClient.chat(withContext(body, 'chat'), options),
    generateExam: (body, options) => aiClient.generateExam(withContext(body, 'exam'), options),
    generateStudyPlan: (body, options) => aiClient.generateStudyPlan(withContext(body, 'study-planner'), options),
    summarize: (body, options) => aiClient.summarize(withContext(body, 'summarize'), options),
    gradeEssay: (body, options) => aiClient.gradeEssay(withContext(body, 'grade-essay'), options),
    tips: (body, options) => aiClient.tips(withContext(body, 'tips'), options),
    teachers: (body, options) => aiClient.teachers(withContext(body, 'teachers'), options),
    streamChat: (options) => aiClient.streamChat(options),
    poll: aiClient.poll,
  }), [context, setContext, withContext]);

  return <AIWorkspaceContext.Provider value={value}>{children}</AIWorkspaceContext.Provider>;
}

export function useAIWorkspace() {
  const value = useContext(AIWorkspaceContext);
  if (!value) throw new Error('useAIWorkspace must be used inside AIWorkspaceProvider');
  return value;
}