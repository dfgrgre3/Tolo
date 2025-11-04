-- CreateIndex for User table on email (already exists as unique constraint, but adding for clarity)
-- CREATE UNIQUE INDEX "User_email_key" ON "User"("email"); -- Already exists

-- CreateIndex for SubjectEnrollment table on userId and subjectId (already exists)
-- CREATE INDEX "SubjectEnrollment_userId_idx" ON "SubjectEnrollment"("userId"); -- Already exists
-- CREATE INDEX "SubjectEnrollment_subjectId_idx" ON "SubjectEnrollment"("subjectId"); -- Already exists
-- CREATE UNIQUE INDEX "SubjectEnrollment_userId_subjectId_key" ON "SubjectEnrollment"("userId", "subjectId"); -- Already exists

-- CreateIndex for StudySession table on userId and subject
-- Indexes that already exist from migration 20250921000002:
-- CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");
-- CREATE INDEX "StudySession_subject_idx" ON "StudySession"("subject");
CREATE INDEX "StudySession_date_idx" ON "StudySession"("startTime");

-- CreateIndex for Task table on userId and status
-- Indexes that already exist from migration 20250921000002:
-- CREATE INDEX "Task_userId_idx" ON "Task"("userId");
-- CREATE INDEX "Task_status_idx" ON "Task"("status");
-- CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
CREATE INDEX "Task_subject_idx" ON "Task"("subject");

-- CreateIndex for Reminder table on userId and remindAt
-- Indexes that already exist from migration 20250921000002:
-- CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");
-- CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");

-- CreateIndex for ProgressSnapshot table on userId and date
-- Indexes that already exist from migration 20250921000002:
-- CREATE INDEX "ProgressSnapshot_userId_idx" ON "ProgressSnapshot"("userId");
-- CREATE INDEX "ProgressSnapshot_date_idx" ON "ProgressSnapshot"("date");

-- CreateIndex for Resource table on subject and type
-- Resource_type_idx already exists from migration 20250926000000
CREATE INDEX "Resource_subject_idx" ON "Resource"("subject");
-- CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex for Exam table on subject
CREATE INDEX "Exam_subject_idx" ON "Exam"("subject");

-- CreateIndex for GradeLevel table on educationSystem and level
-- Indexes that already exist from migration 20250921000005:
-- CREATE INDEX "GradeLevel_educationSystem_idx" ON "GradeLevel"("educationSystem");
-- CREATE INDEX "GradeLevel_level_idx" ON "GradeLevel"("level");

-- CreateIndex for Subject table on code and isActive
-- Indexes that already exist from migration 20250921000005:
-- CREATE INDEX "Subject_code_idx" ON "Subject"("code");
-- CREATE INDEX "Subject_isActive_idx" ON "Subject"("isActive");

-- CreateIndex for Curriculum table on gradeLevelId and subject
-- Indexes that already exist from migration 20250921000004:
-- CREATE INDEX "Curriculum_gradeLevelId_idx" ON "Curriculum"("gradeLevelId");
-- CREATE INDEX "Curriculum_subject_idx" ON "Curriculum"("subject");

-- CreateIndex for Topic table on subjectId, gradeLevelId, and curriculumId
-- Indexes that already exist from migration 20250921000004:
-- CREATE INDEX "Topic_subjectId_idx" ON "Topic"("subjectId");
-- CREATE INDEX "Topic_gradeLevelId_idx" ON "Topic"("gradeLevelId");
-- CREATE INDEX "Topic_curriculumId_idx" ON "Topic"("curriculumId");

-- CreateIndex for SubTopic table on topicId
-- Index that already exists from migration 20250921000004:
-- CREATE INDEX "SubTopic_topicId_idx" ON "SubTopic"("topicId");

-- CreateIndex for composite queries that are frequently used together
CREATE INDEX "StudySession_userId_subject_startTime_idx" ON "StudySession"("userId", "subject", "startTime");
CREATE INDEX "Task_userId_status_dueAt_idx" ON "Task"("userId", "status", "dueAt");
-- ProgressSnapshot_userId_date_idx already exists from migration 20250921000002
-- CREATE INDEX "ProgressSnapshot_userId_date_idx" ON "ProgressSnapshot"("userId", "date");
-- Composite indexes that already exist from migration 20250926000001:
-- CREATE INDEX "Curriculum_gradeLevelId_subject_idx" ON "Curriculum"("gradeLevelId", "subject");
-- CREATE INDEX "Topic_subjectId_gradeLevelId_idx" ON "Topic"("subjectId", "gradeLevelId");