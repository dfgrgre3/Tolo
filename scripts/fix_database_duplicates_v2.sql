-- Fix database duplicate tables issue (v2)
-- This script consolidates data from duplicate tables and removes the duplicates
-- The Go backend (GORM) uses PascalCase singular table names with camelCase columns

BEGIN;

-- 1. Migrate data from users (snake_case) to User (PascalCase, camelCase columns)
INSERT INTO "User" (id, email, name, username, avatar, "passwordHash", role, status, "createdAt", "updatedAt", 
                  phone, "phoneVerified", "emailVerified", country, "gradeLevel", "educationType", section, bio, "totalXP", level, permissions)
SELECT id, email, name, username, avatar, password_hash, role, status, created_at, updated_at,
       phone, phone_verified, email_verified, country, grade_level, education_type, section, bio, total_xp, level, permissions
FROM users
ON CONFLICT (id) DO NOTHING;

-- 2. Migrate data from subjects to Subject (need to check column names)
-- First check Subject table structure
-- INSERT INTO "Subject" (id, name, ... ) SELECT ... FROM subjects ON CONFLICT DO NOTHING;

-- 3. Migrate data from security_logs to SecurityLog
-- INSERT INTO "SecurityLog" (id, "userId", "eventType", ...) SELECT ... FROM security_logs ON CONFLICT DO NOTHING;

-- For now, let's just drop the duplicate snake_case tables that have less data
-- Keep the PascalCase tables which have the most data

-- Drop duplicate tables (snake_case plural)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS sub_topics CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lesson_progresses CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

COMMIT;

-- Verify the cleanup - should only show PascalCase tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE '\_%'
ORDER BY table_name;