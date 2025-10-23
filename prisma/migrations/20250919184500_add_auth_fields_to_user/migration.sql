-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailNotifications" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN "emailVerificationExpires" DATETIME;
ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastLogin" DATETIME;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpires" DATETIME;
ALTER TABLE "User" ADD COLUMN "smsNotifications" BOOLEAN DEFAULT false;