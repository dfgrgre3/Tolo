-- Insert additional Grade Levels for Egyptian education system
INSERT INTO "GradeLevel" (id, name, nameAr, level, educationSystem) VALUES
('gl-13', 'University Year 1', 'السنة الأولى الجامعية', 13, 'EGYPT'),
('gl-14', 'University Year 2', 'السنة الثانية الجامعية', 14, 'EGYPT'),
('gl-15', 'University Year 3', 'السنة الثالثة الجامعية', 15, 'EGYPT'),
('gl-16', 'University Year 4', 'السنة الرابعة الجامعية', 16, 'EGYPT'),
('gl-17', 'University Year 5', 'السنة الخامسة الجامعية', 17, 'EGYPT'),
('gl-18', 'University Year 6', 'السنة السادسة الجامعية', 18, 'EGYPT');

-- Insert additional Subjects for university level
INSERT INTO "Subject" (id, name, nameAr, code, description, color, icon) VALUES
('sub-med', 'Medicine', 'الطب', 'MEDICINE', 'Medical subject covering human anatomy, physiology, and medical practice', '#dc2626', 'Heart'),
('sub-engr', 'Engineering', 'الهندسة', 'ENGINEERING', 'Engineering subject covering various engineering disciplines', '#3b82f6', 'Settings'),
('sub-law', 'Law', 'القانون', 'LAW', 'Law subject covering legal principles and practices', '#000000', 'Scale'),
('sub-arch', 'Architecture', 'العمارة', 'ARCHITECTURE', 'Architecture subject covering design and construction principles', '#f59e0b', 'Building'),
('sub-pharm', 'Pharmacy', 'الصيدلة', 'PHARMACY', 'Pharmacy subject covering pharmaceutical sciences', '#10b981', 'Pill'),
('sub-dent', 'Dentistry', 'الطب الأسنان', 'DENTISTRY', 'Dentistry subject covering oral health and dental care', '#8b5cf6', 'Smile'),
('sub-nurs', 'Nursing', 'التمريض', 'NURSING', 'Nursing subject covering patient care and medical support', '#ec4899', 'Hospital'),
('sub-acc', 'Accounting', 'المحاسبة', 'ACCOUNTING', 'Accounting subject covering financial recording and reporting', '#0ea5e9', 'Calculator'),
('sub-fin', 'Finance', 'المالية', 'FINANCE', 'Finance subject covering financial management and investments', '#8b5a2b', 'DollarSign'),
('sub-mkt', 'Marketing', 'التسويق', 'MARKETING', 'Marketing subject covering promotional strategies and consumer behavior', '#22c55e', 'TrendingUp'),
('sub-mgmt', 'Management', 'الإدارة', 'MANAGEMENT', 'Management subject covering organizational leadership and operations', '#64748b', 'Users'),
('sub-cs', 'Computer Science', 'علوم الحاسب', 'COMPUTER_SCIENCE', 'Computer Science subject covering programming, algorithms, and systems', '#000000', 'Code'),
('sub-it', 'Information Technology', 'تكنولوجيا المعلومات', 'INFORMATION_TECHNOLOGY', 'Information Technology subject covering hardware, software, and networks', '#06b6d4', 'Monitor'),
('sub-is', 'Information Systems', 'نظم المعلومات', 'INFORMATION_SYSTEMS', 'Information Systems subject covering business and technology integration', '#8b5cf6', 'Database'),
('sub-stats-adv', 'Advanced Statistics', 'الإحصاء المتقدم', 'ADVANCED_STATISTICS', 'Advanced Statistics subject covering complex statistical analysis', '#f97316', 'BarChart'),
('sub-research', 'Research Methods', 'مناهج البحث', 'RESEARCH_METHODS', 'Research Methods subject covering research design and analysis', '#14b8a6', 'Search');

-- Insert Curricula for university level subjects
INSERT INTO "Curriculum" (id, name, nameAr, description, gradeLevelId, subject) VALUES
('cur-u1-med', 'University Year 1 Medicine', 'منهج الطب السنة الأولى الجامعية', 'الطب للسنة الأولى الجامعية', 'gl-13', 'MEDICINE'),
('cur-u2-med', 'University Year 2 Medicine', 'منهج الطب السنة الثانية الجامعية', 'الطب للسنة الثانية الجامعية', 'gl-14', 'MEDICINE'),
('cur-u3-med', 'University Year 3 Medicine', 'منهج الطب السنة الثالثة الجامعية', 'الطب للسنة الثالثة الجامعية', 'gl-15', 'MEDICINE'),
('cur-u4-med', 'University Year 4 Medicine', 'منهج الطب السنة الرابعة الجامعية', 'الطب للسنة الرابعة الجامعية', 'gl-16', 'MEDICINE'),
('cur-u5-med', 'University Year 5 Medicine', 'منهج الطب السنة الخامسة الجامعية', 'الطب للسنة الخامسة الجامعية', 'gl-17', 'MEDICINE'),
('cur-u6-med', 'University Year 6 Medicine', 'منهج الطب السنة السادسة الجامعية', 'الطب للسنة السادسة الجامعية', 'gl-18', 'MEDICINE'),

('cur-u1-engr', 'University Year 1 Engineering', 'منهج الهندسة السنة الأولى الجامعية', 'الهندسة للسنة الأولى الجامعية', 'gl-13', 'ENGINEERING'),
('cur-u2-engr', 'University Year 2 Engineering', 'منهج الهندسة السنة الثانية الجامعية', 'الهندسة للسنة الثانية الجامعية', 'gl-14', 'ENGINEERING'),
('cur-u3-engr', 'University Year 3 Engineering', 'منهج الهندسة السنة الثالثة الجامعية', 'الهندسة للسنة الثالثة الجامعية', 'gl-15', 'ENGINEERING'),
('cur-u4-engr', 'University Year 4 Engineering', 'منهج الهندسة السنة الرابعة الجامعية', 'الهندسة للسنة الرابعة الجامعية', 'gl-16', 'ENGINEERING'),

('cur-u1-law', 'University Year 1 Law', 'منهج القانون السنة الأولى الجامعية', 'القانون للسنة الأولى الجامعية', 'gl-13', 'LAW'),
('cur-u2-law', 'University Year 2 Law', 'منهج القانون السنة الثانية الجامعية', 'القانون للسنة الثانية الجامعية', 'gl-14', 'LAW'),
('cur-u3-law', 'University Year 3 Law', 'منهج القانون السنة الثالثة الجامعية', 'القانون للسنة الثالثة الجامعية', 'gl-15', 'LAW'),
('cur-u4-law', 'University Year 4 Law', 'منهج القانون السنة الرابعة الجامعية', 'القانون للسنة الرابعة الجامعية', 'gl-16', 'LAW'),

('cur-u1-arch', 'University Year 1 Architecture', 'منهج العمارة السنة الأولى الجامعية', 'العمارة للسنة الأولى الجامعية', 'gl-13', 'ARCHITECTURE'),
('cur-u2-arch', 'University Year 2 Architecture', 'منهج العمارة السنة الثانية الجامعية', 'العمارة للسنة الثانية الجامعية', 'gl-14', 'ARCHITECTURE'),
('cur-u3-arch', 'University Year 3 Architecture', 'منهج العمارة السنة الثالثة الجامعية', 'العمارة للسنة الثالثة الجامعية', 'gl-15', 'ARCHITECTURE'),
('cur-u4-arch', 'University Year 4 Architecture', 'منهج العمارة السنة الرابعة الجامعية', 'العمارة للسنة الرابعة الجامعية', 'gl-16', 'ARCHITECTURE'),
('cur-u5-arch', 'University Year 5 Architecture', 'منهج العمارة السنة الخامسة الجامعية', 'العمارة للسنة الخامسة الجامعية', 'gl-17', 'ARCHITECTURE'),

('cur-u1-cs', 'University Year 1 Computer Science', 'منهج علوم الحاسب السنة الأولى الجامعية', 'علوم الحاسب للسنة الأولى الجامعية', 'gl-13', 'COMPUTER_SCIENCE'),
('cur-u2-cs', 'University Year 2 Computer Science', 'منهج علوم الحاسب السنة الثانية الجامعية', 'علوم الحاسب للسنة الثانية الجامعية', 'gl-14', 'COMPUTER_SCIENCE'),
('cur-u3-cs', 'University Year 3 Computer Science', 'منهج علوم الحاسب السنة الثالثة الجامعية', 'علوم الحاسب للسنة الثالثة الجامعية', 'gl-15', 'COMPUTER_SCIENCE'),
('cur-u4-cs', 'University Year 4 Computer Science', 'منهج علوم الحاسب السنة الرابعة الجامعية', 'علوم الحاسب للسنة الرابعة الجامعية', 'gl-16', 'COMPUTER_SCIENCE');

-- Insert Topics for university level curricula
INSERT INTO "Topic" (id, name, nameAr, subjectId, curriculumId, gradeLevelId, "order") VALUES
-- University Year 1 Medicine Topics
('topic-u1-med-anat', 'Anatomy', 'التشريح', 'sub-med', 'cur-u1-med', 'gl-13', 1),
('topic-u1-med-physio', 'Physiology', 'الفيزيولوجيا', 'sub-med', 'cur-u1-med', 'gl-13', 2),
('topic-u1-med-biochem', 'Biochemistry', 'الكيمياء الحيوية', 'sub-med', 'cur-u1-med', 'gl-13', 3),
('topic-u1-med-histology', 'Histology', 'علم الانسجة', 'sub-med', 'cur-u1-med', 'gl-13', 4),

-- University Year 2 Medicine Topics
('topic-u2-med-path', 'Pathology', 'علم المرض', 'sub-med', 'cur-u2-med', 'gl-14', 1),
('topic-u2-med-micro', 'Microbiology', 'علم الأحياء الدقيقة', 'sub-med', 'cur-u2-med', 'gl-14', 2),
('topic-u2-med-pharm', 'Pharmacology', 'علم الأدوية', 'sub-med', 'cur-u2-med', 'gl-14', 3),
('topic-u2-med-imm', 'Immunology', 'علم المناعة', 'sub-med', 'cur-u2-med', 'gl-14', 4),

-- University Year 1 Computer Science Topics
('topic-u1-cs-intro', 'Introduction to Programming', 'مقدمة في البرمجة', 'sub-cs', 'cur-u1-cs', 'gl-13', 1),
('topic-u1-cs-algo', 'Algorithms and Data Structures', 'الخوارزميات وهياكل البيانات', 'sub-cs', 'cur-u1-cs', 'gl-13', 2),
('topic-u1-cs-math', 'Discrete Mathematics', 'الرياضيات المتقطعة', 'sub-cs', 'cur-u1-cs', 'gl-13', 3),
('topic-u1-cs-comp', 'Computer Architecture', 'عمارة الحاسوب', 'sub-cs', 'cur-u1-cs', 'gl-13', 4),

-- University Year 2 Computer Science Topics
('topic-u2-cs-oop', 'Object-Oriented Programming', 'البرمجة الكائنية التوجه', 'sub-cs', 'cur-u2-cs', 'gl-14', 1),
('topic-u2-cs-db', 'Databases', 'قواعد البيانات', 'sub-cs', 'cur-u2-cs', 'gl-14', 2),
('topic-u2-cs-os', 'Operating Systems', 'نظم التشغيل', 'sub-cs', 'cur-u2-cs', 'gl-14', 3),
('topic-u2-cs-net', 'Computer Networks', 'شبكات الحاسوب', 'sub-cs', 'cur-u2-cs', 'gl-14', 4),

-- University Year 1 Engineering Topics
('topic-u1-engr-math', 'Engineering Mathematics', 'الرياضيات الهندسية', 'sub-engr', 'cur-u1-engr', 'gl-13', 1),
('topic-u1-engr-phys', 'Engineering Physics', 'الفيزياء الهندسية', 'sub-engr', 'cur-u1-engr', 'gl-13', 2),
('topic-u1-engr-chem', 'Engineering Chemistry', 'الكيمياء الهندسية', 'sub-engr', 'cur-u1-engr', 'gl-13', 3),
('topic-u1-engr-draw', 'Engineering Drawing', 'الرسم الهندسي', 'sub-engr', 'cur-u1-engr', 'gl-13', 4),

-- University Year 1 Law Topics
('topic-u1-law-hist', 'History of Law', 'تاريخ القانون', 'sub-law', 'cur-u1-law', 'gl-13', 1),
('topic-u1-law-const', 'Constitutional Law', 'القانون الدستوري', 'sub-law', 'cur-u1-law', 'gl-13', 2),
('topic-u1-law-civil', 'Civil Law', 'القانون المدني', 'sub-law', 'cur-u1-law', 'gl-13', 3),
('topic-u1-law-crim', 'Criminal Law', 'القانون الجنائي', 'sub-law', 'cur-u1-law', 'gl-13', 4);

-- Insert SubTopics for university level topics
INSERT INTO "SubTopic" (id, name, nameAr, topicId, "order") VALUES
-- University Year 1 Medicine - Anatomy SubTopics
('subtopic-u1-med-anat-1', 'Gross Anatomy', 'التشريح العام', 'topic-u1-med-anat', 1),
('subtopic-u1-med-anat-2', 'Surface Anatomy', 'تشريح الأسطح', 'topic-u1-med-anat', 2),
('subtopic-u1-med-anat-3', 'Radiological Anatomy', 'التشريح الإشعاعي', 'topic-u1-med-anat', 3),
('subtopic-u1-med-anat-4', 'Clinical Anatomy', 'التشريح السريري', 'topic-u1-med-anat', 4),

-- University Year 1 Computer Science - Introduction to Programming SubTopics
('subtopic-u1-cs-intro-1', 'Variables and Data Types', 'المتغيرات وأنواع البيانات', 'topic-u1-cs-intro', 1),
('subtopic-u1-cs-intro-2', 'Control Structures', 'هياكل التحكم', 'topic-u1-cs-intro', 2),
('subtopic-u1-cs-intro-3', 'Functions', 'الدوال', 'topic-u1-cs-intro', 3),
('subtopic-u1-cs-intro-4', 'Arrays and Lists', 'المصفوفات والقوائم', 'topic-u1-cs-intro', 4),

-- University Year 1 Engineering - Engineering Mathematics SubTopics
('subtopic-u1-engr-math-1', 'Calculus', 'التفاضل والتكامل', 'topic-u1-engr-math', 1),
('subtopic-u1-engr-math-2', 'Linear Algebra', 'الجبر الخطي', 'topic-u1-engr-math', 2),
('subtopic-u1-engr-math-3', 'Differential Equations', 'المعادلات التفاضلية', 'topic-u1-engr-math', 3),
('subtopic-u1-engr-math-4', 'Probability and Statistics', 'الاحتمال والإحصاء', 'topic-u1-engr-math', 4),

-- University Year 1 Law - Constitutional Law SubTopics
('subtopic-u1-law-const-1', 'Concept of Constitution', 'مفهوم الدستور', 'topic-u1-law-const', 1),
('subtopic-u1-law-const-2', 'Sources of Constitution', 'مصادر الدستور', 'topic-u1-law-const', 2),
('subtopic-u1-law-const-3', 'Fundamental Rights', 'الحقوق الأساسية', 'topic-u1-law-const', 3),
('subtopic-u1-law-const-4', 'Separation of Powers', 'فصل السلطات', 'topic-u1-law-const', 4);