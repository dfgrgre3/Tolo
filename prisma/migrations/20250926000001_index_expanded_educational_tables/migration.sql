-- CreateIndex for GradeLevel table on newly added fields
CREATE INDEX "GradeLevel_level_educationSystem_idx" ON "GradeLevel"("level", "educationSystem");

-- CreateIndex for Subject table on newly added fields
CREATE INDEX "Subject_code_isActive_idx" ON "Subject"("code", "isActive");

-- CreateIndex for Curriculum table on newly added fields
CREATE INDEX "Curriculum_gradeLevelId_subject_idx" ON "Curriculum"("gradeLevelId", "subject");

-- CreateIndex for Topic table on newly added fields
CREATE INDEX "Topic_subjectId_gradeLevelId_idx" ON "Topic"("subjectId", "gradeLevelId");

-- CreateIndex for SubTopic table on newly added fields
CREATE INDEX "SubTopic_topicId_order_idx" ON "SubTopic"("topicId", "order");