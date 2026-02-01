## 2024-05-22 - Server-Side Data Aggregation Anti-Pattern
**Learning:** Found `getProgressSummary` fetching thousands of records (`findMany`) just to calculate sum and average in JavaScript. This loads the DB network and Node.js memory unnecessarily.
**Action:** Always prefer `prisma.aggregate` for stats and fetch only minimal fields (like `createdAt`) for complex logic like streaks. Use `Promise.all` to parallelize independent DB queries.
