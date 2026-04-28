-- Migrate data from users (snake_case) to User (PascalCase with camelCase columns)
-- Only migrate columns that exist in both tables

INSERT INTO "User" (
    id, email, name, username, avatar, 
    "passwordHash", role, status, 
    "createdAt", "updatedAt", 
    phone, "phoneVerified", "emailVerified", 
    country, "gradeLevel", "educationType", section, bio, 
    permissions
)
SELECT 
    id, email, name, username, avatar,
    password_hash, role, status,
    created_at, updated_at,
    phone, phone_verified, email_verified,
    country, grade_level, education_type, section, bio,
    permissions
FROM users 
WHERE id NOT IN (SELECT id FROM "User")
ON CONFLICT (id) DO NOTHING;

-- Verify the migration
SELECT 'users count:', count(*) FROM users
UNION ALL
SELECT 'User count:', count(*)::text FROM "User";