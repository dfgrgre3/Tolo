## 2024-05-23 - Prisma Aggregation vs JS Reduce
**Learning:** Fetching all records ('findMany') to calculate sums/averages in JS is a major bottleneck (O(N) data transfer). Using 'prisma.aggregate' pushes this to the DB (O(1) transfer).
**Action:** Always check for 'reduce' or manual counting in service logic and replace with DB aggregations where possible.
