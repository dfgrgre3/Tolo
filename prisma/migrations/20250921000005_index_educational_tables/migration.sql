-- CreateIndex for GradeLevel table
CREATE INDEX "GradeLevel_level_idx" ON "GradeLevel"("level");

CREATE INDEX "GradeLevel_educationSystem_idx" ON "GradeLevel"("educationSystem");

-- CreateIndex for Subject table
CREATE INDEX "Subject_code_idx" ON "Subject"("code");

CREATE INDEX "Subject_isActive_idx" ON "Subject"("isActive");

-- CreateIndex for Topic table
CREATE INDEX "Topic_isActive_idx" ON "Topic"("isActive");

CREATE INDEX "Topic_order_idx" ON "Topic"("order");

-- CreateIndex for SubTopic table
CREATE INDEX "SubTopic_order_idx" ON "SubTopic"("order");

CREATE INDEX "SubTopic_isActive_idx" ON "SubTopic"("isActive");

-- CreateIndex for Curriculum table
CREATE INDEX "Curriculum_subject_gradeLevelId_idx" ON "Curriculum"("subject", "gradeLevelId");