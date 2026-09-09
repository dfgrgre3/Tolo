"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseQuizRepository } from '@/data-access/repositories/course-quiz-repository';
import type {
  CourseQuiz,
  StudentCourseQuiz,
  QuizResult,
  CreateQuizPayload,
  SubmitQuizPayload,
  StartQuizResponse,
  QuizResultsSummary,
} from '@/types/course-quiz';

/** Fetch every quiz belonging to a course. */
export function useCourseQuizzes(courseId?: string) {
  return useQuery<CourseQuiz[]>({
    queryKey: ['course-quizzes', courseId],
    queryFn: () => courseQuizRepository.getCourseQuizzes(courseId!),
    enabled: !!courseId,
  });
}

/** Fetch the quiz activity attached to one lesson (at most one by contract). */
export function useLessonQuizzes(courseId?: string, lessonId?: string) {
  return useQuery<StudentCourseQuiz[]>({
    queryKey: ['lesson-quizzes', courseId, lessonId],
    queryFn: () => courseQuizRepository.getLessonQuizzes(courseId!, lessonId!),
    enabled: !!courseId && !!lessonId,
  });
}

/** Fetch a single quiz by id. */
export function useCourseQuiz(courseId?: string, quizId?: string) {
  return useQuery<StudentCourseQuiz>({
    queryKey: ['course-quiz', courseId, quizId],
    queryFn: () => courseQuizRepository.getQuiz(courseId!, quizId!),
    enabled: !!courseId && !!quizId,
  });
}

/** Fetch user's results for a quiz. */
export function useQuizResults(courseId?: string, quizId?: string) {
  return useQuery<QuizResultsSummary>({
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
      qc.invalidateQueries({ queryKey: ['course-enrollment-status', vars.courseId] });
      qc.invalidateQueries({ queryKey: ['course-lessons', vars.courseId] });
    },
  });
}

export function useStartQuiz() {
  return useMutation({
    mutationFn: ({ courseId, quizId }: { courseId: string; quizId: string }) =>
      courseQuizRepository.startQuiz(courseId, quizId),
  });
}

export type { CourseQuiz, QuizResult };
export type { StartQuizResponse };
