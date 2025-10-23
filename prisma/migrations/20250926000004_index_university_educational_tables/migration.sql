-- Create indexes for university educational tables

-- Indexes for GradeLevel table
CREATE INDEX "GradeLevel_educationSystem_level_id_idx" ON "GradeLevel"("educationSystem", "level", "id");

-- Indexes for Subject table
CREATE INDEX "Subject_code_isActive_id_idx" ON "Subject"("code", "isActive", "id");

-- Indexes for Curriculum table
CREATE INDEX "Curriculum_gradeLevelId_subject_id_idx" ON "Curriculum"("gradeLevelId", "subject", "id");

-- Indexes for Topic table
CREATE INDEX "Topic_subjectId_gradeLevelId_curriculumId_order_idx" ON "Topic"("subjectId", "gradeLevelId", "curriculumId", "order");

-- Indexes for SubTopic table
CREATE INDEX "SubTopic_topicId_order_id_idx" ON "SubTopic"("topicId", "order", "id");

-- Composite indexes for common university query patterns
CREATE INDEX "GradeLevel_educationSystem_id_idx" ON "GradeLevel"("educationSystem", "id");
CREATE INDEX "Subject_code_id_idx" ON "Subject"("code", "id");
CREATE INDEX "Curriculum_gradeLevelId_id_idx" ON "Curriculum"("gradeLevelId", "id");
CREATE INDEX "Topic_subjectId_id_idx" ON "Topic"("subjectId", "id");
CREATE INDEX "SubTopic_topicId_id_idx" ON "SubTopic"("topicId", "id");