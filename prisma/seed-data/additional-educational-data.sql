-- Insert additional Grade Levels for other education systems
INSERT INTO "GradeLevel" (id, name, nameAr, level, educationSystem) VALUES
('gl-us-1', 'Kindergarten', 'رياض الأطفال', -1, 'US'),
('gl-us-0', 'Pre-Kindergarten', 'ما قبل رياض الأطفال', -2, 'US'),
('gl-us-13', 'College Freshman', 'السنة الأولى الجامعية', 13, 'US'),
('gl-us-14', 'College Sophomore', 'السنة الثانية الجامعية', 14, 'US'),
('gl-us-15', 'College Junior', 'السنة الثالثة الجامعية', 15, 'US'),
('gl-us-16', 'College Senior', 'السنة الرابعة الجامعية', 16, 'US');

-- Insert additional Subjects
INSERT INTO "Subject" (id, name, nameAr, code, description, color, icon) VALUES
('sub-comp-sci', 'Computer Science', 'علوم الحاسب', 'COMP_SCI', 'Computer Science subject covering programming, algorithms, and data structures', '#000000', 'Code'),
('sub-econ', 'Economics', 'الاقتصاد', 'ECONOMICS', 'Economics subject covering micro and macro economics', '#3b82f6', 'BarChart'),
('sub-business', 'Business', 'إدارة الأعمال', 'BUSINESS', 'Business subject covering management, marketing, and entrepreneurship', '#8b5cf6', 'Briefcase'),
('sub-psych', 'Psychology', 'علم النفس', 'PSYCHOLOGY', 'Psychology subject covering human behavior and mental processes', '#ec4899', 'Brain'),
('sub-soc', 'Sociology', 'علم الإجتماع', 'SOCIOLOGY', 'Sociology subject covering society, social behavior, and institutions', '#f59e0b', 'Users'),
('sub-anth', 'Anthropology', 'الأنثروبولوجيا', 'ANTHROPOLOGY', 'Anthropology subject covering human cultures and societies', '#8b5a2b', 'Globe'),
('sub-stats', 'Statistics', 'الإحصاء', 'STATISTICS', 'Statistics subject covering data analysis and probability', '#22c55e', 'PieChart'),
('sub-calculus', 'Calculus', 'التفاضل والتكامل', 'CALCULUS', 'Advanced mathematics covering limits, derivatives, and integrals', '#ef4444', 'Function'),
('sub-trig', 'Trigonometry', 'حساب المثلثات', 'TRIGONOMETRY', 'Mathematics subject covering triangles and trigonometric functions', '#0ea5e9', 'Triangle'),
('sub-geom', 'Geometry', 'الهندسة', 'GEOMETRY', 'Mathematics subject covering shapes, sizes, and properties of space', '#8b5cf6', 'Shapes'),
('sub-alg', 'Algebra', 'الجبر', 'ALGEBRA', 'Mathematics subject covering symbols and the rules for manipulating them', '#10b981', 'Variable'),
('sub-prealg', 'Pre-Algebra', 'ما قبل الجبر', 'PRE_ALGEBRA', 'Introductory mathematics preparing students for algebra', '#f97316', 'Divide'),
('sub-earth-sci', 'Earth Science', 'علوم الأرض', 'EARTH_SCIENCE', 'Science subject covering geology, meteorology, and oceanography', '#06b6d4', 'Mountain'),
('sub-astr', 'Astronomy', 'علم الفلك', 'ASTRONOMY', 'Science subject covering celestial objects and phenomena', '#64748b', 'Star'),
('sub-env-sci', 'Environmental Science', 'علوم البيئة', 'ENVIRONMENTAL_SCIENCE', 'Science subject covering the environment and ecosystems', '#22c55e', 'Leaf'),
('sub-eng-lit', 'English Literature', 'الأدب الإنجليزي', 'ENGLISH_LITERATURE', 'English subject covering literature analysis and interpretation', '#8b5a2b', 'BookOpen'),
('sub-eng-lang', 'English Language', 'اللغة الإنجليزية', 'ENGLISH_LANGUAGE', 'English subject covering grammar and composition', '#000000', 'Pen'),
('sub-world-hist', 'World History', 'تاريخ العالم', 'WORLD_HISTORY', 'History subject covering global historical events', '#8b5cf6', 'Globe'),
('sub-us-hist', 'US History', 'تاريخ الولايات المتحدة', 'US_HISTORY', 'History subject covering United States historical events', '#ef4444', 'Flag');

-- Insert additional Curricula for different grade levels and subjects
INSERT INTO "Curriculum" (id, name, nameAr, description, gradeLevelId, subject) VALUES
('cur-g7-eng-lang', 'Grade 7 English Language', 'منهج اللغة الإنجليزية الصف الأول الإعدادي', 'اللغة الإنجليزية للصف الأول الإعدادي', 'gl-7', 'ENGLISH_LANGUAGE'),
('cur-g8-eng-lang', 'Grade 8 English Language', 'منهج اللغة الإنجليزية الصف الثاني الإعدادي', 'اللغة الإنجليزية للصف الثاني الإعدادي', 'gl-8', 'ENGLISH_LANGUAGE'),
('cur-g9-eng-lang', 'Grade 9 English Language', 'منهج اللغة الإنجليزية الصف الثالث الإعدادي', 'اللغة الإنجليزية للصف الثالث الإعدادي', 'gl-9', 'ENGLISH_LANGUAGE'),
('cur-g7-eng-lit', 'Grade 7 English Literature', 'منهج الأدب الإنجليزية الصف الأول الإعدادي', 'الأدب الإنجليزية للصف الأول الإعدادي', 'gl-7', 'ENGLISH_LITERATURE'),
('cur-g8-eng-lit', 'Grade 8 English Literature', 'منهج الأدب الإنجليزية الصف الثاني الإعدادي', 'الأدب الإنجليزية للصف الثاني الإعدادي', 'gl-8', 'ENGLISH_LITERATURE'),
('cur-g9-eng-lit', 'Grade 9 English Literature', 'منهج الأدب الإنجليزية الصف الثالث الإعدادي', 'الأدب الإنجليزية للصف الثالث الإعدادي', 'gl-9', 'ENGLISH_LITERATURE'),
('cur-g10-eng-lang', 'Grade 10 English Language', 'منهج اللغة الإنجليزية الصف الأول الثانوي', 'اللغة الإنجليزية للصف الأول الثانوي', 'gl-10', 'ENGLISH_LANGUAGE'),
('cur-g11-eng-lang', 'Grade 11 English Language', 'منهج اللغة الإنجليزية الصف الثاني الثانوي', 'اللغة الإنجليزية للصف الثاني الثانوي', 'gl-11', 'ENGLISH_LANGUAGE'),
('cur-g12-eng-lang', 'Grade 12 English Language', 'منهج اللغة الإنجليزية الصف الثالث الثانوي', 'اللغة الإنجليزية للصف الثالث الثانوي', 'gl-12', 'ENGLISH_LANGUAGE'),
('cur-g10-eng-lit', 'Grade 10 English Literature', 'منهج الأدب الإنجليزية الصف الأول الثانوي', 'الأدب الإنجليزية للصف الأول الثانوي', 'gl-10', 'ENGLISH_LITERATURE'),
('cur-g11-eng-lit', 'Grade 11 English Literature', 'منهج الأدب الإنجليزية الصف الثاني الثانوي', 'الأدب الإنجليزية للصف الثاني الثانوي', 'gl-11', 'ENGLISH_LITERATURE'),
('cur-g12-eng-lit', 'Grade 12 English Literature', 'منهج الأدب الإنجليزية الصف الثالث الثانوي', 'الأدب الإنجليزية للصف الثالث الثانوي', 'gl-12', 'ENGLISH_LITERATURE'),
('cur-g10-world-hist', 'Grade 10 World History', 'منهج تاريخ العالم الصف الأول الثانوي', 'تاريخ العالم للصف الأول الثانوي', 'gl-10', 'WORLD_HISTORY'),
('cur-g11-world-hist', 'Grade 11 World History', 'منهج تاريخ العالم الصف الثاني الثانوي', 'تاريخ العالم للصف الثاني الثانوي', 'gl-11', 'WORLD_HISTORY'),
('cur-g12-world-hist', 'Grade 12 World History', 'منهج تاريخ العالم الصف الثالث الثانوي', 'تاريخ العالم للصف الثالث الثانوي', 'gl-12', 'WORLD_HISTORY'),
('cur-g10-us-hist', 'Grade 10 US History', 'منهج تاريخ الولايات المتحدة الصف الأول الثانوي', 'تاريخ الولايات المتحدة للصف الأول الثانوي', 'gl-10', 'US_HISTORY'),
('cur-g11-us-hist', 'Grade 11 US History', 'منهج تاريخ الولايات المتحدة الصف الثاني الثانوي', 'تاريخ الولايات المتحدة للصف الثاني الثانوي', 'gl-11', 'US_HISTORY'),
('cur-g12-us-hist', 'Grade 12 US History', 'منهج تاريخ الولايات المتحدة الصف الثالث الثانوي', 'تاريخ الولايات المتحدة للصف الثالث الثانوي', 'gl-12', 'US_HISTORY'),
('cur-g10-comp-sci', 'Grade 10 Computer Science', 'منهج علوم الحاسب الصف الأول الثانوي', 'علوم الحاسب للصف الأول الثانوي', 'gl-10', 'COMP_SCI'),
('cur-g11-comp-sci', 'Grade 11 Computer Science', 'منهج علوم الحاسب الصف الثاني الثانوي', 'علوم الحاسب للصف الثاني الثانوي', 'gl-11', 'COMP_SCI'),
('cur-g12-comp-sci', 'Grade 12 Computer Science', 'منهج علوم الحاسب الصف الثالث الثانوي', 'علوم الحاسب للصف الثالث الثانوي', 'gl-12', 'COMP_SCI'),
('cur-g10-econ', 'Grade 10 Economics', 'منهج الاقتصاد الصف الأول الثانوي', 'الاقتصاد للصف الأول الثانوي', 'gl-10', 'ECONOMICS'),
('cur-g11-econ', 'Grade 11 Economics', 'منهج الاقتصاد الصف الثاني الثانوي', 'الاقتصاد للصف الثاني الثانوي', 'gl-11', 'ECONOMICS'),
('cur-g12-econ', 'Grade 12 Economics', 'منهج الاقتصاد الصف الثالث الثانوي', 'الاقتصاد للصف الثالث الثانوي', 'gl-12', 'ECONOMICS');

-- Insert additional Topics for various curricula
INSERT INTO "Topic" (id, name, nameAr, subjectId, curriculumId, gradeLevelId, "order") VALUES
-- Grade 10 Computer Science Topics
('topic-g10-cs-intro', 'Introduction to Programming', 'مقدمة في البرمجة', 'sub-comp-sci', 'cur-g10-comp-sci', 'gl-10', 1),
('topic-g10-cs-alg', 'Algorithms', 'الخوارزميات', 'sub-comp-sci', 'cur-g10-comp-sci', 'gl-10', 2),
('topic-g10-cs-data', 'Data Structures', 'هياكل البيانات', 'sub-comp-sci', 'cur-g10-comp-sci', 'gl-10', 3),

-- Grade 11 Computer Science Topics
('topic-g11-cs-oop', 'Object-Oriented Programming', 'البرمجة الكائنية التوجه', 'sub-comp-sci', 'cur-g11-comp-sci', 'gl-11', 1),
('topic-g11-cs-db', 'Databases', 'قواعد البيانات', 'sub-comp-sci', 'cur-g11-comp-sci', 'gl-11', 2),
('topic-g11-cs-web', 'Web Development', 'تطوير الويب', 'sub-comp-sci', 'cur-g11-comp-sci', 'gl-11', 3),

-- Grade 12 Computer Science Topics
('topic-g12-cs-adv', 'Advanced Programming', 'البرمجة المتقدمة', 'sub-comp-sci', 'cur-g12-comp-sci', 'gl-12', 1),
('topic-g12-cs-ai', 'Artificial Intelligence', 'الذكاء الاصطناعي', 'sub-comp-sci', 'cur-g12-comp-sci', 'gl-12', 2),
('topic-g12-cs-soft', 'Software Engineering', 'هندسة البرمجيات', 'sub-comp-sci', 'cur-g12-comp-sci', 'gl-12', 3),

-- Grade 10 Economics Topics
('topic-g10-econ-intro', 'Introduction to Economics', 'مقدمة في الاقتصاد', 'sub-econ', 'cur-g10-econ', 'gl-10', 1),
('topic-g10-econ-micro', 'Microeconomics', 'الاقتصاد الجزئي', 'sub-econ', 'cur-g10-econ', 'gl-10', 2),
('topic-g10-econ-macro', 'Macroeconomics', 'الاقتصاد الكلي', 'sub-econ', 'cur-g10-econ', 'gl-10', 3),

-- Grade 11 Economics Topics
('topic-g11-econ-behav', 'Behavioral Economics', 'الاقتصاد السلوكي', 'sub-econ', 'cur-g11-econ', 'gl-11', 1),
('topic-g11-econ-dev', 'Development Economics', 'اقتصاد التنمية', 'sub-econ', 'cur-g11-econ', 'gl-11', 2),
('topic-g11-econ-intl', 'International Economics', 'الاقتصاد الدولي', 'sub-econ', 'cur-g11-econ', 'gl-11', 3),

-- Grade 12 Economics Topics
('topic-g12-econ-fin', 'Financial Economics', 'الاقتصاد المالي', 'sub-econ', 'cur-g12-econ', 'gl-12', 1),
('topic-g12-econ-pub', 'Public Economics', 'الاقتصاد العام', 'sub-econ', 'cur-g12-econ', 'gl-12', 2),
('topic-g12-econ-env', 'Environmental Economics', 'الاقتصاد البيئي', 'sub-econ', 'cur-g12-econ', 'gl-12', 3),

-- Grade 10 World History Topics
('topic-g10-wh-ancient', 'Ancient Civilizations', 'الحضارات القديمة', 'sub-world-hist', 'cur-g10-world-hist', 'gl-10', 1),
('topic-g10-wh-medieval', 'Medieval Period', 'العصر الوسيط', 'sub-world-hist', 'cur-g10-world-hist', 'gl-10', 2),
('topic-g10-wh-early-mod', 'Early Modern Period', 'العصر الحديث المبكر', 'sub-world-hist', 'cur-g10-world-hist', 'gl-10', 3),

-- Grade 11 World History Topics
('topic-g11-wh-modern', 'Modern Period', 'العصر الحديث', 'sub-world-hist', 'cur-g11-world-hist', 'gl-11', 1),
('topic-g11-wh-contemp', 'Contemporary Period', 'العصر المعاصر', 'sub-world-hist', 'cur-g11-world-hist', 'gl-11', 2),
('topic-g11-wh-global', 'Global History', 'التاريخ العالمي', 'sub-world-hist', 'cur-g11-world-hist', 'gl-11', 3),

-- Grade 12 World History Topics
('topic-g12-wh-revolutions', 'Revolutions', 'الثورات', 'sub-world-hist', 'cur-g12-world-hist', 'gl-12', 1),
('topic-g12-wh-conflicts', 'Major Conflicts', 'الصراعات الكبرى', 'sub-world-hist', 'cur-g12-world-hist', 'gl-12', 2),
('topic-g12-wh-progress', 'Human Progress', 'التقدم الإنساني', 'sub-world-hist', 'cur-g12-world-hist', 'gl-12', 3),

-- Grade 7 English Language Topics
('topic-g7-el-grammar', 'Grammar Fundamentals', 'أساسيات القواعد', 'sub-eng-lang', 'cur-g7-eng-lang', 'gl-7', 1),
('topic-g7-el-vocab', 'Vocabulary Building', 'بناء المفردات', 'sub-eng-lang', 'cur-g7-eng-lang', 'gl-7', 2),
('topic-g7-el-composition', 'Composition Skills', 'مهارات التأليف', 'sub-eng-lang', 'cur-g7-eng-lang', 'gl-7', 3),

-- Grade 8 English Language Topics
('topic-g8-el-adv-grammar', 'Advanced Grammar', 'القواعد المتقدمة', 'sub-eng-lang', 'cur-g8-eng-lang', 'gl-8', 1),
('topic-g8-el-adv-vocab', 'Advanced Vocabulary', 'المفردات المتقدمة', 'sub-eng-lang', 'cur-g8-eng-lang', 'gl-8', 2),
('topic-g8-el-adv-composition', 'Advanced Composition', 'التأليف المتقدم', 'sub-eng-lang', 'cur-g8-eng-lang', 'gl-8', 3),

-- Grade 9 English Language Topics
('topic-g9-el-college-prep', 'College Preparation', 'التحضير للكلية', 'sub-eng-lang', 'cur-g9-eng-lang', 'gl-9', 1),
('topic-g9-el-literary-dev', 'Literary Devices', 'أدوات الأدب', 'sub-eng-lang', 'cur-g9-eng-lang', 'gl-9', 2),
('topic-g9-el-critical-anal', 'Critical Analysis', 'التحليل النقدي', 'sub-eng-lang', 'cur-g9-eng-lang', 'gl-9', 3),

-- Additional Math Topics
('topic-g10-m-precalc', 'Pre-Calculus', 'ما قبل التفاضل والتكامل', 'sub-math', 'cur-g10-math', 'gl-10', 4),
('topic-g11-m-apcalc', 'AP Calculus', 'تفاضل وتكامل AP', 'sub-math', 'cur-g11-math', 'gl-11', 4),
('topic-g12-m-apstat', 'AP Statistics', 'إحصاء AP', 'sub-math', 'cur-g12-math', 'gl-12', 4);

-- Insert additional SubTopics
INSERT INTO "SubTopic" (id, name, nameAr, topicId, "order") VALUES
-- Grade 10 Computer Science - Introduction to Programming SubTopics
('subtopic-g10-cs-intro-1', 'Variables and Data Types', 'المتغيرات وأنواع البيانات', 'topic-g10-cs-intro', 1),
('subtopic-g10-cs-intro-2', 'Control Structures', 'هياكل التحكم', 'topic-g10-cs-intro', 2),
('subtopic-g10-cs-intro-3', 'Functions', 'الدوال', 'topic-g10-cs-intro', 3),
('subtopic-g10-cs-intro-4', 'Arrays and Lists', 'المصفوفات والقوائم', 'topic-g10-cs-intro', 4),

-- Grade 10 Economics - Introduction to Economics SubTopics
('subtopic-g10-econ-intro-1', 'Scarcity and Choice', 'الندرة والاختيار', 'topic-g10-econ-intro', 1),
('subtopic-g10-econ-intro-2', 'Supply and Demand', 'العرض والطلب', 'topic-g10-econ-intro', 2),
('subtopic-g10-econ-intro-3', 'Market Structures', 'هياكل السوق', 'topic-g10-econ-intro', 3),
('subtopic-g10-econ-intro-4', 'Economic Systems', 'النظم الاقتصادية', 'topic-g10-econ-intro', 4),

-- Grade 10 World History - Ancient Civilizations SubTopics
('subtopic-g10-wh-ancient-1', 'Mesopotamia', '美索不达米亚', 'topic-g10-wh-ancient', 1),
('subtopic-g10-wh-ancient-2', 'Ancient Egypt', 'مصر القديمة', 'topic-g10-wh-ancient', 2),
('subtopic-g10-wh-ancient-3', 'Ancient Greece', 'اليونان القديمة', 'topic-g10-wh-ancient', 3),
('subtopic-g10-wh-ancient-4', 'Ancient Rome', 'روما القديمة', 'topic-g10-wh-ancient', 4),

-- Grade 7 English Language - Grammar Fundamentals SubTopics
('subtopic-g7-el-grammar-1', 'Parts of Speech', 'أجزاء الكلمة', 'topic-g7-el-grammar', 1),
('subtopic-g7-el-grammar-2', 'Sentence Structure', 'بنية الجملة', 'topic-g7-el-grammar', 2),
('subtopic-g7-el-grammar-3', 'Punctuation', 'الترقيم', 'topic-g7-el-grammar', 3),
('subtopic-g7-el-grammar-4', 'Capitalization', 'الحروف الكبيرة', 'topic-g7-el-grammar', 4);