import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';

interface AIRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

interface APIEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AIContext {
  app: 'thanawy';
  language: 'ar';
  subject?: string;
  year?: string;
  feature?: string;
}

export interface AIJob<T = unknown> {
  jobId: string;
  status: string;
  result?: T;
  error?: string;
}

function unwrap<T>(payload: T | APIEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const envelope = payload as APIEnvelope<T>;
    if (envelope.success === true && 'data' in envelope) return envelope.data as T;
  }
  return payload as T;
}

export async function aiRequest<T>(endpoint: string, options: AIRequestOptions = {}): Promise<T> {
  const response = await apiClient.fetch(endpoint, options);
  const payload = await response.json() as T | APIEnvelope<T>;
  return unwrap(payload);
}

export const aiClient = {
  request: aiRequest,
  streamChat: (options: AIRequestOptions = {}) => apiClient.fetch(apiRoutes.ai.chat, {
    ...options,
    method: 'POST',
  }),
  chat: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.chat, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  generateExam: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.exam, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  generateStudyPlan: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.studyPlanner, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  summarize: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.summarize, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  gradeEssay: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.gradeEssay, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  tips: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.tips, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  teachers: <T>(body: unknown, options: AIRequestOptions = {}) => aiRequest<T>(apiRoutes.ai.teachers, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  }),
  poll: async <T>(endpoint: string, jobId: string, options: AIRequestOptions = {}) =>
    aiRequest<T>(`${endpoint}/${encodeURIComponent(jobId)}`, options),
};
