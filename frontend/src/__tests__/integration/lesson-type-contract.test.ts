import { describe, expect, it } from 'vitest';
import { toLessonCard } from '@/types/domain/mappers';

describe('lesson type contract', () => {
  it('keeps canonical lesson types unchanged', () => {
    expect(toLessonCard({ id: '1', type: 'VIDEO', durationMinutes: 1 }).type).toBe('VIDEO');
  });

  it('preserves an explicit zero order instead of treating it as missing', () => {
    expect(toLessonCard({ id: 'zero', type: 'VIDEO', order: 0 }, 4).order).toBe(0);
  });

  it('preserves every canonical backend lesson type', () => {
    expect(toLessonCard({ id: '1', type: 'LIVE', durationMinutes: 1 }).type).toBe('LIVE');
    expect(toLessonCard({ id: '2', type: 'DOCUMENT', durationMinutes: 1 }).type).toBe('DOCUMENT');
    expect(toLessonCard({ id: '3', type: 'AUDIO', durationMinutes: 1 }).type).toBe('AUDIO');
    expect(toLessonCard({ id: '4', type: 'LINK', durationMinutes: 1 }).type).toBe('LINK');
  });

  it('maps unknown server values to technical INVALID fallback', () => {
    expect(toLessonCard({ id: '5', type: 'future_type', durationMinutes: 1 }).type).toBe('INVALID');
  });
});
