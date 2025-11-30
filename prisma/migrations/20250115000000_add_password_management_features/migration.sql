-- ============================================
-- إضافة ميزات إدارة كلمات المرور المتقدمة
-- Add Advanced Password Management Features
-- ============================================

-- ============================================
-- 1. إضافة حقول جديدة إلى جدول User
-- ============================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordExpirationWarningSent" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 2. إنشاء جدول PasswordHistory
-- ============================================
CREATE TABLE "PasswordHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- 3. إنشاء جدول PasswordPolicy
-- ============================================
CREATE TABLE "PasswordPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL UNIQUE,
    "expirationDays" INTEGER,
    "warningDays" JSONB NOT NULL DEFAULT '[7, 3, 1]',
    "minLength" INTEGER NOT NULL DEFAULT 8,
    "maxLength" INTEGER NOT NULL DEFAULT 128,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "requireLowercase" BOOLEAN NOT NULL DEFAULT true,
    "requireNumbers" BOOLEAN NOT NULL DEFAULT true,
    "requireSpecial" BOOLEAN NOT NULL DEFAULT true,
    "bannedPasswords" JSONB NOT NULL DEFAULT '[]',
    "historyCount" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- ============================================
-- 4. إضافة الفهارس
-- ============================================
CREATE INDEX "PasswordHistory_userId_idx" ON "PasswordHistory"("userId");
CREATE INDEX "PasswordHistory_userId_createdAt_idx" ON "PasswordHistory"("userId", "createdAt");
CREATE INDEX "PasswordHistory_createdAt_idx" ON "PasswordHistory"("createdAt");

CREATE INDEX "PasswordPolicy_role_idx" ON "PasswordPolicy"("role");
CREATE INDEX "PasswordPolicy_isActive_idx" ON "PasswordPolicy"("isActive");

-- ============================================
-- 6. إدراج السياسات الافتراضية
-- ============================================
INSERT INTO "PasswordPolicy" (
    "id", 
    "role", 
    "expirationDays", 
    "warningDays", 
    "minLength", 
    "maxLength", 
    "requireUppercase", 
    "requireLowercase", 
    "requireNumbers", 
    "requireSpecial", 
    "bannedPasswords", 
    "historyCount", 
    "isActive", 
    "createdAt", 
    "updatedAt"
) VALUES 
-- Default policy for all users
(
    'default-policy-user',
    'default',
    90, -- 90 days expiration
    '[7, 3, 1]'::jsonb,
    8,
    128,
    true,
    true,
    true,
    true,
    '["password", "123456", "12345678", "123456789", "12345", "qwerty", "abc123", "password1", "admin", "welcome"]'::jsonb,
    10,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Policy for admin users (stricter)
(
    'default-policy-admin',
    'admin',
    60, -- 60 days expiration for admins
    '[7, 3, 1]'::jsonb,
    12, -- Longer minimum length
    128,
    true,
    true,
    true,
    true,
    '["password", "123456", "12345678", "123456789", "12345", "qwerty", "abc123", "password1", "admin", "welcome", "administrator"]'::jsonb,
    15, -- Keep more history
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Policy for teacher users
(
    'default-policy-teacher',
    'teacher',
    90,
    '[7, 3, 1]'::jsonb,
    8,
    128,
    true,
    true,
    true,
    true,
    '["password", "123456", "12345678", "123456789", "12345", "qwerty", "abc123", "password1", "admin", "welcome"]'::jsonb,
    10,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("role") DO NOTHING;

