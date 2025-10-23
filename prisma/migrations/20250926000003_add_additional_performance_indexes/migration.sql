-- Add indexes for frequently queried fields to improve performance

-- Add composite indexes for common query patterns
CREATE INDEX "User_email_createdAt_idx" ON "User"("email", "createdAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- Add indexes for improved SubjectEnrollment queries
CREATE INDEX "SubjectEnrollment_userId_subjectId_createdAt_idx" ON "SubjectEnrollment"("userId", "subjectId", "createdAt");

-- Add indexes for improved StudySession queries
CREATE INDEX "StudySession_userId_startTime_idx" ON "StudySession"("userId", "startTime");
CREATE INDEX "StudySession_userId_subject_startTime_idx" ON "StudySession"("userId", "subject", "startTime");
CREATE INDEX "StudySession_startTime_endTime_idx" ON "StudySession"("startTime", "endTime");

-- Add indexes for improved Task queries
CREATE INDEX "Task_userId_status_createdAt_idx" ON "Task"("userId", "status", "createdAt");
CREATE INDEX "Task_userId_subject_createdAt_idx" ON "Task"("userId", "subject", "createdAt");
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");
CREATE INDEX "Task_userId_priority_createdAt_idx" ON "Task"("userId", "priority", "createdAt");

-- Add indexes for improved Reminder queries
CREATE INDEX "Reminder_userId_remindAt_idx" ON "Reminder"("userId", "remindAt");
CREATE INDEX "Reminder_remindAt_isActive_idx" ON "Reminder"("remindAt", "isActive");

-- Add indexes for improved ProgressSnapshot queries
CREATE INDEX "ProgressSnapshot_userId_date_streakDays_idx" ON "ProgressSnapshot"("userId", "date", "streakDays");
CREATE INDEX "ProgressSnapshot_userId_streakDays_idx" ON "ProgressSnapshot"("userId", "streakDays");

-- Add indexes for improved Resource queries
CREATE INDEX "Resource_subject_type_free_idx" ON "Resource"("subject", "type", "free");

-- Add indexes for improved Exam queries
CREATE INDEX "Exam_subject_year_idx" ON "Exam"("subject", "year");

-- Add indexes for improved Session queries
CREATE INDEX "Session_userId_isActive_expiresAt_idx" ON "Session"("userId", "isActive", "expiresAt");
CREATE INDEX "Session_isActive_expiresAt_idx" ON "Session"("isActive", "expiresAt");

-- Add indexes for improved SecurityLog queries
CREATE INDEX "SecurityLog_userId_eventType_createdAt_idx" ON "SecurityLog"("userId", "eventType", "createdAt");
CREATE INDEX "SecurityLog_eventType_createdAt_idx" ON "SecurityLog"("eventType", "createdAt");

-- Add indexes for educational tables
CREATE INDEX "GradeLevel_educationSystem_level_idx" ON "GradeLevel"("educationSystem", "level");

-- Add indexes for improved Subject queries
CREATE INDEX "Subject_code_isActive_idx" ON "Subject"("code", "isActive");

-- Add indexes for improved Curriculum queries
CREATE INDEX "Curriculum_gradeLevelId_subject_createdAt_idx" ON "Curriculum"("gradeLevelId", "subject", "createdAt");

-- Add indexes for improved Topic queries
CREATE INDEX "Topic_subjectId_gradeLevelId_order_idx" ON "Topic"("subjectId", "gradeLevelId", "order");
CREATE INDEX "Topic_curriculumId_order_idx" ON "Topic"("curriculumId", "order");

-- Add indexes for improved SubTopic queries
CREATE INDEX "SubTopic_topicId_order_idx" ON "SubTopic"("topicId", "order");