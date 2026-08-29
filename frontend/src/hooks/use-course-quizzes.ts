"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseQuizRepository } from '@/data-access/repositories/course-quiz-repository';
import type {
  CourseQuiz,
  QuizResult,
  CreateQuizPayload,
  SubmitQuizPayload,
} from '@/types/course-quiz';

/** Fetch quizzes for a course (optionally scoped to a lesson). */
export function useCourseQuizzes(courseId?: string, lessonId?: string) {
  return useQuery({
    queryKey: ['course-quizzes', courseId, lessonId],
    queryFn: () => courseQuizRepository.getCourseQuizzes(courseId!, lessonId),
    enabled: !!courseId,
  });
}

/** Fetch a single quiz. */
export function useCourseQuiz(courseId?: string, quizId?: string) {
  return useQuery({
    queryKey: ['course-quiz', courseId, quizId],
    queryFn: () => courseQuizRepository.getQuiz(courseId!, quizId!),
    enabled: !!courseId && !!quizId,
  });
}

/** Fetch user's results for a quiz. */
export function useQuizResults(courseId?: string, quizId?: string) {
  return useQuery({
    queryKey: ['course-quiz-results', courseId, quizId],
    queryFn: () => courseQuizRepository.getQuizResults(courseId!, quizId!),
    enabled: !!courseId && !!quizId,
  });
}

/** Create a new quiz. */
export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, payload }: { courseId: string; payload: CreateQuizPayload }) =>
      courseQuizRepository.createQuiz(courseId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['course-quizzes', vars.courseId] });
    },
  });
}

/** Submit a quiz attempt. */
export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      quizId,
      payload,
    }: {
      courseId: string;
      quizId: string;
      payload: SubmitQuizPayload;
    }) => courseQuizRepository.submitQuiz(courseId, quizId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['course-quiz-results', vars.courseId, vars.quizId] });
    },
  });
}

export type { CourseQuiz, QuizResult };
