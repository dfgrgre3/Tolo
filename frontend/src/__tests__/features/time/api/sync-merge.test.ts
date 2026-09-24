import { describe, expect, it } from 'vitest';
import { mergeById } from '@/features/time/api/sync-merge';

interface Row {
  id: string;
  title: string;
}

describe('mergeById', () => {
  it('returns local rows unchanged when the server is empty', () => {
    const local: Row[] = [{ id: 'a', title: 'local a' }];
    expect(mergeById(local, [])).toEqual(local);
  });

  it('adopts the server collection wholesale when local is empty', () => {
    const server: Row[] = [
      { id: 's1', title: 'from device B' },
      { id: 's2', title: 'also device B' },
    ];
    expect(mergeById([], server)).toEqual(server);
  });

  it('appends server-only ids after the local rows, preserving order', () => {
    const local: Row[] = [
      { id: 'l1', title: 'local 1' },
      { id: 'l2', title: 'local 2' },
    ];
    const server: Row[] = [
      { id: 's1', title: 'server 1' },
      { id: 'l1', title: 'stale server copy of l1' },
      { id: 's2', title: 'server 2' },
    ];
    const merged = mergeById(local, server);
    // local wins on id conflict for the same id:
    expect(merged.map((r) => r.id)).toEqual(['l1', 'l2', 's1', 's2']);
    expect(merged[0]?.title).toBe('local 1');
  });

  it('is idempotent across repeated hydrations of the same payload', () => {
    const local: Row[] = [{ id: 'a', title: 'A' }];
    const server: Row[] = [
      { id: 'a', title: 'server A' },
      { id: 'b', title: 'B' },
    ];
    const once = mergeById(local, server);
    const twice = mergeById(once, server);
    expect(twice).toEqual(once);
    expect(twice.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('handles empty inputs without throwing', () => {
    expect(mergeById([], [])).toEqual([]);
  });
});
