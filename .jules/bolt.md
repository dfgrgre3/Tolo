## 2025-02-18 - [Denormalized Fields for Performance]
**Learning:** The `User` model contains denormalized fields (`totalStudyTime`, `currentStreak`, `tasksCompleted`) maintained by `GamificationService`. Utilizing these fields instead of aggregating `StudySession` records provides O(1) read performance compared to O(N).
**Action:** When needing user stats, check `User` model first before aggregating related tables. Ensure `GamificationService` is used for updates to keep these fields in sync.
