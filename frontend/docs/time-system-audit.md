# Time System Audit — Thanawy `/time`

This document is the contract for the Time Management & Study Productivity System:
what the domain guarantees, how time is modeled, and what breaks if you change it.

## 1. Where things live

| Layer | Location | Rules |
|---|---|---|
| Pure domain | `frontend/src/features/time/domain/` | No I/O, no `Date.now()` except via injected `now`, deterministic. |
| Adapter (anti-corruption) | `frontend/src/features/time/adapters.ts` | Only place that parses `planJson` / API rows into domain inputs. Degrades to empty, never throws. |
| UI bridge | `app/(dashboard)/time/hooks/useDailyPlan.ts` | React state + `savePlan()` merge into `planJson.dailyPlans`. |
| Dashboard | `app/(dashboard)/time/_components/dashboard/` | NowNextLater, WorkloadCard, AdvisorRecommendations, DailyPlanCard, BacklogCard (backlog + 7-day recovery plan, pure display of `analyzeBacklog`/`buildRecoveryPlan`). |
| Server-backed productivity | `features/time/api/time-gateway.ts` → `/api/v1/habits`, `/api/v1/exam-plans` (registered in `protected_routes.go`; Go models in `domain/common/time_productivity.go`; migration `0227_add_time_productivity.sql`, tables `"Habit"` / `"ExamPlan"`) | localStorage keys (`time-habits-v2`, `exam-plans`) remain the fast paint + offline cache. Hydration merges via `mergeById` (local wins on id conflict, server-only rows appended); first run bootstraps the server from local (upsert-by-id, 409 on replay). Mutations are optimistic + fire-and-forget. |
| Client-persisted state | `GoalsHabits.tsx` (goals) | `time-goals-v1` is still localStorage-only; the `time-habits-v1` → `time-habits-v2` migration (`migrateV1Habit`) still runs on first read before server hydration. |
| Focus mode | `TimeTracker.tsx` (`focusMode`) | Best-effort Fullscreen API + fixed overlay; hides stats/history/task picker; Esc via keydown or `fullscreenchange` exits. |
| Timer | `src/hooks/use-time-tracker-store.ts` | Zustand store, timestamp-based. |

## 2. Time model invariants

- **Wall-clock minutes since midnight** (`0..1440`) for all windows/blocks. No `Date` math inside the domain except `dayjs().startOf('day')` anchors.
- **`now` is injected** everywhere (functions take `now: Date` / `nowISO: string`). Tests are deterministic; UI supplies a 60s-ticking clock.
- **`localDateISO`** uses local `getFullYear/Month/Date` — never `toISOString()` (UTC shift bug).
- **daysUntil counts calendar days**, not 24h periods.
- **`isValidWindow(startMin, endMin)`**: both integers, `0 <= start < end <= 1440`. Invalid windows are filtered out, never repaired silently.
- **Buffers**: planner reserves `bufferPct` (default 15%) of daily capacity; `plannedMin <= floor(capacityMin * (1 - bufferPct))` always holds.
- **Session chunking**: sessions are 15–50 min with a 10-min gap between consecutive chunks of the same task.

## 3. Pomodoro timer semantics (drift/sleep/refresh safe)

State: `phaseStartedAt: number | null`, `elapsedBeforeCurrentRun: number` (seconds).

- While running: `elapsed = elapsedBeforeCurrentRun + (Date.now() - phaseStartedAt)/1000`.
- `tick()` never decrements; it recomputes `timeLeft = duration - elapsed`.
- **Sleep/throttle**: ticks can be skipped arbitrarily; the next tick catches up.
- **Refresh**: persist saves `phaseStartedAt`/`elapsedBeforeCurrentRun`; `onRehydrateStorage` recomputes `timeLeft`. If a full phase elapsed while closed, the next `tick()` finalizes it via `completeSession()`.
- **Pause**: accumulates into `elapsedBeforeCurrentRun`, sets `phaseStartedAt = null`.
- Do not reintroduce `timeLeft - 1` style decrementing — that is the bug this design fixes.

## 4. Scoring / risk inputs

- `scoreTasks` (scoring.ts): deadline (overdue > due-today > far), priority, low mastery, unestimated tasks never get `remainingMin = 0`. Completed/cancelled excluded.
- `assessDeadlineRisk` (deadline-risk.ts): remaining vs **real capacity** (`weeklyCapacityByDay` × active days); CRITICAL when impossible. Threshold for "critical task" placement: score ≥ 60.
- `analyzeWorkload` (workload.ts): utilization bands → status; zero capacity is safe (no NaN).
- `buildRecommendations` (advisor.ts): guards — subject-imbalance only when ≥120 min/week and ≥2 subjects sampled; overload from daily plan; every recommendation carries `reasons` (no black-box output).
- `weeklyProductivityScore` weights: adherence 30 / consistency 25 / balance 20 / goal 15 / session quality 10.
- `analyzeBacklog` (backlog.ts): ranks overdue > no-due > unscheduled, scores by days-overdue/urgency with Arabic `reasons`; `buildRecoveryPlan` spreads `totalMin` across ≤7 days of buffered capacity (`bufferPct`, default 15%) and reports `overflowMin` when infeasible. Surfaced as the `backlog_recovery` recommendation — **`RecommendationKind` additions must land in BOTH exhaustive `KIND_ICON` and `KIND_TONE` Records in `AdvisorRecommendations.tsx` or `tsc` fails.**
- Exam plan (exam-plan.ts): urgency bands PAST / TODAY (≤24h) / CLOSE (≤7d) / SCHEDULED (invalid dates → PAST, never throws); readiness = `0.6·meanConfidence + 0.4·coverage − min(40, openLinkedTasks · 5 · proximity)` with proximity ×1.5 ≤3d / ×1.0 ≤7d / ×0.5 beyond; revision-queue score = `5·(100−confidence) + 0.5·daysRemaining` (+15 never-revised), past exams excluded, deterministic topic-id tiebreak.
- Habits (habits.ts): streak/best/consistency derived from `doneDates` against injected `now` (today counts toward the streak only if marked); `habitWeekCells` returns 7 local-date cells oldest→newest with Arabic week labels (ح ن ث ر خ ج س) and an `isToday` flag; `migrateV1Habit` maps the legacy Sat-first `weekLog` booleans onto real local dates.

## 5. planJson schema

```jsonc
{
  "timeBlocks": [ { "day": "Sunday", "startTime": "16:00", "endTime": "18:00",
                    "type": "STUDY|BREAK|TASK|MEETING|WORK|SLEEP|PERSONAL|EXERCISE|MEAL|ENTERTAINMENT" } ],
  "dailyPlans": { "2026-06-01": { /* serialized DailyPlan */ } },
  "version": "2.0", "lastUpdated": "…"
}
```

- `WeeklySchedule.saveSchedule` merges into the existing object — it must keep `dailyPlans` and any future keys. Never write `{ timeBlocks }` wholesale.
- `useDailyPlan.savePlan` reads, merges `dailyPlans[plan.date]`, and writes back via `saveScheduleRaw`.
- Adapters accept `{timeBlocks}`, a raw array, and legacy date-keyed shapes; unknown block types map to `personal`.

## 6. Failure modes (designed, not accidental)

| Failure | Behavior |
|---|---|
| Malformed `planJson` | Empty windows/blocks; planner returns explainable empty plan. |
| No study windows today | Plan empty + reason surfaced in `unscheduled`/recommendations. |
| Task has no estimate | `remainingMin` defaults (never 0); planner still schedules it. |
| Overload | Workload `status: 'overloaded'`, `unscheduled[]` with per-task reasons, advisor `overload` recommendation. |
| Tab asleep 20 min | Timer loses nothing; next tick recomputes. |
| Refresh mid-pomodoro | `timeLeft` restored from timestamps; phase auto-completes if overdue. |
| Malformed `time-habits-v2` / `exam-plans` blob | `load()` degrades to defaults / `[]`; never throws mid-render. |
| Fullscreen API denied | Focus-mode overlay still works; Esc `keydown` exits (browser-Esc covered by `fullscreenchange`). |
| Overdue-task toast spam | `useOverdueNotifications` dedups per 60s tick via `lastNotifiedRef` signature (`urgent:N` / `upcoming:N` / `clear`). |
| Server sync fails (offline/backend down) | Mutations are fire-and-forget: the localStorage copy stays authoritative for the session (`syncWarn` logs via `logger.warn`, no toast spam) and the user repeating the action retries the write. Hydration failure falls back to a local-only session. |
| Confidence slider drag | Debounced 400ms per exam (`scheduleTopicsSync`) so a drag settles into one PATCH; flushed on unmount, cancelled by `revise`/`removeExam`. |

## 7. Tests

- Domain: `src/__tests__/features/time/domain-{core,scoring,scheduler,workload,metrics,advisor}.test.ts` — 42 tests.
- Domain (v2 modules): `domain-{habits,backlog,exam-plan}.test.ts` — 30 tests (date-anchored streaks, backlog recovery, exam readiness/queue). Note: `noUncheckedIndexedAccess` is on — indexed property access in tests needs `?.` (or `!` when the value feeds a strictly-typed matcher arg like `toBeGreaterThan`).
- API wiring (batch 3): `src/__tests__/features/time/api/{sync-merge,time-gateway}.test.ts` — hydration merge policy (local-wins/idempotent) + the `/api/habits` & `/api/exam-plans` route strings. Backend counterpart: `go test ./internal/infrastructure/api/handlers/protected/ -run "Habit|ExamPlan"` (sqlite in-memory — ownership, validation incl. real calendar dates, JSONB round-trip).
- Timer: `src/__tests__/hooks/time-tracker.test.ts` — 8 tests (timestamps, sleep, pause/resume, completion, early-complete, skip, reset, rehydrate).
- Run: `npx vitest run src/__tests__/features/time src/__tests__/hooks/time-tracker.test.ts` (Windows: `cmd /c "… > out.txt 2>&1"` — PowerShell `2>&1` on node stderr throws NativeCommandError).

## 8. Known limits

- Daily plan is advisory: starting a planned item doesn't auto-check the plan item off.
- `now` in the UI ticks every 60s; the plan's "Now" boundary has minute granularity.
- Recurrence rules exist in the domain but no UI emits them yet.
- Habits and exam plans are **server-backed** (`/api/v1/habits`, `/api/v1/exam-plans`) with the versioned localStorage keys kept as offline cache. Remaining gaps: no offline write queue (a failed mutation only retries when the user repeats it), no tombstones (an offline delete can be resurrected by the next hydrate), the local copy wins on id conflicts (single-device last-writer), and **goals** (`time-goals-v1`) are still client-only.
- `BacklogCard`, `ExamPlanner`, and `GoalsHabits` render domain output as-is; do not re-implement scoring/streak math in components.
- Focus mode requests browser fullscreen best-effort; the overlay behaves identically if the browser denies it.
- The tab bar now has 13 triggers (`sm:grid-cols-4 lg:grid-cols-6`) — the last row is uneven; revisit the grid if more tabs are added.
