/**
 * Timestamp-based Pomodoro timer tests.
 *
 * The store must derive timeLeft from (phaseStartedAt, elapsedBeforeCurrentRun)
 * so it survives interval drift, tab throttling, device sleep, and refresh.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/redirect-loop-guard', () => ({ getSessionPresence: () => 'absent' }));
vi.mock('@/features/tasks/api/tasks-gateway', () => ({
  createStudySessionRaw: vi.fn(),
  fetchTaskActualTimeRaw: vi.fn(),
  putTaskRaw: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { useTimeTrackerStore } from '@/hooks/use-time-tracker-store';

const WORK_S = 25 * 60;

function resetStore() {
  useTimeTrackerStore.setState({
    isRunning: false,
    timeLeft: WORK_S,
    currentPomodoroState: 'work',
    pomodoroCount: 0,
    sessionStartTime: null,
    phaseStartedAt: null,
    elapsedBeforeCurrentRun: 0,
    activeTaskId: null,
    activeTaskTitle: null,
    sessions: [],
    settings: {
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5,
      longBreakMinutes: 15,
      goalTarget: 4,
      soundEnabled: false,
      autoStartBreak: false,
    },
  });
}

/** Advance the fake clock and tick once (simulates one interval callback). */
function advanceAndTick(seconds: number) {
  vi.setSystemTime(Date.now() + seconds * 1000);
  useTimeTrackerStore.getState().tick();
}

describe('time-tracker-store (timestamp-based)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00'));
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives timeLeft from timestamps, not decrement', () => {
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(60);
    expect(useTimeTrackerStore.getState().timeLeft).toBe(WORK_S - 60);
  });

  it('survives a 10-minute device sleep between ticks', () => {
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(600); // no ticks fired during "sleep"
    expect(useTimeTrackerStore.getState().timeLeft).toBe(WORK_S - 600);
  });

  it('pause/resume accumulates elapsed without restarting the phase clock', () => {
    const s = useTimeTrackerStore.getState();
    s.startTimer();
    advanceAndTick(60);
    useTimeTrackerStore.getState().pauseTimer();
    // Paused time must not count.
    advanceAndTick(30);
    expect(useTimeTrackerStore.getState().timeLeft).toBe(WORK_S - 60);
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(30);
    expect(useTimeTrackerStore.getState().timeLeft).toBe(WORK_S - 90);
  });


  it('completes the session when the phase fully elapses', () => {
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(WORK_S + 5);
    const s = useTimeTrackerStore.getState();
    expect(s.currentPomodoroState).toBe('shortBreak');
    expect(s.pomodoroCount).toBe(1);
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]!.durationMin).toBe(25);
    // autoStartBreak=false → stopped, fresh break duration
    expect(s.isRunning).toBe(false);
    expect(s.timeLeft).toBe(5 * 60);
    expect(s.phaseStartedAt).toBeNull();
    expect(s.elapsedBeforeCurrentRun).toBe(0);
  });

  it('resetTimer restores a clean, full-length phase', () => {
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(120);
    useTimeTrackerStore.getState().resetTimer();
    const s = useTimeTrackerStore.getState();
    expect(s.isRunning).toBe(false);
    expect(s.timeLeft).toBe(WORK_S);
    expect(s.phaseStartedAt).toBeNull();
    expect(s.elapsedBeforeCurrentRun).toBe(0);
  });

  it('skipPhase switches to the correct next phase and stops', () => {
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(60);
    useTimeTrackerStore.getState().skipPhase();
    const s = useTimeTrackerStore.getState();
    expect(s.currentPomodoroState).toBe('shortBreak');
    expect(s.isRunning).toBe(false);
    expect(s.timeLeft).toBe(5 * 60);
  });

  it('completeSessionEarly saves elapsed minutes via timestamp math', () => {
    useTimeTrackerStore.getState().startTimer();
    advanceAndTick(180); // 3 minutes of real work
    useTimeTrackerStore.getState().completeSessionEarly();
    const s = useTimeTrackerStore.getState();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]!.durationMin).toBe(3);
    expect(s.sessions[0]!.type).toBe('work');
  });

  it('rehydrate recomputes timeLeft from persisted timestamps (refresh-safe)', async () => {
    useTimeTrackerStore.getState().startTimer();
    // 5 minutes pass with the tab closed, then the app reloads.
    vi.setSystemTime(Date.now() + 300 * 1000);
    await useTimeTrackerStore.persist.rehydrate();
    const s = useTimeTrackerStore.getState();
    expect(s.isRunning).toBe(true);
    expect(s.timeLeft).toBe(WORK_S - 300);
  });
});
