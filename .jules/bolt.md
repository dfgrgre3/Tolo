## 2024-05-23 - Database Aggregations
**Learning:** Fetching full datasets to calculate sums/averages in JavaScript is a major anti-pattern. Using `prisma.aggregate` is significantly faster and reduces memory usage.
**Action:** Always prefer `prisma.aggregate` (with `_sum`, `_avg`, `_count`) over `findMany` followed by array reduction.

## 2024-05-23 - Streak Calculation Optimization
**Learning:** Calculating streaks by fetching *all* history is O(N) and unscalable. Relying purely on cached fields (like `User.currentStreak`) can be stale if the update logic is only on write.
**Action:** Fetch only `createdAt` for the last N sessions (e.g., 100) and perform the calculation in memory. This balances accuracy with performance.
