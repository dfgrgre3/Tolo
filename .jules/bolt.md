## 2026-01-24 - Leverage Denormalized Counters
**Learning:** The `User` model contains denormalized counters (`totalStudyTime`, `tasksCompleted`, `currentStreak`) that are maintained by `GamificationService`. Using these instead of aggregating raw data on the fly significantly improves performance for `getProgressSummary`.
**Action:** When optimizing summary/dashboard endpoints, check if the required stats are already cached/denormalized on the parent model (User) to avoid expensive joins/aggregations.

## 2026-01-24 - Database Aggregation over JS Calculation
**Learning:** Using `prisma.aggregate` for calculating averages (like `focusScore`) is much more efficient than fetching all records and calculating in JS, especially for large datasets.
**Action:** Replace JS-based aggregations with `prisma.aggregate` or `prisma.groupBy` where possible.
