# Prisma Schema Documentation

## نظرة عامة
هذا المستند يوفر دليلاً شاملاً لقاعدة البيانات الخاصة بمنصة التعليم.

## 📊 نماذج قاعدة البيانات

### 🔐 نماذج المصادقة والأمان

#### User
النموذج الرئيسي للمستخدمين مع دعم كامل للمصادقة متعددة العوامل.

**الحقول الرئيسية:**
- `email`, `passwordHash`: بيانات تسجيل الدخول الأساسية
- `twoFactorEnabled`, `twoFactorSecret`: المصادقة الثنائية
- `biometricEnabled`, `biometricCredentials`: المصادقة البيومترية
- `emailVerified`, `emailVerificationToken`: التحقق من البريد الإلكتروني

**نظام النقاط متعدد الطبقات:**
- `totalXP`: إجمالي نقاط الخبرة
- `studyXP`, `taskXP`, `examXP`: نقاط حسب النشاط
- `challengeXP`, `questXP`, `seasonXP`: نقاط التحديات والمواسم

#### Session
إدارة جلسات المستخدمين مع تتبع الأجهزة.

#### SecurityLog
سجل كامل لجميع الأحداث الأمنية.

#### BiometricCredential
تخزين بيانات اعتماد المصادقة البيومترية.

---

### 📚 نماذج التعليم

#### Subject
المواد الدراسية مع دعم متعدد اللغات.

**الحقول:**
- `name`, `nameAr`: الاسم بالإنجليزية والعربية
- `code`: رمز فريد للمادة
- `icon`, `color`: للعرض المرئي
- `isActive`: حالة التفعيل

#### Topic & SubTopic
هيكل هرمي للمحتوى التعليمي.

**العلاقات:**
- Topic → Subject (المادة)
- Topic → Curriculum (المنهج)
- SubTopic → Topic (الموضوع الرئيسي)

#### Curriculum
المناهج الدراسية المرتبطة بالمستويات التعليمية.

#### GradeLevel
المستويات الدراسية (الصفوف) مع دعم أنظمة تعليمية مختلفة.

---

### 📖 نماذج الموارد التعليمية

#### Resource
موارد تعليمية متنوعة (فيديوهات، مقالات، إلخ).

**الفهارس:**
- `subject`, `type`: للبحث السريع
- `createdAt`: للترتيب الزمني

#### Book
مكتبة رقمية للكتب.

**الميزات:**
- تقييمات ومشاهدات
- تتبع التحميلات
- نظام الوسوم (Tags)

#### Exam
امتحانات سابقة ونماذج.

#### ExamResult
نتائج الامتحانات للطلاب.

---

### 📝 نماذج الدراسة والمهام

#### StudySession
جلسات الدراسة مع تتبع الوقت والتركيز.

**الحقول المهمة:**
- `durationMin`: مدة الجلسة بالدقائق
- `focusScore`: درجة التركيز (0-100)
- `strategy`: استراتيجية الدراسة (Pomodoro, Deep Work, إلخ)

**الفهارس المحسّنة:**
- `userId + subject`: لاستعلامات المستخدم حسب المادة
- `userId + startTime`: للتحليل الزمني
- `subject`: للإحصائيات العامة

#### Task
نظام إدارة المهام.

**الحالات:**
- PENDING: قيد الانتظار
- IN_PROGRESS: قيد التنفيذ
- COMPLETED: مكتملة
- CANCELLED: ملغاة

**الأولويات:**
- 0: عادية
- 1: متوسطة
- 2: عالية
- 3: عاجلة

#### Reminder
تذكيرات ذكية مع دعم التكرار.

#### ProgressSnapshot
لقطات دورية لتقدم المستخدم.

---

### 🎮 نماذج اللعبية (Gamification)

#### Achievement
الإنجازات والشارات.

**التصنيفات:**
- `category`: study, tasks, exams, time, streak
- `difficulty`: easy, medium, hard, expert
- `rarity`: common, rare, epic, legendary

#### UserAchievement
ربط المستخدمين بالإنجازات المكتسبة.

#### CustomGoal
أهداف مخصصة يحددها المستخدم.

#### Season
مواسم المنافسة.

#### Challenge
تحديات يومية/أسبوعية/شهرية.

#### Quest & QuestChain
نظام المهام المتسلسلة.

#### Reward & UserReward
نظام المكافآت (افتراضية، NFTs، شارات).

#### LeaderboardEntry
لوحات الصدارة متعددة الأنواع:
- عالمية (global)
- يومية/أسبوعية/شهرية
- حسب المادة
- حسب المستوى
- حسب الموسم

---

### 🤖 نماذج الذكاء الاصطناعي

#### SentimentAnalysis
تحليل المشاعر من نصوص المستخدم.

**المشاعر المدعومة:**
- positive, negative, neutral
- frustrated, tired

#### AiChatMessage
محادثات الذكاء الاصطناعي مع السياق.

#### AiGeneratedContent
محتوى مُنشأ بالذكاء الاصطناعي:
- ملخصات
- بطاقات تعليمية
- خطط دراسية
- أسئلة تدريبية

#### UserInteraction
تتبع تفاعلات المستخدم للتوصيات.

**أنواع التفاعل:**
- view, click, complete
- like, dislike, bookmark

#### ContentPreference
تفضيلات المحتوى المتعلمة.

#### MlRecommendation
توصيات التعلم الآلي.

**الخوارزميات:**
- collaborative: تصفية تعاونية
- content_based: قائمة على المحتوى
- hybrid: مختلطة
- deep_learning: تعلم عميق

---

### 👥 نماذج المجتمع

#### Teacher
قاعدة بيانات المعلمين.

#### Message
نظام المراسلة بين المستخدمين.

#### Announcement
الإعلانات العامة.

#### BlogCategory & BlogPost
نظام المدونة.

#### ForumCategory, ForumPost, ForumReply
منتدى النقاش.

#### Event & EventAttendee
نظام الفعاليات.

#### Contest
المسابقات.

---

### 📅 نماذج الجدولة

#### Schedule
جداول الدراسة الشخصية.

**الأنواع:**
- study: جلسة دراسة
- exam: امتحان
- task: مهمة
- event: حدث

#### UserGrade
درجات الطلاب.

#### OfflineLesson
الدروس الخصوصية.

---

### 🧪 نماذج الامتحانات المُنشأة بالذكاء الاصطناعي

#### AiGeneratedExam
امتحانات مُنشأة تلقائياً.

#### AiQuestion
أسئلة الامتحانات.

#### TestResult
نتائج الاختبارات.

---

## 🔍 استراتيجية الفهرسة

### فهارس الأداء الرئيسية

1. **فهارس المستخدم:**
   - `User.email` (unique)
   - `User.username` (unique)

2. **فهارس الجلسات:**
   - `StudySession(userId, subject, startTime)`
   - `Session(userId, isActive, expiresAt)`

3. **فهارس المهام:**
   - `Task(userId, status, dueAt)`
   - `Task(userId, priority)`

4. **فهارس التعليم:**
   - `Subject(code, isActive)`
   - `Topic(subjectId, gradeLevelId)`
   - `SubjectEnrollment(userId, subjectId)`

5. **فهارس اللعبية:**
   - `LeaderboardEntry(type, totalXP)`
   - `UserAchievement(userId, achievementKey)`

6. **فهارس الذكاء الاصطناعي:**
   - `UserInteraction(userId, itemType, timestamp)`
   - `MlRecommendation(userId, itemType, score)`

---

## 🔄 العلاقات المهمة

### Cascade Delete
معظم النماذج تستخدم `onDelete: Cascade` لضمان حذف البيانات المرتبطة عند حذف المستخدم.

### Restrict Delete
بعض النماذج تستخدم `onDelete: Restrict` لمنع الحذف العرضي:
- `SubjectEnrollment → Subject`
- `Topic → Subject`
- `Curriculum → GradeLevel`

---

## 📈 أفضل الممارسات

### 1. استخدام الفهارس
- جميع الاستعلامات المتكررة لها فهارس مخصصة
- فهارس مركبة للاستعلامات المعقدة

### 2. التحسين
- استخدام `@@index` للبحث السريع
- استخدام `@@unique` لضمان التفرد

### 3. الأمان
- تشفير كلمات المرور
- تتبع الجلسات
- سجلات الأمان الشاملة

### 4. قابلية التوسع
- نظام نقاط متعدد الطبقات
- دعم متعدد اللغات
- أنظمة تعليمية متعددة

---

## 🚀 التحسينات المستقبلية المقترحة

1. **Soft Delete:**
   - إضافة `deletedAt` للنماذج الرئيسية
   - الاحتفاظ بالبيانات للتحليل

2. **Partitioning:**
   - تقسيم الجداول الكبيرة حسب التاريخ
   - تحسين الأداء للاستعلامات الزمنية

3. **Caching:**
   - استخدام Redis للبيانات المتكررة
   - تخزين مؤقت للوحات الصدارة

4. **Full-Text Search:**
   - إضافة بحث نصي كامل
   - تحسين البحث في المحتوى التعليمي

---

## 📝 ملاحظات الصيانة

### Migration Files
- جميع ملفات الـ migration متوافقة مع PostgreSQL
- تم إصلاح مشاكل SQL Server compatibility
- تم إصلاح UPDATE statements الناقصة

### Schema Validation
- تم إزالة الحقول المكررة (مثل `views` في `ForumPost`)
- جميع العلاقات محددة بوضوح
- الفهارس محسّنة للأداء

---

## 🔗 روابط مفيدة

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/performance-tips.html)
- [Database Indexing Strategies](https://use-the-index-luke.com/)

---

**آخر تحديث:** 2025-11-27
**الإصدار:** 2.0
**قاعدة البيانات:** PostgreSQL
