-- CreateIndex for StudySession table on new frequently queried fields
CREATE INDEX "StudySession_userId_endTime_idx" ON "StudySession"("userId", "endTime");

CREATE INDEX "StudySession_userId_durationMin_idx" ON "StudySession"("userId", "durationMin");

-- StudySession indexes that already exist from migration 20250921000004
-- CREATE INDEX "StudySession_endTime_idx" ON "StudySession"("endTime");
-- CREATE INDEX "StudySession_durationMin_idx" ON "StudySession"("durationMin");

-- CreateIndex for Task table on new frequently queried fields
CREATE INDEX "Task_userId_priority_idx" ON "Task"("userId", "priority");

CREATE INDEX "Task_userId_dueAt_idx" ON "Task"("userId", "dueAt");

-- Task indexes that already exist from migration 20250921000004
-- CREATE INDEX "Task_priority_idx" ON "Task"("priority");
-- CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex for ProgressSnapshot table on new frequently queried fields
CREATE INDEX "ProgressSnapshot_userId_totalStudyMinutes_idx" ON "ProgressSnapshot"("userId", "totalStudyMinutes");

CREATE INDEX "ProgressSnapshot_userId_averageFocusScore_idx" ON "ProgressSnapshot"("userId", "averageFocusScore");

CREATE INDEX "ProgressSnapshot_totalStudyMinutes_idx" ON "ProgressSnapshot"("totalStudyMinutes");

CREATE INDEX "ProgressSnapshot_averageFocusScore_idx" ON "ProgressSnapshot"("averageFocusScore");

-- CreateIndex for SubjectEnrollment table on frequently queried fields
CREATE INDEX "SubjectEnrollment_userId_createdAt_idx" ON "SubjectEnrollment"("userId", "createdAt");

-- CreateIndex for ExamResult table on frequently queried fields
CREATE INDEX "ExamResult_userId_examId_idx" ON "ExamResult"("userId", "examId");

CREATE INDEX "ExamResult_userId_takenAt_idx" ON "ExamResult"("userId", "takenAt");

CREATE INDEX "ExamResult_examId_idx" ON "ExamResult"("examId");

-- CreateIndex for Schedule table on frequently queried fields
CREATE INDEX "Schedule_userId_active_createdAt_idx" ON "Schedule"("userId", "active", "createdAt");

CREATE INDEX "Schedule_userId_active_idx" ON "Schedule"("userId", "active");

-- CreateIndex for Reminder table on frequently queried fields
CREATE INDEX "Reminder_userId_remindAt_idx" ON "Reminder"("userId", "remindAt");

-- CreateIndex for Resource table on frequently queried fields
CREATE INDEX "Resource_subject_type_idx" ON "Resource"("subject", "type");

CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex for Achievement table on frequently queried fields
CREATE INDEX "Achievement_userId_key_idx" ON "Achievement"("userId", "key");

CREATE INDEX "Achievement_userId_earnedAt_idx" ON "Achievement"("userId", "earnedAt");

-- CreateIndex for Teacher table on frequently queried fields
CREATE INDEX "Teacher_subject_idx" ON "Teacher"("subject");

-- CreateIndex for OfflineLesson table on frequently queried fields
CREATE INDEX "OfflineLesson_userId_teacherId_idx" ON "OfflineLesson"("userId", "teacherId");

CREATE INDEX "OfflineLesson_userId_startTime_idx" ON "OfflineLesson"("userId", "startTime");

-- CreateIndex for Recommendation table on frequently queried fields
CREATE INDEX "Recommendation_userId_createdAt_idx" ON "Recommendation"("userId", "createdAt");