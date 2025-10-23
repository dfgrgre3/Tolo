-- CreateTable
CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "wakeUpTime" TEXT,
    "sleepTime" TEXT,
    "focusStrategy" TEXT DEFAULT 'POMODORO',
    "emailNotifications" BOOLEAN,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" DATETIME,
    "emailVerified" BOOLEAN,
    "lastLogin" DATETIME,
    "phone" TEXT,
    "refreshToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpires" DATETIME,
    "twoFactorEnabled" INTEGER NOT NULL DEFAULT 0,
    "twoFactorSecret" TEXT,
    "smsNotifications" BOOLEAN,
    "biometricEnabled" INTEGER NOT NULL DEFAULT 0,
    "biometricCredentials" TEXT DEFAULT '[]'
);

-- Copy data from old table to new table
INSERT INTO "User_new" ("id", "email", "name", "passwordHash", "createdAt", "updatedAt", "wakeUpTime", "sleepTime", "focusStrategy", "emailNotifications", "emailVerificationToken", "emailVerificationExpires", "emailVerified", "lastLogin", "phone", "refreshToken", "resetToken", "resetTokenExpires", "smsNotifications")
SELECT "id", "email", "name", "passwordHash", "createdAt", "updatedAt", "wakeUpTime", "sleepTime", "focusStrategy", "emailNotifications", "emailVerificationToken", "emailVerificationExpires", "emailVerified", "lastLogin", "phone", "refreshToken", "resetToken", "resetTokenExpires", "smsNotifications"
FROM "User";

-- Drop old table
DROP TABLE "User";

-- Rename new table
ALTER TABLE "User_new" RENAME TO "User";

-- Create indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
