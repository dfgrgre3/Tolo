import { describe, expect, it } from 'vitest';
import {
  canTransitionEnrollment,
  deriveCourseAccessState,
} from '@thanawy/shared/types/enums';

describe('course state contract', () => {
  it('derives one coherent completed state from enrollment progress', () => {
    expect(deriveCourseAccessState({
      status: 'PUBLISHED',
      isActive: true,
      isPublished: true,
      isEnrolled: true,
      progress: 100,
    })).toMatchObject({
      lifecycle: 'PUBLISHED',
      enrollment: 'COMPLETED',
      access: 'COMPLETED',
      isComplete: true,
      certificateEligible: true,
    });
  });

  it('does not make an unpublished course available for preview', () => {
    expect(deriveCourseAccessState({
      status: 'DRAFT',
      isActive: true,
      isPublished: false,
    }).access).toBe('UNAVAILABLE');
  });

  it('does not derive completion from progress when the user is not enrolled', () => {
    expect(deriveCourseAccessState({
      status: 'PUBLISHED',
      isActive: true,
      isPublished: true,
      isEnrolled: false,
      progress: 100,
      completedAt: '2026-01-01T00:00:00Z',
    })).toMatchObject({
      enrollment: 'ELIGIBLE',
      access: 'PREVIEW',
      isComplete: false,
      certificateEligible: false,
    });
  });

  it('rejects skipping from eligible to completed', () => {
    expect(canTransitionEnrollment('ELIGIBLE', 'COMPLETED')).toBe(false);
    expect(canTransitionEnrollment('ACTIVE', 'COMPLETED')).toBe(true);
  });
});
