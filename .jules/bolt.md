## 2026-01-18 - Efficient Streak Calculation & Aggregation
**Learning:** Calculating streaks or temporal stats in application code can be significantly optimized by:
1. Using `prisma.aggregate` for simple sums/averages (offloading to DB).
2. Fetching *only* the necessary fields (e.g., `createdAt`) for complex logic like streaks.
3. Avoiding nested loops (O(N*M)) in favor of single-pass sorted scans (O(N)) when processing time-series data.
**Action:** When optimizing data-heavy dashboards, split the data fetching: use `aggregate` for scalars and lightweight `findMany` (with `select`) for complex processing logic.
