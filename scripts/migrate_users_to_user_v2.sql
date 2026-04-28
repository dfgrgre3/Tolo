-- Migrate data from users (snake_case) to User (PascalCase with camelCase columns)
-- Handle type casting for enum types

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
    password_hash, 
    CASE 
        WHEN role = 'STUDENT' THEN 'STUDENT'::"UserRole"
        WHEN role = 'TEACHER' THEN 'TEACHER'::"UserRole"
        WHEN role = 'ADMIN' THEN 'ADMIN'::"UserRole"
        ELSE 'STUDENT'::"UserRole"
    END,
    CASE 
        WHEN status = 'ACTIVE' THEN 'ACTIVE'::"UserStatus"
        WHEN status = 'INACTIVE' THEN 'INACTIVE'::"UserStatus"
        WHEN status = 'SUSPENDED' THEN 'SUSPENDED'::"UserStatus"
        WHEN status = 'DELETED' THEN 'DELETED'::"UserStatus"
        ELSE 'ACTIVE'::"UserStatus"
    END,
    created_at, updated_at,
    phone, phone_verified, email_verified,
    country, grade_level, education_type, section, bio,
    permissions
FROM users 
WHERE id NOT IN (SELECT id FROM "User")
ON CONFLICT (id) DO NOTHING;

-- Verify the migration
SELECT 'users count:' || count(*)::text FROM users
UNION ALL
SELECT 'User count:' || count(*)::text FROM "User";