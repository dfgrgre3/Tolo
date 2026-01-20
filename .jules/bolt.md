## 2024-05-22 - Server-Side Data Aggregation Optimization
**Learning:** Moving data aggregation (sum, avg) from JavaScript application logic to the database (Prisma aggregate) significantly reduces data transfer and CPU usage. Parallelizing independent queries using `Promise.all` reduces total latency.
**Action:** When calculating statistics from large datasets, always prefer `prisma.model.aggregate` over `findMany` + JS `reduce`. Ensure independent queries are executed in parallel. For streak calculations, sorting by date allows for O(N) linear scanning instead of nested loops.
