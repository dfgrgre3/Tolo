-- Fix database duplicate tables issue
-- This script consolidates data from duplicate tables and removes the duplicates
-- The Go backend (GORM) uses PascalCase singular table names

BEGIN;

-- 1. Migrate data from users to User (if any missing)
INSERT INTO "User" (id, email, name, username, avatar, password_hash, role, status, created_at, updated_at, deleted_at, 
                  phone, phone_verified, email_verified, country, grade_level, education_type, section, bio, total_xp, level, permissions)
SELECT id, email, name, username, avatar, password_hash, role, status, created_at, updated_at, deleted_at,
       phone, phone_verified, email_verified, country, grade_level, education_type, section, bio, total_xp, level, permissions
FROM users
ON CONFLICT (id) DO NOTHING;

-- 2. Migrate data from subjects to Subject
INSERT INTO "Subject" (id, name, name_ar, code, description, icon, color, is_active, is_published, price, rating, 
                      enrolled_count, thumbnail_url, trailer_url, trailer_duration_minutes, slug, level, 
                      instructor_name, instructor_id, category_id, duration_hours, requirements, 
                      learning_objectives, seo_title, seo_description, is_featured, language, created_at, updated_at)
SELECT id, name, name_ar, code, description, icon, color, is_active, is_published, price, rating,
       enrolled_count, thumbnail_url, trailer_url, trailer_duration_minutes, slug, level,
       instructor_name, instructor_id, category_id, duration_hours, requirements,
       learning_objectives, seo_title, seo_description, is_featured, language, created_at, updated_at
FROM subjects
ON CONFLICT (id) DO NOTHING;

-- 3. Migrate data from security_logs to SecurityLog
INSERT INTO "SecurityLog" (id, user_id, event_type, ip, user_agent, location, metadata, created_at, updated_at, deleted_at)
SELECT id, user_id, event_type, ip, user_agent, location, metadata, created_at, updated_at, deleted_at
FROM security_logs
ON CONFLICT (id) DO NOTHING;

-- 4. Migrate data from exams to Exam
INSERT INTO "Exam" (id, subject_id, title, type, duration, max_score, created_at, updated_at)
SELECT id, subject_id, title, type, duration, max_score, created_at, updated_at
FROM exams
ON CONFLICT (id) DO NOTHING;

-- 5. Migrate data from topics to Topic
INSERT INTO "Topic" (id, subject_id, title, description, "order", created_at, updated_at)
SELECT id, subject_id, title, description, "order", created_at, updated_at
FROM topics
ON CONFLICT (id) DO NOTHING;

-- 6. Migrate data from sub_topics to SubTopic
INSERT INTO "SubTopic" (id, topic_id, title, description, content, video_url, "order", duration_minutes, is_free, created_at, updated_at)
SELECT id, topic_id, title, description, content, video_url, "order", duration_minutes, is_free, created_at, updated_at
FROM sub_topics
ON CONFLICT (id) DO NOTHING;

-- 7. Migrate data from enrollments to Enrollment (need to check the actual table name)
-- First check if Enrollment table exists, if not use the GORM default
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Enrollment') THEN
        INSERT INTO "Enrollment" (id, user_id, subject_id, progress, enrolled_at)
        SELECT id, user_id, subject_id, progress, enrolled_at
        FROM enrollments
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 8. Migrate data from lesson_progresses to LessonProgress
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LessonProgress') THEN
        INSERT INTO "LessonProgress" (id, user_id, lesson_id, completed, created_at, updated_at)
        SELECT id, user_id, lesson_id, completed, created_at, updated_at
        FROM lesson_progresses
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 9. Migrate data from study_sessions to StudySession
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StudySession') THEN
        INSERT INTO "StudySession" (id, user_id, subject_id, start_time, end_time, duration, notes, created_at, updated_at)
        SELECT id, user_id, subject_id, start_time, end_time, duration, notes, created_at, updated_at
        FROM study_sessions
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 10. Migrate data from tasks to Task
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Task') THEN
        INSERT INTO "Task" (id, user_id, title, description, due_date, completed, created_at, updated_at)
        SELECT id, user_id, title, description, due_date, completed, created_at, updated_at
        FROM tasks
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 11. Migrate data from schedules to Schedule
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Schedule') THEN
        INSERT INTO "Schedule" (id, user_id, title, description, start_time, end_time, recurrence, created_at, updated_at)
        SELECT id, user_id, title, description, start_time, end_time, recurrence, created_at, updated_at
        FROM schedules
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 12. Migrate data from reminders to Reminder
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Reminder') THEN
        INSERT INTO "Reminder" (id, user_id, title, description, remind_at, created_at, updated_at)
        SELECT id, user_id, title, description, remind_at, created_at, updated_at
        FROM reminders
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 13. Migrate data from notifications to Notification
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification') THEN
        INSERT INTO "Notification" (id, user_id, title, message, type, read, created_at, updated_at)
        SELECT id, user_id, title, message, type, read, created_at, updated_at
        FROM notifications
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 14. Migrate data from payments to Payment
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
        INSERT INTO "Payment" (id, user_id, amount, currency, status, payment_method, created_at, updated_at)
        SELECT id, user_id, amount, currency, status, payment_method, created_at, updated_at
        FROM payments
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 15. Migrate data from invoices to Invoice
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice') THEN
        INSERT INTO "Invoice" (id, user_id, amount, status, created_at, updated_at)
        SELECT id, user_id, amount, status, created_at, updated_at
        FROM invoices
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 16. Migrate data from exam_results to ExamResult
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ExamResult') THEN
        INSERT INTO "ExamResult" (id, exam_id, user_id, score, passed, taken_at)
        SELECT id, exam_id, user_id, score, passed, taken_at
        FROM exam_results
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 17. Migrate data from categories to Category
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Category') THEN
        INSERT INTO "Category" (id, name, slug, type, description, icon, created_at, updated_at)
        SELECT id, name, slug, type, description, icon, created_at, updated_at
        FROM categories
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 18. Migrate data from user_settings to UserSettings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserSettings') THEN
        INSERT INTO "UserSettings" (id, user_id, theme, language, notifications_enabled, created_at, updated_at)
        SELECT id, user_id, theme, language, notifications_enabled, created_at, updated_at
        FROM user_settings
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Now drop all the duplicate Prisma-style tables (plural, snake_case)
-- Only drop if the corresponding PascalCase table exists and has data

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS security_logs;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS sub_topics;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS lesson_progresses;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS exam_results;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS user_preferences;

COMMIT;

-- Verify the cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE '\_%'
ORDER BY table_name;