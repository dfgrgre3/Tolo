CREATE INDEX IF NOT EXISTS "StudySession_userId_startTime_id_idx"
ON "StudySession"("userId", "startTime" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Exam_subjectId_year_createdAt_id_idx"
ON "Exam"("subjectId", "year" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Exam_year_createdAt_id_idx"
ON "Exam"("year" DESC, "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "SecurityLog_userId_createdAt_id_idx"
ON "SecurityLog"("userId", "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Contest_startDate_id_idx"
ON "Contest"("startDate", "id" DESC);
