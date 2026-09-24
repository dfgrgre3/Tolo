import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    postJson: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api/api-client';
import {
  createExamPlan,
  createHabit,
  deleteExamPlan,
  deleteHabit,
  fetchExamPlans,
  fetchHabits,
  updateExamPlan,
  updateHabit,
} from '@/features/time/api/time-gateway';

const mocked = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  postJson: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('time-gateway routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchHabits hits GET /api/habits', async () => {
    mocked.get.mockResolvedValue([]);
    await expect(fetchHabits()).resolves.toEqual([]);
    expect(mocked.get).toHaveBeenCalledWith('/api/habits');
  });

  it('createHabit posts the entry to /api/habits', async () => {
    const entry = { id: 'h1', title: 'صباح', doneDates: [] };
    mocked.postJson.mockResolvedValue(entry);
    await createHabit(entry);
    expect(mocked.postJson).toHaveBeenCalledWith('/api/habits', entry);
  });

  it('updateHabit patches /api/habits/:id with the allowlisted payload', async () => {
    mocked.patch.mockResolvedValue({});
    await updateHabit('h1', { doneDates: ['2026-09-24'] });
    expect(mocked.patch).toHaveBeenCalledWith('/api/habits/h1', { doneDates: ['2026-09-24'] });
  });

  it('deleteHabit deletes /api/habits/:id', async () => {
    mocked.delete.mockResolvedValue({ deleted: 'h1' });
    await deleteHabit('h1');
    expect(mocked.delete).toHaveBeenCalledWith('/api/habits/h1');
  });

  it('exam plan calls target /api/exam-plans', async () => {
    const exam = { id: 'exam_1', title: 'نهائي', examAt: '2026-10-01T09:00:00.000Z', topics: [] };
    mocked.get.mockResolvedValue([]);
    mocked.postJson.mockResolvedValue(exam);
    mocked.patch.mockResolvedValue(exam);
    mocked.delete.mockResolvedValue({ deleted: 'exam_1' });

    await fetchExamPlans();
    expect(mocked.get).toHaveBeenCalledWith('/api/exam-plans');

    await createExamPlan(exam);
    expect(mocked.postJson).toHaveBeenCalledWith('/api/exam-plans', exam);

    await updateExamPlan('exam_1', { topics: [] });
    expect(mocked.patch).toHaveBeenCalledWith('/api/exam-plans/exam_1', { topics: [] });

    await deleteExamPlan('exam_1');
    expect(mocked.delete).toHaveBeenCalledWith('/api/exam-plans/exam_1');
  });
});
