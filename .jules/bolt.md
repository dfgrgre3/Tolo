## 2024-05-22 - Denormalized Gamification Fields
**Learning:** The `User` model contains denormalized gamification fields (`totalStudyTime`, `tasksCompleted`, `currentStreak`) updated by `GamificationService`. Using these fields instead of aggregating `StudySession` records is critical for performance as the dataset grows.
**Action:** Always check the `User` model for pre-calculated stats before implementing manual aggregations for progress summaries.
