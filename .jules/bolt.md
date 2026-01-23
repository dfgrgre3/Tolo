## 2024-05-23 - [Server-Side Data Aggregation]
**Learning:** `getProgressSummary` in `src/lib/server-data-fetch.ts` was fetching ALL user sessions to calculate simple stats like total duration and streak, causing massive memory usage and latency for active users.
**Action:** Always check for `findMany` queries that load entire datasets for aggregation. Use `prisma.aggregate` for sums/counts/averages. For streaks, fetch ONLY the date field and sort DESC to allow early exit. Parallelize independent queries with `Promise.all`.
