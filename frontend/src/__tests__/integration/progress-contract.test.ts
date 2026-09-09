import { describe, expect, it, vi } from 'vitest';
import { normalizeLessonProgressResponse } from '@thanawy/shared/types/enums';
import { readLessonProgress } from '@/lib/course-progress';
import { apiClient, unwrapApplicationPayload } from '@/lib/api/api-client';

vi.mock('@/lib/api/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/api-client')>('@/lib/api/api-client');
  return { ...actual, apiClient: { get: vi.fn() } };
});

describe('progress contract', () => {
  it('keeps the apiClient consumer on the unwrapped payload contract', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      lastWatchedPosition: 73,
      updatedAt: '2026-09-10T10:00:00.000Z',
    });

    const result = await readLessonProgress('lesson-1');

    expect(result).toEqual({
      lastWatchedPosition: 73,
      updatedAt: '2026-09-10T10:00:00.000Z',
    });
    expect(result).not.toHaveProperty('data');
    expect(unwrapApplicationPayload({ success: true, data: result })).toEqual(result);
  });

  it('normalizes lesson and course progress into one snapshot', () => {
    const snapshot = normalizeLessonProgressResponse({
      lessonProgress: 100,
      courseProgress: 100,
      isCourseComplete: true,
      certificateEligible: true,
      completedLessons: 4,
      totalLessons: 4,
    }, 'lesson-1');

    expect(snapshot.lesson).toMatchObject({ lessonId: 'lesson-1', completed: true, percentage: 100 });
    expect(snapshot.courseProgress).toBe(100);
    expect(snapshot.eligibility).toMatchObject({ isComplete: true, certificateEligible: true });
  });

  it('clamps malformed percentages and keeps completion derived centrally', () => {
    const snapshot = normalizeLessonProgressResponse({ lessonProgress: 140, courseProgress: -5 }, 'lesson-2');
    expect(snapshot.lesson.percentage).toBe(100);
    expect(snapshot.courseProgress).toBe(0);
    expect(snapshot.eligibility.isComplete).toBe(false);
  });

  it('does not treat 100% progress as completion when requirements are pending', () => {
    const snapshot = normalizeLessonProgressResponse({
      courseProgress: 100,
      requiredCourseQuizzes: 1,
      completedCourseQuizzes: 0,
    }, 'lesson-3');

    expect(snapshot.courseProgress).toBe(100);
    expect(snapshot.eligibility.isComplete).toBe(false);
    expect(snapshot.eligibility.requiredCourseQuizzes).toBe(1);
    expect(snapshot.eligibility.completedCourseQuizzes).toBe(0);
  });

  it('retains the full eligibility snapshot across a progress mutation response', () => {
    const before = normalizeLessonProgressResponse({
      courseProgress: 80,
      requiredExams: 2,
      completedRequiredExams: 1,
      requiredCourseQuizzes: 1,
      completedCourseQuizzes: 0,
    }, 'lesson-4');
    const after = normalizeLessonProgressResponse({
      courseProgress: 90,
      isCourseComplete: false,
      requiredExams: before.eligibility.requiredExams,
      completedRequiredExams: before.eligibility.completedRequiredExams,
      requiredCourseQuizzes: before.eligibility.requiredCourseQuizzes,
      completedCourseQuizzes: before.eligibility.completedCourseQuizzes,
    }, 'lesson-4');

    expect(after.eligibility).toMatchObject(before.eligibility);
    expect(after.courseProgress).toBe(90);
  });
});
