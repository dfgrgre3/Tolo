## 2024-05-23 - [Prisma Aggregation & Streak Optimization]
**Learning:** Fetching full dataset for client-side aggregation in Node.js is a significant bottleneck compared to database-side aggregation. Specifically, `studySession` fetching was fetching all fields just to sum/avg.
**Action:** Always prefer `prisma.model.aggregate` for sums and averages. for logic requiring iteration (like streaks), fetch *only* the necessary fields (e.g., `createdAt`) and use `Set` for O(1) lookups to avoid O(N^2) complexity.
