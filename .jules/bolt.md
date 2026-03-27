## 2024-05-22 - [Optimizing Gamification Logic]
**Learning:** Streak calculations and user statistics (total time, average score) were being computed in-memory by fetching ALL user study sessions. This caused O(N) memory usage and O(N^2) CPU usage (due to nested loop checks for streaks).
**Action:** Use `prisma.aggregate` for sum/avg operations. For streaks, fetch ONLY `createdAt` fields ordered by date, and use a `Set` + linear scan (O(N)) to calculate consecutive days. This reduces database load and memory footprint significantly.
