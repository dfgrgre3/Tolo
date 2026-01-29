## 2024-05-23 - Database Aggregation for Stats
**Learning:** Calculating sums and averages in memory (Node.js) after fetching all rows is inefficient and memory-intensive. Prisma's `aggregate` function pushes this work to the database, which is much faster.
**Action:** Always prefer `prisma.aggregate` (for `_sum`, `_avg`, `_count`) over fetching `findMany` and reducing in JavaScript.

## 2024-05-23 - Streak Calculation Optimization
**Learning:** Calculating streaks by checking existence (`some`) inside a loop results in O(N^2) complexity.
**Action:** Fetch sorted dates and use a single linear scan (O(N)) to calculate consecutive days.
