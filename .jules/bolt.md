## 2024-05-22 - [Optimized Progress Summary Calculation]
**Learning:** `prisma.aggregate` is significantly faster for summing and averaging columns than fetching all rows and computing in JS. Combining this with `Promise.all` parallelization and optimized streak calculation (fetching only dates and using O(N) scan) reduced database load.
**Action:** Use `prisma.aggregate` for statistical summaries instead of `findMany` + JS reduce.
