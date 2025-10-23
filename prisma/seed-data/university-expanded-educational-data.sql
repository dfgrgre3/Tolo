-- Insert additional Grade Levels for university education systems
INSERT INTO "GradeLevel" (id, name, nameAr, level, educationSystem) VALUES
('gl-u-19', 'University Year 7', 'السنة السابعة الجامعية', 19, 'EGYPT'),
('gl-u-20', 'University Year 8', 'السنة الثامنة الجامعية', 20, 'EGYPT'),
('gl-u-21', 'University Year 9', 'السنة التاسعة الجامعية', 21, 'EGYPT'),
('gl-u-22', 'University Year 10', 'السنة العاشرة الجامعية', 22, 'EGYPT');

-- Insert additional Subjects for higher university levels
INSERT INTO "Subject" (id, name, nameAr, code, description, color, icon) VALUES
('sub-phd', 'PhD', 'الدكتوراه', 'PHD', 'Doctor of Philosophy subject covering advanced research', '#000000', 'GraduationCap'),
('sub-edu', 'Education', 'التعليم', 'EDUCATION', 'Education subject covering pedagogy and educational theory', '#f59e0b', 'Book'),
('sub-journal', 'Journalism', 'الصحافة', 'JOURNALISM', 'Journalism subject covering media and reporting', '#3b82f6', 'Newspaper'),
('sub-comm', 'Communications', 'الاتصال', 'COMMUNICATIONS', 'Communications subject covering media and interpersonal communication', '#8b5cf6', 'MessageCircle'),
('sub-theo', 'Theology', 'اللاهوت', 'THEOLOGY', 'Theology subject covering religious studies and beliefs', '#f97316', 'Crosshair'),
('sub-philos', 'Philosophy', 'الفلسفة', 'PHILOSOPHY', 'Philosophy subject covering fundamental questions about existence', '#ec4899', 'Brain'),
('sub-ling', 'Linguistics', 'اللغويات', 'LINGUISTICS', 'Linguistics subject covering language structure and development', '#0ea5e9', 'Languages'),
('sub-anthro', 'Anthropology', 'الأنثروبولوجيا', 'ANTHROPOLOGY', 'Anthropology subject covering human societies and cultures', '#8b5a2b', 'Users'),
('sub-polisci', 'Political Science', 'العلوم السياسية', 'POLITICAL_SCIENCE', 'Political Science subject covering government and political behavior', '#64748b', 'MapPin'),
('sub-econ-dev', 'Development Economics', 'اقتصاد التنمية', 'DEV_ECONOMICS', 'Development Economics subject covering economic development theories', '#10b981', 'TrendingUp'),
('sub-eco-env', 'Environmental Economics', 'الاقتصاد البيئي', 'ENV_ECONOMICS', 'Environmental Economics subject covering environment and economy interactions', '#22c55e', 'Leaf'),
('sub-hist-art', 'Art History', 'تاريخ الفن', 'ART_HISTORY', 'Art History subject covering artistic movements and works', '#a855f7', 'Image'),
('sub-hist-music', 'Music History', 'تاريخ الموسيقى', 'MUSIC_HISTORY', 'Music History subject covering musical development', '#f43f5e', 'Music'),
('sub-arch-ancient', 'Ancient History', 'التاريخ القديم', 'ANCIENT_HISTORY', 'Ancient History subject covering ancient civilizations', '#8b5a2b', 'Scroll'),
('sub-arch-modern', 'Modern History', 'التاريخ الحديث', 'MODERN_HISTORY', 'Modern History subject covering recent historical events', '#000000', 'Clock');

-- Insert Curricula for higher university level subjects
INSERT INTO "Curriculum" (id, name, nameAr, description, gradeLevelId, subject) VALUES
('cur-u7-med', 'University Year 7 Medicine', 'منهج الطب السنة السابعة الجامعية', 'الطب للسنة السابعة الجامعية', 'gl-u-19', 'MEDICINE'),
('cur-u8-med', 'University Year 8 Medicine', 'منهج الطب السنة الثامنة الجامعية', 'الطب للسنة الثامنة الجامعية', 'gl-u-20', 'MEDICINE'),
('cur-u9-med', 'University Year 9 Medicine', 'منهج الطب السنة التاسعة الجامعية', 'الطب للسنة التاسعة الجامعية', 'gl-u-21', 'MEDICINE'),
('cur-u10-med', 'University Year 10 Medicine', 'منهج الطب السنة العاشرة الجامعية', 'الطب للسنة العاشرة الجامعية', 'gl-u-22', 'MEDICINE'),

('cur-u5-law', 'University Year 5 Law', 'منهج القانون السنة الخامسة الجامعية', 'القانون للسنة الخامسة الجامعية', 'gl-17', 'LAW'),
('cur-u6-law', 'University Year 6 Law', 'منهج القانون السنة السادسة الجامعية', 'القانون للسنة السادسة الجامعية', 'gl-18', 'LAW'),

('cur-u5-arch', 'University Year 5 Architecture', 'منهج العمارة السنة الخامسة الجامعية', 'العمارة للسنة الخامسة الجامعية', 'gl-17', 'ARCHITECTURE'),
('cur-u6-arch', 'University Year 6 Architecture', 'منهج العمارة السنة السادسة الجامعية', 'العمارة للسنة السادسة الجامعية', 'gl-18', 'ARCHITECTURE'),

('cur-u5-engr', 'University Year 5 Engineering', 'منهج الهندسة السنة الخامسة الجامعية', 'الهندسة للسنة الخامسة الجامعية', 'gl-17', 'ENGINEERING'),
('cur-u6-engr', 'University Year 6 Engineering', 'منهج الهندسة السنة السادسة الجامعية', 'الهندسة للسنة السادسة الجامعية', 'gl-18', 'ENGINEERING'),

('cur-u1-phd', 'University Year 1 PhD', 'منهج الدكتوراه السنة الأولى الجامعية', 'الدكتوراه للسنة الأولى الجامعية', 'gl-13', 'PHD'),
('cur-u2-phd', 'University Year 2 PhD', 'منهج الدكتوراه السنة الثانية الجامعية', 'الدكتوراه للسنة الثانية الجامعية', 'gl-14', 'PHD'),
('cur-u3-phd', 'University Year 3 PhD', 'منهج الدكتوراه السنة الثالثة الجامعية', 'الدكتوراه للسنة الثالثة الجامعية', 'gl-15', 'PHD'),
('cur-u4-phd', 'University Year 4 PhD', 'منهج الدكتوراه السنة الرابعة الجامعية', 'الدكتوراه للسنة الرابعة الجامعية', 'gl-16', 'PHD'),
('cur-u5-phd', 'University Year 5 PhD', 'منهج الدكتوراه السنة الخامسة الجامعية', 'الدكتوراه للسنة الخامسة الجامعية', 'gl-17', 'PHD');

-- Insert Topics for higher university level curricula
INSERT INTO "Topic" (id, name, nameAr, subjectId, curriculumId, gradeLevelId, "order") VALUES
-- University Year 7-10 Medicine Topics (Specializations)
('topic-u7-med-cardio', 'Cardiology', 'أمراض القلب', 'sub-med', 'cur-u7-med', 'gl-u-19', 1),
('topic-u7-med-neuro', 'Neurology', 'أمراض الأعصاب', 'sub-med', 'cur-u7-med', 'gl-u-19', 2),
('topic-u8-med-onco', 'Oncology', 'علم الأورام', 'sub-med', 'cur-u8-med', 'gl-u-20', 1),
('topic-u8-med-ortho', 'Orthopedics', 'جراحة العظام', 'sub-med', 'cur-u8-med', 'gl-u-20', 2),
('topic-u9-med-ped', 'Pediatrics', 'أمراض الأطفال', 'sub-med', 'cur-u9-med', 'gl-u-21', 1),
('topic-u9-med-psy', 'Psychiatry', 'الطب النفسي', 'sub-med', 'cur-u9-med', 'gl-u-21', 2),
('topic-u10-med-surg', 'General Surgery', 'الجراحة العامة', 'sub-med', 'cur-u10-med', 'gl-u-22', 1),
('topic-u10-med-emerg', 'Emergency Medicine', 'طب الطوارئ', 'sub-med', 'cur-u10-med', 'gl-u-22', 2),

-- University Year 5-6 Law Topics (Advanced Specializations)
('topic-u5-law-intl', 'International Law', 'القانون الدولي', 'sub-law', 'cur-u5-law', 'gl-17', 1),
('topic-u5-law-hr', 'Human Rights Law', 'قانون حقوق الإنسان', 'sub-law', 'cur-u5-law', 'gl-17', 2),
('topic-u6-law-corp', 'Corporate Law', 'قانون الشركات', 'sub-law', 'cur-u6-law', 'gl-18', 1),
('topic-u6-law-env', 'Environmental Law', 'القانون البيئي', 'sub-law', 'cur-u6-law', 'gl-18', 2),

-- University Year 5-6 Architecture Topics (Advanced Design)
('topic-u5-arch-urban', 'Urban Planning', 'التخطيط العمراني', 'sub-arch', 'cur-u5-arch', 'gl-17', 1),
('topic-u5-arch-sustain', 'Sustainable Architecture', 'العمارة المستدامة', 'sub-arch', 'cur-u5-arch', 'gl-17', 2),
('topic-u6-arch-heritage', 'Heritage Conservation', 'الحفاظ على التراث', 'sub-arch', 'cur-u6-arch', 'gl-18', 1),
('topic-u6-arch-digital', 'Digital Architecture', 'العمارة الرقمية', 'sub-arch', 'cur-u6-arch', 'gl-18', 2),

-- University Year 5-6 Engineering Topics (Advanced Specializations)
('topic-u5-engr-ai', 'Artificial Intelligence', 'الذكاء الاصطناعي', 'sub-engr', 'cur-u5-engr', 'gl-17', 1),
('topic-u5-engr-renew', 'Renewable Energy', 'الطاقة المتجددة', 'sub-engr', 'cur-u5-engr', 'gl-17', 2),
('topic-u6-engr-robot', 'Robotics', 'الروبوتات', 'sub-engr', 'cur-u6-engr', 'gl-18', 1),
('topic-u6-engr-nano', 'Nanotechnology', 'التكنولوجيا النانوية', 'sub-engr', 'cur-u6-engr', 'gl-18', 2),

-- PhD Topics (Research Areas)
('topic-u1-phd-resmeth', 'Research Methods', 'مناهج البحث', 'sub-phd', 'cur-u1-phd', 'gl-13', 1),
('topic-u1-phd-stats', 'Advanced Statistics', 'الإحصاء المتقدم', 'sub-phd', 'cur-u1-phd', 'gl-13', 2),
('topic-u2-phd-literature', 'Literature Review', 'مراجعة الأدبيات', 'sub-phd', 'cur-u2-phd', 'gl-14', 1),
('topic-u2-phd-thesis', 'Thesis Development', 'تطوير الأطروحة', 'sub-phd', 'cur-u2-phd', 'gl-14', 2),
('topic-u3-phd-data', 'Data Collection', 'جمع البيانات', 'sub-phd', 'cur-u3-phd', 'gl-15', 1),
('topic-u3-phd-analysis', 'Data Analysis', 'تحليل البيانات', 'sub-phd', 'cur-u3-phd', 'gl-15', 2),
('topic-u4-phd-writing', 'Academic Writing', 'الكتابة الأكاديمية', 'sub-phd', 'cur-u4-phd', 'gl-16', 1),
('topic-u4-phd-publish', 'Publishing Research', 'نشر الأبحاث', 'sub-phd', 'cur-u4-phd', 'gl-16', 2),
('topic-u5-phd-defense', 'Thesis Defense', 'الدفاع عن الأطروحة', 'sub-phd', 'cur-u5-phd', 'gl-17', 1);

-- Insert SubTopics for advanced university topics
INSERT INTO "SubTopic" (id, name, nameAr, topicId, "order") VALUES
-- University Year 7 Medicine - Cardiology SubTopics
('subtopic-u7-med-cardio-1', 'Cardiac Anatomy', 'تشريح القلب', 'topic-u7-med-cardio', 1),
('subtopic-u7-med-cardio-2', 'Electrocardiography', 'تسجيل القلب الكهربائي', 'topic-u7-med-cardio', 2),
('subtopic-u7-med-cardio-3', 'Heart Failure', 'فشل القلب', 'topic-u7-med-cardio', 3),
('subtopic-u7-med-cardio-4', 'Coronary Artery Disease', 'أمراض الشرايين التاجية', 'topic-u7-med-cardio', 4),

-- University Year 7 Medicine - Neurology SubTopics
('subtopic-u7-med-neuro-1', 'Neuroanatomy', 'تشريح الأعصاب', 'topic-u7-med-neuro', 1),
('subtopic-u7-med-neuro-2', 'Cerebrovascular Disease', 'أمراض الأوعية الدموية في الدماغ', 'topic-u7-med-neuro', 2),
('subtopic-u7-med-neuro-3', 'Neurodegenerative Diseases', 'الأمراض التنكسية العصبية', 'topic-u7-med-neuro', 3),
('subtopic-u7-med-neuro-4', 'Epilepsy', 'الصرع', 'topic-u7-med-neuro', 4),

-- University Year 1 PhD - Research Methods SubTopics
('subtopic-u1-phd-resmeth-1', 'Qualitative Research', 'البحث النوعي', 'topic-u1-phd-resmeth', 1),
('subtopic-u1-phd-resmeth-2', 'Quantitative Research', 'البحث الكمي', 'topic-u1-phd-resmeth', 2),
('subtopic-u1-phd-resmeth-3', 'Mixed Methods', 'الأساليب المختلطة', 'topic-u1-phd-resmeth', 3),
('subtopic-u1-phd-resmeth-4', 'Ethical Considerations', 'الاعتبارات الأخلاقية', 'topic-u1-phd-resmeth', 4);