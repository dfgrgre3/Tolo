-- CreateIndex for User table on frequently queried fields
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex for StudySession table on additional fields
CREATE INDEX "StudySession_endTime_idx" ON "StudySession"("endTime");

CREATE INDEX "StudySession_durationMin_idx" ON "StudySession"("durationMin");

CREATE INDEX "StudySession_focusScore_idx" ON "StudySession"("focusScore");

-- CreateIndex for Task table on additional fields
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

CREATE INDEX "Task_updatedAt_idx" ON "Task"("updatedAt");

CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex for Reminder table on additional fields
CREATE INDEX "Reminder_createdAt_idx" ON "Reminder"("createdAt");

-- CreateIndex for ProgressSnapshot table on additional fields
CREATE INDEX "ProgressSnapshot_totalStudyMinutes_idx" ON "ProgressSnapshot"("totalStudyMinutes");

CREATE INDEX "ProgressSnapshot_averageFocusScore_idx" ON "ProgressSnapshot"("averageFocusScore");

CREATE INDEX "ProgressSnapshot_completedTasks_idx" ON "ProgressSnapshot"("completedTasks");

CREATE INDEX "ProgressSnapshot_gradeAverage_idx" ON "ProgressSnapshot"("gradeAverage");

-- SecurityLog indexes already exist from migration 20250921000001
-- CREATE INDEX "SecurityLog_createdAt_idx" ON "SecurityLog"("createdAt");
-- CREATE INDEX "SecurityLog_eventType_idx" ON "SecurityLog"("eventType");

-- Session indexes already exist from migration 20250921000000
-- CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");
-- CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
-- CREATE INDEX "Session_lastAccessed_idx" ON "Session"("lastAccessed");

-- CreateIndex for SubjectEnrollment table
CREATE INDEX "SubjectEnrollment_createdAt_idx" ON "SubjectEnrollment"("createdAt");

-- CreateIndex for Curriculum table
CREATE INDEX "Curriculum_gradeLevelId_idx" ON "Curriculum"("gradeLevelId");

CREATE INDEX "Curriculum_subject_idx" ON "Curriculum"("subject");

-- CreateIndex for Topic table
CREATE INDEX "Topic_subjectId_idx" ON "Topic"("subjectId");

CREATE INDEX "Topic_curriculumId_idx" ON "Topic"("curriculumId");

CREATE INDEX "Topic_gradeLevelId_idx" ON "Topic"("gradeLevelId");

-- CreateIndex for SubTopic table
CREATE INDEX "SubTopic_topicId_idx" ON "SubTopic"("topicId");