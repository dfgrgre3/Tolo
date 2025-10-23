-- Insert University Grade Levels for Egyptian Education System
INSERT INTO "GradeLevel" (id, name, nameAr, level, educationSystem) VALUES
('gl-u1', 'University Year 1', 'السنة الجامعية الأولى', 13, 'EGYPT_UNIVERSITY'),
('gl-u2', 'University Year 2', 'السنة الجامعية الثانية', 14, 'EGYPT_UNIVERSITY'),
('gl-u3', 'University Year 3', 'السنة الجامعية الثالثة', 15, 'EGYPT_UNIVERSITY'),
('gl-u4', 'University Year 4', 'السنة الجامعية الرابعة', 16, 'EGYPT_UNIVERSITY'),
('gl-u5', 'University Year 5', 'السنة الجامعية الخامسة', 17, 'EGYPT_UNIVERSITY'),
('gl-u6', 'University Year 6', 'السنة الجامعية السادسة', 18, 'EGYPT_UNIVERSITY');

-- Insert University Subjects
INSERT INTO "Subject" (id, name, nameAr, code, description, color, icon) VALUES
('sub-cs', 'Computer Science', 'علوم الحاسب', 'CS', 'Computer Science subject covering programming, algorithms, data structures, and software engineering', '#3b82f6', 'Code'),
('sub-is', 'Information Systems', 'نظم المعلومات', 'IS', 'Information Systems subject covering database systems, information technology management, and business applications', '#10b981', 'Database'),
('sub-it', 'Information Technology', 'تكنولوجيا المعلومات', 'IT', 'Information Technology subject covering networking, system administration, and technical support', '#8b5cf6', 'Monitor'),
('sub-se', 'Software Engineering', 'هندسة البرمجيات', 'SE', 'Software Engineering subject covering software development lifecycle, project management, and quality assurance', '#f59e0b', 'Wrench'),
('sub-ai', 'Artificial Intelligence', 'الذكاء الاصطناعي', 'AI', 'Artificial Intelligence subject covering machine learning, neural networks, and intelligent systems', '#ef4444', 'Cpu'),
('sub-ds', 'Data Science', 'علم البيانات', 'DS', 'Data Science subject covering data analysis, statistics, and big data technologies', '#0ea5e9', 'BarChart'),
('sub-cy', 'Cyber Security', 'الأمن السيبراني', 'CY', 'Cyber Security subject covering network security, cryptography, and digital forensics', '#000000', 'Shield'),
('sub-ne', 'Network Engineering', 'هندسة الشبكات', 'NE', 'Network Engineering subject covering network design, protocols, and infrastructure management', '#64748b', 'Network'),
('sub-ma', 'Mathematics', 'الرياضيات', 'MATH_U', 'Advanced Mathematics for university level covering calculus, linear algebra, and discrete mathematics', '#ec4899', 'Calculator'),
('sub-st', 'Statistics', 'الإحصاء', 'STAT', 'Statistics subject covering probability theory, statistical inference, and data analysis', '#8b5a2b', 'PieChart'),
('sub-ph', 'Physics', 'الفيزياء', 'PHYS_U', 'Advanced Physics for university level covering quantum mechanics, thermodynamics, and electromagnetism', '#22c55e', 'Atom'),
('sub-ch', 'Chemistry', 'الكيمياء', 'CHEM_U', 'Advanced Chemistry for university level covering organic, inorganic, and physical chemistry', '#f97316', 'Flask'),
('sub-bi', 'Biology', 'الأحياء', 'BIO_U', 'Advanced Biology for university level covering molecular biology, genetics, and biochemistry', '#10b981', 'Microscope'),
('sub-me', 'Mechanical Engineering', 'الهندسة الميكانيكية', 'MECH', 'Mechanical Engineering subject covering mechanics, thermodynamics, and materials science', '#64748b', 'Settings'),
('sub-ce', 'Civil Engineering', 'الهندسة المدنية', 'CIVIL', 'Civil Engineering subject covering structural analysis, construction materials, and geotechnical engineering', '#8b5cf6', 'Building'),
('sub-ee', 'Electrical Engineering', 'الهندسة الكهربائية', 'ELEC', 'Electrical Engineering subject covering circuits, electronics, and power systems', '#f59e0b', 'Zap'),
('sub-eco', 'Economics', 'الاقتصاد', 'ECON', 'Economics subject covering microeconomics, macroeconomics, and econometrics', '#0ea5e9', 'TrendingUp'),
('sub-ba', 'Business Administration', 'إدارة الأعمال', 'BA', 'Business Administration subject covering management, marketing, and organizational behavior', '#10b981', 'Briefcase'),
('sub-ac', 'Accounting', 'المحاسبة', 'ACC', 'Accounting subject covering financial accounting, managerial accounting, and auditing', '#8b5cf6', 'FileText'),
('sub-fi', 'Finance', 'المالية', 'FIN', 'Finance subject covering corporate finance, investments, and financial markets', '#f59e0b', 'DollarSign');

-- Insert University Curricula for different grade levels and subjects
INSERT INTO "Curriculum" (id, name, nameAr, description, gradeLevelId, subject) VALUES
-- Computer Science University Curriculum
('cur-u1-cs', 'University Year 1 Computer Science', 'مناهج علوم الحاسب السنة الجامعية الأولى', 'مناهج علوم الحاسب للسنة الجامعية الأولى', 'gl-u1', 'CS'),
('cur-u2-cs', 'University Year 2 Computer Science', 'مناهج علوم الحاسب السنة الجامعية الثانية', 'مناهج علوم الحاسب للسنة الجامعية الثانية', 'gl-u2', 'CS'),
('cur-u3-cs', 'University Year 3 Computer Science', 'مناهج علوم الحاسب السنة الجامعية الثالثة', 'مناهج علوم الحاسب للسنة الجامعية الثالثة', 'gl-u3', 'CS'),
('cur-u4-cs', 'University Year 4 Computer Science', 'مناهج علوم الحاسب السنة الجامعية الرابعة', 'مناهج علوم الحاسب للسنة الجامعية الرابعة', 'gl-u4', 'CS'),

-- Information Systems University Curriculum
('cur-u1-is', 'University Year 1 Information Systems', 'مناهج نظم المعلومات السنة الجامعية الأولى', 'مناهج نظم المعلومات للسنة الجامعية الأولى', 'gl-u1', 'IS'),
('cur-u2-is', 'University Year 2 Information Systems', 'مناهج نظم المعلومات السنة الجامعية الثانية', 'مناهج نظم المعلومات للسنة الجامعية الثانية', 'gl-u2', 'IS'),
('cur-u3-is', 'University Year 3 Information Systems', 'مناهج نظم المعلومات السنة الجامعية الثالثة', 'مناهج نظم المعلومات للسنة الجامعية الثالثة', 'gl-u3', 'IS'),
('cur-u4-is', 'University Year 4 Information Systems', 'مناهج نظم المعلومات السنة الجامعية الرابعة', 'مناهج نظم المعلومات للسنة الجامعية الرابعة', 'gl-u4', 'IS'),

-- Software Engineering University Curriculum
('cur-u1-se', 'University Year 1 Software Engineering', 'مناهج هندسة البرمجيات السنة الجامعية الأولى', 'مناهج هندسة البرمجيات للسنة الجامعية الأولى', 'gl-u1', 'SE'),
('cur-u2-se', 'University Year 2 Software Engineering', 'مناهج هندسة البرمجيات السنة الجامعية الثانية', 'مناهج هندسة البرمجيات للسنة الجامعية الثانية', 'gl-u2', 'SE'),
('cur-u3-se', 'University Year 3 Software Engineering', 'مناهج هندسة البرمجيات السنة الجامعية الثالثة', 'مناهج هندسة البرمجيات للسنة الجامعية الثالثة', 'gl-u3', 'SE'),
('cur-u4-se', 'University Year 4 Software Engineering', 'مناهج هندسة البرمجيات السنة الجامعية الرابعة', 'مناهج هندسة البرمجيات للسنة الجامعية الرابعة', 'gl-u4', 'SE'),

-- Artificial Intelligence University Curriculum
('cur-u1-ai', 'University Year 1 Artificial Intelligence', 'مناهج الذكاء الاصطناعي السنة الجامعية الأولى', 'مناهج الذكاء الاصطناعي للسنة الجامعية الأولى', 'gl-u1', 'AI'),
('cur-u2-ai', 'University Year 2 Artificial Intelligence', 'مناهج الذكاء الاصطناعي السنة الجامعية الثانية', 'مناهج الذكاء الاصطناعي للسنة الجامعية الثانية', 'gl-u2', 'AI'),
('cur-u3-ai', 'University Year 3 Artificial Intelligence', 'مناهج الذكاء الاصطناعي السنة الجامعية الثالثة', 'مناهج الذكاء الاصطناعي للسنة الجامعية الثالثة', 'gl-u3', 'AI'),
('cur-u4-ai', 'University Year 4 Artificial Intelligence', 'مناهج الذكاء الاصطناعي السنة الجامعية الرابعة', 'مناهج الذكاء الاصطناعي للسنة الجامعية الرابعة', 'gl-u4', 'AI'),

-- Data Science University Curriculum
('cur-u1-ds', 'University Year 1 Data Science', 'مناهج علم البيانات السنة الجامعية الأولى', 'مناهج علم البيانات للسنة الجامعية الأولى', 'gl-u1', 'DS'),
('cur-u2-ds', 'University Year 2 Data Science', 'مناهج علم البيانات السنة الجامعية الثانية', 'مناهج علم البيانات للسنة الجامعية الثانية', 'gl-u2', 'DS'),
('cur-u3-ds', 'University Year 3 Data Science', 'مناهج علم البيانات السنة الجامعية الثالثة', 'مناهج علم البيانات للسنة الجامعية الثالثة', 'gl-u3', 'DS'),
('cur-u4-ds', 'University Year 4 Data Science', 'مناهج علم البيانات السنة الجامعية الرابعة', 'مناهج علم البيانات للسنة الجامعية الرابعة', 'gl-u4', 'DS'),

-- Cyber Security University Curriculum
('cur-u1-cy', 'University Year 1 Cyber Security', 'مناهج الأمن السيبراني السنة الجامعية الأولى', 'مناهج الأمن السيبراني للسنة الجامعية الأولى', 'gl-u1', 'CY'),
('cur-u2-cy', 'University Year 2 Cyber Security', 'مناهج الأمن السيبراني السنة الجامعية الثانية', 'مناهج الأمن السيبراني للسنة الجامعية الثانية', 'gl-u2', 'CY'),
('cur-u3-cy', 'University Year 3 Cyber Security', 'مناهج الأمن السيبراني السنة الجامعية الثالثة', 'مناهج الأمن السيبراني للسنة الجامعية الثالثة', 'gl-u3', 'CY'),
('cur-u4-cy', 'University Year 4 Cyber Security', 'مناهج الأمن السيبراني السنة الجامعية الرابعة', 'مناهج الأمن السيبراني للسنة الجامعية الرابعة', 'gl-u4', 'CY'),

-- Business Administration University Curriculum
('cur-u1-ba', 'University Year 1 Business Administration', 'مناهج إدارة الأعمال السنة الجامعية الأولى', 'مناهج إدارة الأعمال للسنة الجامعية الأولى', 'gl-u1', 'BA'),
('cur-u2-ba', 'University Year 2 Business Administration', 'مناهج إدارة الأعمال السنة الجامعية الثانية', 'مناهج إدارة الأعمال للسنة الجامعية الثانية', 'gl-u2', 'BA'),
('cur-u3-ba', 'University Year 3 Business Administration', 'مناهج إدارة الأعمال السنة الجامعية الثالثة', 'مناهج إدارة الأعمال للسنة الجامعية الثالثة', 'gl-u3', 'BA'),
('cur-u4-ba', 'University Year 4 Business Administration', 'مناهج إدارة الأعمال السنة الجامعية الرابعة', 'مناهج إدارة الأعمال للسنة الجامعية الرابعة', 'gl-u4', 'BA'),

-- Accounting University Curriculum
('cur-u1-ac', 'University Year 1 Accounting', 'مناهج المحاسبة السنة الجامعية الأولى', 'مناهج المحاسبة للسنة الجامعية الأولى', 'gl-u1', 'ACC'),
('cur-u2-ac', 'University Year 2 Accounting', 'مناهج المحاسبة السنة الجامعية الثانية', 'مناهج المحاسبة للسنة الجامعية الثانية', 'gl-u2', 'ACC'),
('cur-u3-ac', 'University Year 3 Accounting', 'مناهج المحاسبة السنة الجامعية الثالثة', 'مناهج المحاسبة للسنة الجامعية الثالثة', 'gl-u3', 'ACC'),
('cur-u4-ac', 'University Year 4 Accounting', 'مناهج المحاسبة السنة الجامعية الرابعة', 'مناهج المحاسبة للسنة الجامعية الرابعة', 'gl-u4', 'ACC'),

-- Economics University Curriculum
('cur-u1-eco', 'University Year 1 Economics', 'مناهج الاقتصاد السنة الجامعية الأولى', 'مناهج الاقتصاد للسنة الجامعية الأولى', 'gl-u1', 'ECON'),
('cur-u2-eco', 'University Year 2 Economics', 'مناهج الاقتصاد السنة الجامعية الثانية', 'مناهج الاقتصاد للسنة الجامعية الثانية', 'gl-u2', 'ECON'),
('cur-u3-eco', 'University Year 3 Economics', 'مناهج الاقتصاد السنة الجامعية الثالثة', 'مناهج الاقتصاد للسنة الجامعية الثالثة', 'gl-u3', 'ECON'),
('cur-u4-eco', 'University Year 4 Economics', 'مناهج الاقتصاد السنة الجامعية الرابعة', 'مناهج الاقتصاد للسنة الجامعية الرابعة', 'gl-u4', 'ECON');

-- Insert University Topics for Computer Science curriculum
INSERT INTO "Topic" (id, name, nameAr, subjectId, curriculumId, gradeLevelId, "order") VALUES
-- Year 1 Computer Science Topics
('topic-u1-cs-intro', 'Introduction to Computer Science', 'مقدمة في علوم الحاسب', 'sub-cs', 'cur-u1-cs', 'gl-u1', 1),
('topic-u1-cs-prog', 'Programming Fundamentals', 'أساسيات البرمجة', 'sub-cs', 'cur-u1-cs', 'gl-u1', 2),
('topic-u1-cs-math', 'Discrete Mathematics', 'الرياضيات المتقطعة', 'sub-cs', 'cur-u1-cs', 'gl-u1', 3),
('topic-u1-cs-algo', 'Algorithms and Problem Solving', 'الخوارزميات وحل المشكلات', 'sub-cs', 'cur-u1-cs', 'gl-u1', 4),

-- Year 2 Computer Science Topics
('topic-u2-cs-oop', 'Object-Oriented Programming', 'البرمجة الكائنية التوجه', 'sub-cs', 'cur-u2-cs', 'gl-u2', 1),
('topic-u2-cs-data', 'Data Structures', 'هياكل البيانات', 'sub-cs', 'cur-u2-cs', 'gl-u2', 2),
('topic-u2-cs-db', 'Database Systems', 'نظم قواعد البيانات', 'sub-cs', 'cur-u2-cs', 'gl-u2', 3),
('topic-u2-cs-os', 'Operating Systems', 'نظم التشغيل', 'sub-cs', 'cur-u2-cs', 'gl-u2', 4),

-- Year 3 Computer Science Topics
('topic-u3-cs-web', 'Web Development', 'تطوير الويب', 'sub-cs', 'cur-u3-cs', 'gl-u3', 1),
('topic-u3-cs-net', 'Computer Networks', 'شبكات الحاسب', 'sub-cs', 'cur-u3-cs', 'gl-u3', 2),
('topic-u3-cs-soft', 'Software Engineering', 'هندسة البرمجيات', 'sub-cs', 'cur-u3-cs', 'gl-u3', 3),
('topic-u3-cs-ai', 'Introduction to Artificial Intelligence', 'مقدمة في الذكاء الاصطناعي', 'sub-cs', 'cur-u3-cs', 'gl-u3', 4),

-- Year 4 Computer Science Topics
('topic-u4-cs-ml', 'Machine Learning', 'تعلم الآلة', 'sub-cs', 'cur-u4-cs', 'gl-u4', 1),
('topic-u4-cs-sec', 'Computer Security', 'أمن الحاسب', 'sub-cs', 'cur-u4-cs', 'gl-u4', 2),
('topic-u4-cs-proj', 'Senior Project', 'مشروع التخرج', 'sub-cs', 'cur-u4-cs', 'gl-u4', 3),
('topic-u4-cs-spec', 'Special Topics in CS', 'مواضيع خاصة في علوم الحاسب', 'sub-cs', 'cur-u4-cs', 'gl-u4', 4),

-- University Year 1 Mathematics Topics
('topic-u1-math-cal1', 'Calculus I', 'حساب التفاضل والتكامل I', 'sub-ma', 'cur-u1-cs', 'gl-u1', 5),
('topic-u1-math-lin', 'Linear Algebra', 'الجبر الخطي', 'sub-ma', 'cur-u1-cs', 'gl-u1', 6),
('topic-u1-math-stat', 'Introduction to Statistics', 'مقدمة في الإحصاء', 'sub-ma', 'cur-u1-cs', 'gl-u1', 7),

-- University Year 2 Mathematics Topics
('topic-u2-math-cal2', 'Calculus II', 'حساب التفاضل والتكامل II', 'sub-ma', 'cur-u2-cs', 'gl-u2', 5),
('topic-u2-math-prob', 'Probability Theory', 'نظرية الاحتمالات', 'sub-ma', 'cur-u2-cs', 'gl-u2', 6),
('topic-u2-math-num', 'Numerical Methods', 'الطرق العددية', 'sub-ma', 'cur-u2-cs', 'gl-u2', 7),

-- University Year 3 Mathematics Topics
('topic-u3-math-cal3', 'Calculus III', 'حساب التفاضل والتكامل III', 'sub-ma', 'cur-u3-cs', 'gl-u3', 5),
('topic-u3-math-diff', 'Differential Equations', 'المعادلات التفاضلية', 'sub-ma', 'cur-u3-cs', 'gl-u3', 6),

-- Artificial Intelligence Topics
('topic-u3-ai-intro', 'Introduction to AI', 'مقدمة في الذكاء الاصطناعي', 'sub-ai', 'cur-u3-ai', 'gl-u3', 1),
('topic-u3-ai-search', 'Search Algorithms', 'خوارزميات البحث', 'sub-ai', 'cur-u3-ai', 'gl-u3', 2),
('topic-u4-ai-ml', 'Machine Learning', 'تعلم الآلة', 'sub-ai', 'cur-u4-ai', 'gl-u4', 1),
('topic-u4-ai-nn', 'Neural Networks', 'الشبكات العصبية', 'sub-ai', 'cur-u4-ai', 'gl-u4', 2),

-- Data Science Topics
('topic-u2-ds-intro', 'Introduction to Data Science', 'مقدمة في علم البيانات', 'sub-ds', 'cur-u2-ds', 'gl-u2', 1),
('topic-u3-ds-vis', 'Data Visualization', 'تصور البيانات', 'sub-ds', 'cur-u3-ds', 'gl-u3', 1),
('topic-u4-ds-big', 'Big Data Technologies', 'تقنيات البيانات الضخمة', 'sub-ds', 'cur-u4-ds', 'gl-u4', 1),

-- Cyber Security Topics
('topic-u2-cy-intro', 'Introduction to Cyber Security', 'مقدمة في الأمن السيبراني', 'sub-cy', 'cur-u2-cy', 'gl-u2', 1),
('topic-u3-cy-netsec', 'Network Security', 'أمن الشبكات', 'sub-cy', 'cur-u3-cy', 'gl-u3', 1),
('topic-u4-cy-forensics', 'Digital Forensics', 'الأدلة الرقمية', 'sub-cy', 'cur-u4-cy', 'gl-u4', 1);