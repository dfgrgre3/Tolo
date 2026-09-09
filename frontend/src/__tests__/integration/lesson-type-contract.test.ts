import { describe, expect, it } from 'vitest';
import { toLessonCard } from '@/types/domain/mappers';

describe('lesson type contract', () => {
  it('keeps canonical lesson types unchanged', () => {
    expect(toLessonCard({ id: '1', type: 'VIDEO', durationMinutes: 1 }).type).toBe('VIDEO');
  });

  it('maps wider or unknown server values to technical INVALID fallback', () => {
    expect(toLessonCard({ id: '1', type: 'LIVE', durationMinutes: 1 }).type).toBe('INVALID');
    expect(toLessonCard({ id: '2', type: 'DOCUMENT', durationMinutes: 1 }).type).toBe('INVALID');
    expect(toLessonCard({ id: '3', type: 'future_type', durationMinutes: 1 }).type).toBe('INVALID');
  });
});
