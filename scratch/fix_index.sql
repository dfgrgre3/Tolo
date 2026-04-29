DROP INDEX IF EXISTS "idx_UserSettings_user_id";
CREATE UNIQUE INDEX "idx_UserSettings_user_id" ON "UserSettings"("userId");
