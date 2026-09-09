import { describe, expect, it } from 'vitest';
import { normalizeLessonProgressResponse } from '@thanawy/shared/types/enums';

describe('progress contract', () => {
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
});
