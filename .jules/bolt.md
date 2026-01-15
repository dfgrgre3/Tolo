# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY
## 2024-05-23 - [Prisma Aggregation Optimization]
**Learning:** Offloading calculations like `SUM` and `AVG` to the database using `prisma.aggregate` is significantly more efficient than fetching all rows and computing in Node.js, especially for large datasets. Parallelizing independent DB queries with `Promise.all` reduces latency.
**Action:** Look for other `findMany` calls followed by `reduce` operations and replace them with `aggregate` or `groupBy` where possible.
