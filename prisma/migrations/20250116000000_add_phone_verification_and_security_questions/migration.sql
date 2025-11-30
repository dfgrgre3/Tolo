-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerificationOTP" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerificationExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerificationAttempts" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerificationLastSent" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SecurityQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityQuestion_userId_idx" ON "SecurityQuestion"("userId");
CREATE INDEX IF NOT EXISTS "SecurityQuestion_userId_order_idx" ON "SecurityQuestion"("userId", "order");

