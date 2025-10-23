-- Insert Grade Levels for Egyptian Education System
INSERT INTO "GradeLevel" (id, name, nameAr, level, educationSystem) VALUES
('gl-1', 'Grade 1', 'الصف الأول الابتدائي', 1, 'EGYPT'),
('gl-2', 'Grade 2', 'الصف الثاني الابتدائي', 2, 'EGYPT'),
('gl-3', 'Grade 3', 'الصف الثالث الابتدائي', 3, 'EGYPT'),
('gl-4', 'Grade 4', 'الصف الرابع الابتدائي', 4, 'EGYPT'),
('gl-5', 'Grade 5', 'الصف الخامس الابتدائي', 5, 'EGYPT'),
('gl-6', 'Grade 6', 'الصف السادس الابتدائي', 6, 'EGYPT'),
('gl-7', 'Grade 7', 'الصف الأول الإعدادي', 7, 'EGYPT'),
('gl-8', 'Grade 8', 'الصف الثاني الإعدادي', 8, 'EGYPT'),
('gl-9', 'Grade 9', 'الصف الثالث الإعدادي', 9, 'EGYPT'),
('gl-10', 'Grade 10', 'الصف الأول الثانوي', 10, 'EGYPT'),
('gl-11', 'Grade 11', 'الصف الثاني الثانوي', 11, 'EGYPT'),
('gl-12', 'Grade 12', 'الصف الثالث الثانوي', 12, 'EGYPT');

-- Insert Subjects
INSERT INTO "Subject" (id, name, nameAr, code, description, color, icon) VALUES
('sub-math', 'Mathematics', 'الرياضيات', 'MATH', 'Mathematics subject covering algebra, geometry, calculus, and statistics', '#3b82f6', 'Calculator'),
('sub-phys', 'Physics', 'الفيزياء', 'PHYSICS', 'Physics subject covering mechanics, thermodynamics, electromagnetism, and modern physics', '#ef4444', 'Atom'),
('sub-chem', 'Chemistry', 'الكيمياء', 'CHEMISTRY', 'Chemistry subject covering organic, inorganic, and physical chemistry', '#10b981', 'Flask'),
('sub-bio', 'Biology', 'الأحياء', 'BIOLOGY', 'Biology subject covering cellular biology, genetics, evolution, and ecology', '#8b5cf6', 'Microscope'),
('sub-eng', 'English', 'الإنجليزية', 'ENGLISH', 'English language subject covering grammar, literature, and communication skills', '#f59e0b', 'Book'),
('sub-ar', 'Arabic', 'العربية', 'ARABIC', 'Arabic language subject covering grammar, literature, and communication skills', '#0ea5e9', 'Pen'),
('sub-fr', 'French', 'الفرنسية', 'FRENCH', 'French language subject covering grammar, literature, and communication skills', '#8b5cf6', 'Flag'),
('sub-ger', 'German', 'الألمانية', 'GERMAN', 'German language subject covering grammar, literature, and communication skills', '#000000', 'Flag'),
('sub-hist', 'History', 'التاريخ', 'HISTORY', 'History subject covering ancient, medieval, and modern history', '#8b5a2b', 'Scroll'),
('sub-geo', 'Geography', 'الجغرافيا', 'GEOGRAPHY', 'Geography subject covering physical and human geography', '#22c55e', 'Map'),
('sub-civ', 'Civics', 'الاجتماعيات', 'CIVICS', 'Civics subject covering government, law, and citizenship', '#64748b', 'Users'),
('sub-rel', 'Religion', 'الدين', 'RELIGION', 'Religion subject covering Islamic studies and comparative religion', '#f97316', 'Heart'),
('sub-phil', 'Philosophy', 'الفلسفة', 'PHILOSOPHY', 'Philosophy subject covering ethics, logic, and metaphysics', '#ec4899', 'Brain'),
('sub-art', 'Art', 'الفنون', 'ART', 'Art subject covering visual arts, music, and creative expression', '#a855f7', 'Palette'),
('sub-pe', 'Physical Education', 'الرياضة', 'PE', 'Physical education subject covering sports, fitness, and health', '#06b6d4', 'Dumbbell');

-- Insert Curricula for different grade levels and subjects
INSERT INTO "Curriculum" (id, name, nameAr, description, gradeLevelId, subject) VALUES
('cur-g1-math', 'Grade 1 Mathematics', 'منهج الرياضيات الصف الأول الابتدائي', 'الرياضيات للصف الأول الابتدائي', 'gl-1', 'MATH'),
('cur-g2-math', 'Grade 2 Mathematics', 'منهج الرياضيات الصف الثاني الابتدائي', 'الرياضيات للصف الثاني الابتدائي', 'gl-2', 'MATH'),
('cur-g3-math', 'Grade 3 Mathematics', 'منهج الرياضيات الصف الثالث الابتدائي', 'الرياضيات للصف الثالث الابتدائي', 'gl-3', 'MATH'),
('cur-g4-math', 'Grade 4 Mathematics', 'منهج الرياضيات الصف الرابع الابتدائي', 'الرياضيات للصف الرابع الابتدائي', 'gl-4', 'MATH'),
('cur-g5-math', 'Grade 5 Mathematics', 'منهج الرياضيات الصف الخامس الابتدائي', 'الرياضيات للصف الخامس الابتدائي', 'gl-5', 'MATH'),
('cur-g6-math', 'Grade 6 Mathematics', 'منهج الرياضيات الصف السادس الابتدائي', 'الرياضيات للصف السادس الابتدائي', 'gl-6', 'MATH'),
('cur-g7-math', 'Grade 7 Mathematics', 'منهج الرياضيات الصف الأول الإعدادي', 'الرياضيات للصف الأول الإعدادي', 'gl-7', 'MATH'),
('cur-g8-math', 'Grade 8 Mathematics', 'منهج الرياضيات الصف الثاني الإعدادي', 'الرياضيات للصف الثاني الإعدادي', 'gl-8', 'MATH'),
('cur-g9-math', 'Grade 9 Mathematics', 'منهج الرياضيات الصف الثالث الإعدادي', 'الرياضيات للصف الثالث الإعدادي', 'gl-9', 'MATH'),
('cur-g10-math', 'Grade 10 Mathematics', 'منهج الرياضيات الصف الأول الثانوي', 'الرياضيات للصف الأول الثانوي', 'gl-10', 'MATH'),
('cur-g11-math', 'Grade 11 Mathematics', 'منهج الرياضيات الصف الثاني الثانوي', 'الرياضيات للصف الثاني الثانوي', 'gl-11', 'MATH'),
('cur-g12-math', 'Grade 12 Mathematics', 'منهج الرياضيات الصف الثالث الثانوي', 'الرياضيات للصف الثالث الثانوي', 'gl-12', 'MATH'),

('cur-g1-ar', 'Grade 1 Arabic', 'منهج اللغة العربية الصف الأول الابتدائي', 'اللغة العربية للصف الأول الابتدائي', 'gl-1', 'ARABIC'),
('cur-g2-ar', 'Grade 2 Arabic', 'منهج اللغة العربية الصف الثاني الابتدائي', 'اللغة العربية للصف الثاني الابتدائي', 'gl-2', 'ARABIC'),
('cur-g3-ar', 'Grade 3 Arabic', 'منهج اللغة العربية الصف الثالث الابتدائي', 'اللغة العربية للصف الثالث الابتدائي', 'gl-3', 'ARABIC'),
('cur-g4-ar', 'Grade 4 Arabic', 'منهج اللغة العربية الصف الرابع الابتدائي', 'اللغة العربية للصف الرابع الابتدائي', 'gl-4', 'ARABIC'),
('cur-g5-ar', 'Grade 5 Arabic', 'منهج اللغة العربية الصف الخامس الابتدائي', 'اللغة العربية للصف الخامس الابتدائي', 'gl-5', 'ARABIC'),
('cur-g6-ar', 'Grade 6 Arabic', 'منهج اللغة العربية الصف السادس الابتدائي', 'اللغة العربية للصف السادس الابتدائي', 'gl-6', 'ARABIC'),
('cur-g7-ar', 'Grade 7 Arabic', 'منهج اللغة العربية الصف الأول الإعدادي', 'اللغة العربية للصف الأول الإعدادي', 'gl-7', 'ARABIC'),
('cur-g8-ar', 'Grade 8 Arabic', 'منهج اللغة العربية الصف الثاني الإعدادي', 'اللغة العربية للصف الثاني الإعدادي', 'gl-8', 'ARABIC'),
('cur-g9-ar', 'Grade 9 Arabic', 'منهج اللغة العربية الصف الثالث الإعدادي', 'اللغة العربية للصف الثالث الإعدادي', 'gl-9', 'ARABIC'),
('cur-g10-ar', 'Grade 10 Arabic', 'منهج اللغة العربية الصف الأول الثانوي', 'اللغة العربية للصف الأول الثانوي', 'gl-10', 'ARABIC'),
('cur-g11-ar', 'Grade 11 Arabic', 'منهج اللغة العربية الصف الثاني الثانوي', 'اللغة العربية للصف الثاني الثانوي', 'gl-11', 'ARABIC'),
('cur-g12-ar', 'Grade 12 Arabic', 'منهج اللغة العربية الصف الثالث الثانوي', 'اللغة العربية للصف الثالث الثانوي', 'gl-12', 'ARABIC'),

('cur-g1-eng', 'Grade 1 English', 'منهج اللغة الإنجليزية الصف الأول الابتدائي', 'اللغة الإنجليزية للصف الأول الابتدائي', 'gl-1', 'ENGLISH'),
('cur-g2-eng', 'Grade 2 English', 'منهج اللغة الإنجليزية الصف الثاني الابتدائي', 'اللغة الإنجليزية للصف الثاني الابتدائي', 'gl-2', 'ENGLISH'),
('cur-g3-eng', 'Grade 3 English', 'منهج اللغة الإنجليزية الصف الثالث الابتدائي', 'اللغة الإنجليزية للصف الثالث الابتدائي', 'gl-3', 'ENGLISH'),
('cur-g4-eng', 'Grade 4 English', 'منهج اللغة الإنجليزية الصف الرابع الابتدائي', 'اللغة الإنجليزية للصف الرابع الابتدائي', 'gl-4', 'ENGLISH'),
('cur-g5-eng', 'Grade 5 English', 'منهج اللغة الإنجليزية الصف الخامس الابتدائي', 'اللغة الإنجليزية للصف الخامس الابتدائي', 'gl-5', 'ENGLISH'),
('cur-g6-eng', 'Grade 6 English', 'منهج اللغة الإنجليزية الصف السادس الابتدائي', 'اللغة الإنجليزية للصف السادس الابتدائي', 'gl-6', 'ENGLISH'),
('cur-g7-eng', 'Grade 7 English', 'منهج اللغة الإنجليزية الصف الأول الإعدادي', 'اللغة الإنجليزية للصف الأول الإعدادي', 'gl-7', 'ENGLISH'),
('cur-g8-eng', 'Grade 8 English', 'منهج اللغة الإنجليزية الصف الثاني الإعدادي', 'اللغة الإنجليزية للصف الثاني الإعدادي', 'gl-8', 'ENGLISH'),
('cur-g9-eng', 'Grade 9 English', 'منهج اللغة الإنجليزية الصف الثالث الإعدادي', 'اللغة الإنجليزية للصف الثالث الإعدادي', 'gl-9', 'ENGLISH'),
('cur-g10-eng', 'Grade 10 English', 'منهج اللغة الإنجليزية الصف الأول الثانوي', 'اللغة الإنجليزية للصف الأول الثانوي', 'gl-10', 'ENGLISH'),
('cur-g11-eng', 'Grade 11 English', 'منهج اللغة الإنجليزية الصف الثاني الثانوي', 'اللغة الإنجليزية للصف الثاني الثانوي', 'gl-11', 'ENGLISH'),
('cur-g12-eng', 'Grade 12 English', 'منهج اللغة الإنجليزية الصف الثالث الثانوي', 'اللغة الإنجليزية للصف الثالث الثانوي', 'gl-12', 'ENGLISH'),

('cur-g10-phys', 'Grade 10 Physics', 'منهج الفيزياء الصف الأول الثانوي', 'الفيزياء للصف الأول الثانوي', 'gl-10', 'PHYSICS'),
('cur-g11-phys', 'Grade 11 Physics', 'منهج الفيزياء الصف الثاني الثانوي', 'الفيزياء للصف الثاني الثانوي', 'gl-11', 'PHYSICS'),
('cur-g12-phys', 'Grade 12 Physics', 'منهج الفيزياء الصف الثالث الثانوي', 'الفيزياء للصف الثالث الثانوي', 'gl-12', 'PHYSICS'),

('cur-g10-chem', 'Grade 10 Chemistry', 'منهج الكيمياء الصف الأول الثانوي', 'الكيمياء للصف الأول الثانوي', 'gl-10', 'CHEMISTRY'),
('cur-g11-chem', 'Grade 11 Chemistry', 'منهج الكيمياء الصف الثاني الثانوي', 'الكيمياء للصف الثاني الثانوي', 'gl-11', 'CHEMISTRY'),
('cur-g12-chem', 'Grade 12 Chemistry', 'منهج الكيمياء الصف الثالث الثانوي', 'الكيمياء للصف الثالث الثانوي', 'gl-12', 'CHEMISTRY'),

('cur-g10-bio', 'Grade 10 Biology', 'منهج الأحياء الصف الأول الثانوي', 'الأحياء للصف الأول الثانوي', 'gl-10', 'BIOLOGY'),
('cur-g11-bio', 'Grade 11 Biology', 'منهج الأحياء الصف الثاني الثانوي', 'الأحياء للصف الثاني الثانوي', 'gl-11', 'BIOLOGY'),
('cur-g12-bio', 'Grade 12 Biology', 'منهج الأحياء الصف الثالث الثانوي', 'الأحياء للصف الثالث الثانوي', 'gl-12', 'BIOLOGY');

-- Insert Topics for Mathematics curriculum
INSERT INTO "Topic" (id, name, nameAr, subjectId, curriculumId, gradeLevelId, "order") VALUES
-- Grade 1 Math Topics
('topic-g1-m-add', 'Addition', 'الجمع', 'sub-math', 'cur-g1-math', 'gl-1', 1),
('topic-g1-m-sub', 'Subtraction', 'الطرح', 'sub-math', 'cur-g1-math', 'gl-1', 2),
('topic-g1-m-count', 'Counting', 'العد', 'sub-math', 'cur-g1-math', 'gl-1', 3),
('topic-g1-m-shape', 'Shapes', 'الأشكال', 'sub-math', 'cur-g1-math', 'gl-1', 4),

-- Grade 2 Math Topics
('topic-g2-m-add', 'Addition', 'الجمع', 'sub-math', 'cur-g2-math', 'gl-2', 1),
('topic-g2-m-sub', 'Subtraction', 'الطرح', 'sub-math', 'cur-g2-math', 'gl-2', 2),
('topic-g2-m-mult', 'Multiplication', 'الضرب', 'sub-math', 'cur-g2-math', 'gl-2', 3),
('topic-g2-m-div', 'Division', 'القسمة', 'sub-math', 'cur-g2-math', 'gl-2', 4),

-- Grade 10 Math Topics
('topic-g10-m-alg', 'Algebra', 'الجبر', 'sub-math', 'cur-g10-math', 'gl-10', 1),
('topic-g10-m-geom', 'Geometry', 'الهندسة', 'sub-math', 'cur-g10-math', 'gl-10', 2),
('topic-g10-m-trig', 'Trigonometry', 'حساب المثلثات', 'sub-math', 'cur-g10-math', 'gl-10', 3),

-- Grade 12 Math Topics
('topic-g12-m-calc', 'Calculus', 'التفاضل والتكامل', 'sub-math', 'cur-g12-math', 'gl-12', 1),
('topic-g12-m-stat', 'Statistics', 'الإحصاء', 'sub-math', 'cur-g12-math', 'gl-12', 2);

-- Insert SubTopics for Mathematics curriculum
INSERT INTO "SubTopic" (id, name, nameAr, topicId, "order") VALUES
-- Grade 1 Addition SubTopics
('subtopic-g1-add-1', 'Single Digit Addition', 'جمع الأرقام المفردة', 'topic-g1-m-add', 1),
('subtopic-g1-add-2', 'Double Digit Addition', 'جمع الأرقام المزدوجة', 'topic-g1-m-add', 2),
('subtopic-g1-add-3', 'Word Problems', 'مسائل كلامية', 'topic-g1-m-add', 3),

-- Grade 10 Algebra SubTopics
('subtopic-g10-alg-1', 'Linear Equations', 'المعادلات الخطية', 'topic-g10-m-alg', 1),
('subtopic-g10-alg-2', 'Quadratic Equations', 'المعادلات التربيعية', 'topic-g10-m-alg', 2),
('subtopic-g10-alg-3', 'Polynomials', 'الحدوديات', 'topic-g10-m-alg', 3),

-- Grade 12 Calculus SubTopics
('subtopic-g12-calc-1', 'Limits', 'النهايات', 'topic-g12-m-calc', 1),
('subtopic-g12-calc-2', 'Derivatives', 'المشتقات', 'topic-g12-m-calc', 2),
('subtopic-g12-calc-3', 'Integration', 'التكامل', 'topic-g12-m-calc', 3);