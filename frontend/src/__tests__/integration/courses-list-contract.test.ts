import { describe, expect, it } from 'vitest';

describe('courses list contract', () => {
  it('defines one canonical response collection: data.items', () => {
    const response = {
      success: true,
      data: { items: [{ id: 'course-1' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    };

    expect(response.data.items).toHaveLength(1);
    expect(response.data).not.toHaveProperty('courses');
    expect(response.data).not.toHaveProperty('subjects');
  });
});
