-- Migration 0033: Recreate materialized views with correct column names
-- Replaces 0027 which had incorrect camelCase column references.
-- Uses actual snake_case column names from the production DB.

-- ============================================================
-- 1. User Progress Summary
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_user_progress_summary;

CREATE MATERIALIZED VIEW mv_user_progress_summary AS
SELECT
    u.id AS user_id,
    u.total_xp AS "totalXP",
    u.level,
    u.current_streak AS "currentStreak",
    u.longest_streak AS "longestStreak",
    u.total_study_time AS "totalStudyTime",
    u.tasks_completed AS "tasksCompleted",
    u.exams_passed AS "examsPassed",

    -- Aggregated from TopicProgress
    COALESCE(tp.lessons_completed, 0) AS lessons_completed,
    COALESCE(tp.total_time_seconds, 0) AS total_time_seconds,
    COALESCE(tp.in_progress_count, 0) AS in_progress_count,

    -- Aggregated from StudySession (last 7 days)
    COALESCE(ss.weekly_minutes, 0) AS weekly_study_minutes,
    COALESCE(ss.weekly_sessions, 0) AS weekly_sessions,
    COALESCE(ss.weekly_avg_focus, 0) AS weekly_avg_focus,

    -- Aggregated from ExamResult
    COALESCE(er.total_exams_taken, 0) AS total_exams_taken,
    COALESCE(er.total_exams_passed, 0) AS total_exams_passed,

    -- Enrollment
    COALESCE(enr.active_subjects, 0) AS active_subjects,

    -- Metadata
    NOW() AS computed_at
FROM "User" u
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE tp.completed) AS lessons_completed,
        COALESCE(SUM(tp.time_spent_seconds), 0) AS total_time_seconds,
        COUNT(*) FILTER (WHERE tp.status = 'IN_PROGRESS') AS in_progress_count
    FROM "TopicProgress" tp
    WHERE tp.user_id = u.id AND tp.deleted_at IS NULL
) tp ON true
LEFT JOIN LATERAL (
    SELECT
        COALESCE(SUM(ss.duration_min), 0) AS weekly_minutes,
        COUNT(*) AS weekly_sessions,
        COALESCE(AVG(ss.focus_score), 0) AS weekly_avg_focus
    FROM "StudySession" ss
    WHERE ss.user_id = u.id AND ss.start_time >= NOW() - INTERVAL '7 days'
) ss ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_exams_taken,
        COUNT(*) FILTER (WHERE er.passed) AS total_exams_passed
    FROM "ExamResult" er
    WHERE er.user_id = u.id
) er ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS active_subjects
    FROM "SubjectEnrollment" enr
    WHERE enr.user_id = u.id AND enr.deleted_at IS NULL
) enr ON true
WHERE u.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_progress_user_id ON mv_user_progress_summary (user_id);

-- ============================================================
-- 2. User Weekly Analytics
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_user_weekly_analytics;

CREATE MATERIALIZED VIEW mv_user_weekly_analytics AS
SELECT
    u.id AS user_id,

    -- Study session stats for past 7 days
    COALESCE(SUM(ss.duration_min), 0) AS total_study_minutes,
    COUNT(DISTINCT ss.id) AS total_sessions,
    COUNT(DISTINCT DATE(ss.start_time)) AS active_days,

    -- Task completion
    COALESCE(tsk.total_tasks, 0) AS total_tasks,
    COALESCE(tsk.completed_tasks, 0) AS completed_tasks,
    CASE
        WHEN COALESCE(tsk.total_tasks, 0) > 0
        THEN ROUND(tsk.completed_tasks::numeric / tsk.total_tasks * 100, 1)
        ELSE 0
    END AS completion_rate,

    -- XP earned this week
    COALESCE((
        SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" wt
        WHERE wt.user_id = u.id
        AND wt.type = 'xp_earned'
        AND wt.created_at >= NOW() - INTERVAL '7 days'
    ), 0) AS weekly_xp_earned,

    NOW() AS computed_at
FROM "User" u
LEFT JOIN "StudySession" ss ON ss.user_id = u.id AND ss.start_time >= NOW() - INTERVAL '7 days'
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks
    FROM "Task" t
    WHERE t.user_id = u.id
      AND (t.created_at >= NOW() - INTERVAL '7 days' OR t.updated_at >= NOW() - INTERVAL '7 days')
) tsk ON true
WHERE u.deleted_at IS NULL
GROUP BY u.id, tsk.total_tasks, tsk.completed_tasks;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_weekly_user_id ON mv_user_weekly_analytics (user_id);

-- ============================================================
-- 3. User Watch Time (video/subtopic time tracking)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_user_watch_time;

CREATE MATERIALIZED VIEW mv_user_watch_time AS
SELECT
    tp.user_id,
    subj.id AS subject_id,
    subj.name AS subject_name,
    t.id AS topic_id,
    t.title AS topic_title,
    st.id AS sub_topic_id,
    st.title AS sub_topic_title,
    st.type AS sub_topic_type,
    tp.status,
    tp.completed,
    tp.time_spent_seconds,
    tp.last_watched_position,
    tp.updated_at AS last_activity,

    -- Subject-level aggregation for rollup queries
    SUM(tp.time_spent_seconds) OVER (PARTITION BY tp.user_id, subj.id) AS total_subject_seconds,
    SUM(tp.time_spent_seconds) OVER (PARTITION BY tp.user_id, t.id) AS total_topic_seconds,

    NOW() AS computed_at
FROM "TopicProgress" tp
JOIN "SubTopic" st ON st.id = tp.sub_topic_id AND st.deleted_at IS NULL
JOIN "Topic" t ON t.id = st.topic_id AND t.deleted_at IS NULL
JOIN "Subject" subj ON subj.id = t.subject_id AND subj.deleted_at IS NULL
WHERE tp.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_watch_time_user_subtopic ON mv_user_watch_time (user_id, sub_topic_id);
CREATE INDEX IF NOT EXISTS idx_mv_watch_time_subject ON mv_user_watch_time (user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_mv_watch_time_topic ON mv_user_watch_time (user_id, topic_id);
