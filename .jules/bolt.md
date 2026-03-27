## 2026-01-30 - Optimized Progress Summary
**Learning:** Using `prisma.aggregate` instead of fetching all records and reducing in JS reduced memory usage significantly. Streak calculation on sorted dates is O(N) vs O(N^2).
**Action:** Prefer `aggregate` for stats and minimal `select` for logic.
