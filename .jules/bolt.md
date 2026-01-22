## 2024-05-22 - Optimizing Streak Calculation
**Learning:** Legacy streak calculation logic was O(N^2) due to nested loops and failed to account for `yesterday` correctly when `today` was present, leading to incorrect streak counts. It also fetched all fields from the database unnecessarily.
**Action:** Use `select` in Prisma to fetch only required fields (`startTime`). Implement O(N) single-pass logic for streak calculation on sorted data to ensure correctness and performance. Always verify existing tests before overwriting them.
