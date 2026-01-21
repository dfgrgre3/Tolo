## 2026-01-21 - [O(N) Streak Calculation Optimization]
**Learning:** Found an O(N^2) nested loop for streak calculation in `src/app/api/progress/route.ts` that fetched all session columns.
**Action:** Replaced with O(N) linear scan on sorted data and used `select` to fetch only `startTime`. Always verify data fetching payload size and algorithmic complexity on frequently accessed endpoints.
