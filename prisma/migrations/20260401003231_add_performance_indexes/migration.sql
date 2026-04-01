-- DropIndex
DROP INDEX "Schedule_userId_active_key";

-- CreateIndex
CREATE INDEX "LeaderboardEntry_totalXP_idx" ON "LeaderboardEntry"("totalXP" DESC);

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_period_totalXP_idx" ON "LeaderboardEntry"("type", "period", "totalXP" DESC);

-- CreateIndex
CREATE INDEX "LeaderboardEntry_subjectId_type_period_totalXP_idx" ON "LeaderboardEntry"("subjectId", "type", "period", "totalXP" DESC);

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");
