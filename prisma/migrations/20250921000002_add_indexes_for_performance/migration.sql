-- CreateIndex for User table
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE INDEX "User_lastLogin_idx" ON "User"("lastLogin");

-- CreateIndex for Task table
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

CREATE INDEX "Task_status_idx" ON "Task"("status");

CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex for StudySession table
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");

CREATE INDEX "StudySession_subject_idx" ON "StudySession"("subject");

CREATE INDEX "StudySession_userId_startTime_idx" ON "StudySession"("userId", "startTime");

-- CreateIndex for SubjectEnrollment table
CREATE INDEX "SubjectEnrollment_userId_idx" ON "SubjectEnrollment"("userId");

CREATE INDEX "SubjectEnrollment_subject_idx" ON "SubjectEnrollment"("subject");

-- CreateIndex for Reminder table
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");

-- CreateIndex for ProgressSnapshot table
CREATE INDEX "ProgressSnapshot_userId_idx" ON "ProgressSnapshot"("userId");

CREATE INDEX "ProgressSnapshot_date_idx" ON "ProgressSnapshot"("date");

CREATE INDEX "ProgressSnapshot_userId_date_idx" ON "ProgressSnapshot"("userId", "date");