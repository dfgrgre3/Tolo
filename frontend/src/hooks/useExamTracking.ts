import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

export function useExamTracking(examId: string) {
  const posthog = usePostHog();

  const trackExamStart = useCallback((title: string) => {
    posthog.capture('exam_started', {
      examId,
      examTitle: title,
      timestamp: new Date().toISOString(),
    });
  }, [posthog, examId]);

  const trackQuestionAnswered = useCallback((questionId: string, durationMs: number) => {
    posthog.capture('exam_question_answered', {
      examId,
      questionId,
      durationMs,
    });
  }, [posthog, examId]);

  const trackExamSubmit = useCallback((score?: number) => {
    posthog.capture('exam_submitted', {
      examId,
      score,
      timestamp: new Date().toISOString(),
    });
  }, [posthog, examId]);

  const trackExamError = useCallback((errorType: string, errorMessage: string, details?: any) => {
    posthog.capture('exam_error', {
      examId,
      errorType, // e.g., 'network_failure', 'autosave_failed', 'render_error'
      errorMessage,
      ...details,
    });
  }, [posthog, examId]);

  return {
    trackExamStart,
    trackQuestionAnswered,
    trackExamSubmit,
    trackExamError,
  };
}
export default useExamTracking;
