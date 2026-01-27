## 2026-01-27 - [Server-Side Aggregation Optimization]
**Learning:** Fetching full datasets (e.g., all `StudySession` records) to calculate simple statistics (sum, avg) in memory is a significant performance anti-pattern. Prisma's `aggregate` function performs these calculations at the database level, which is O(1) for data transfer compared to O(N).
**Action:** Always prefer `prisma.aggregate` or `prisma.count` over `findMany().reduce()` or `.length`. Use denormalized counters (like `User.currentStreak`) when available and maintained by a reliable service (like `GamificationService`).
