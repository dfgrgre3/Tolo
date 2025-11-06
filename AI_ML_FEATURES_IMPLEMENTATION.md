# تطبيق ميزات الذكاء الاصطناعي والتعلم الآلي / AI & ML Features Implementation

## ✅ الميزات المكتملة

### 1. مساعد ذكي متكامل محسّن (Enhanced AI Assistant Chatbot) ⭐⭐⭐⭐⭐

#### الميزات المضافة:
- ✅ **دعم الإدخال الصوتي**: استخدام Web Speech API للتعرف على الصوت بالعربية
- ✅ **تحليل المشاعر المتكامل**: تحليل تلقائي للمشاعر مع تنبيهات دعم
- ✅ **فهم السياق المحسّن**: استخدام تحليل المشاعر لتكييف الردود
- ✅ **حفظ المحادثات**: حفظ جميع الرسائل في قاعدة البيانات للتتبع والتحليل

#### الملفات:
- `src/components/ai/AIAssistantEnhanced.tsx` - مكون المساعد المحسّن
- `src/app/api/ai/chat/route.ts` - واجهة برمجة التطبيقات مع تحليل المشاعر

#### الاستخدام:
```tsx
import AIAssistantEnhanced from '@/components/ai/AIAssistantEnhanced';

<AIAssistantEnhanced 
  userId={user.id}
  title="المساعد الذكي"
/>
```

---

### 2. نظام توصيات متقدم بالتعلم الآلي (Advanced ML Recommendation System) ⭐⭐⭐⭐⭐

#### الخوارزميات المطبقة:
- ✅ **Collaborative Filtering**: إيجاد مستخدمين مشابهين وتوصيات بناءً على تفضيلاتهم
- ✅ **Content-Based Filtering**: توصيات بناءً على محتوى مشابه لما أعجب المستخدم
- ✅ **Hybrid Approach**: دمج الخوارزميتين للحصول على أفضل النتائج

#### الملفات:
- `src/lib/ai/ml-recommendations.ts` - خدمة التوصيات
- `src/app/api/ai/recommendations/route.ts` - واجهة برمجة التطبيقات

#### الاستخدام:
```typescript
// الحصول على التوصيات
GET /api/ai/recommendations?limit=10

// تسجيل تفاعل المستخدم
POST /api/ai/recommendations
{
  "type": "like|view|click|complete",
  "itemType": "resource|course|exam",
  "itemId": "item-id",
  "metadata": {}
}
```

---

### 3. تحليل المشاعر (Sentiment Analysis) ⭐⭐⭐

#### الميزات:
- ✅ **تحليل تلقائي**: تحليل مشاعر الرسائل في الوقت الفعلي
- ✅ **اكتشاف المشاكل**: اكتشاف الإحباط والتعب والتوتر
- ✅ **اقتراحات دعم**: تقديم اقتراحات دعم بناءً على المشاعر المكتشفة
- ✅ **تتبع الاتجاهات**: تتبع اتجاهات المشاعر للمستخدم مع مرور الوقت

#### الملفات:
- `src/lib/ai/sentiment-analysis.ts` - خدمة تحليل المشاعر
- `src/app/api/ai/sentiment/route.ts` - واجهة برمجة التطبيقات

#### الاستخدام:
```typescript
// تحليل مشاعر نص
POST /api/ai/sentiment
{
  "text": "النص المراد تحليله",
  "context": "chat|task|general"
}

// الحصول على اتجاهات المشاعر
GET /api/ai/sentiment?days=7
```

#### أنواع المشاعر المكتشفة:
- `positive` - إيجابي
- `negative` - سلبي
- `neutral` - محايد
- `frustrated` - محبط
- `tired` - متعب

---

### 4. محتوى منشأ بالذكاء الاصطناعي (AI-Generated Content) ⭐⭐⭐

#### أنواع المحتوى المدعومة:

##### 1. الملخصات التلقائية (Auto Summaries)
```typescript
POST /api/ai/content
{
  "type": "summary",
  "text": "النص المراد تلخيصه",
  "subject": "رياضيات",
  "maxLength": 500
}
```

##### 2. البطاقات التعليمية (Flashcards)
```typescript
POST /api/ai/content
{
  "type": "flashcard",
  "text": "المحتوى المراد تحويله لبطاقات",
  "subject": "فيزياء",
  "count": 10
}
```

##### 3. الخطط الدراسية (Study Plans)
```typescript
POST /api/ai/content
{
  "type": "study_plan",
  "subjects": ["رياضيات", "فيزياء"],
  "duration": 7,
  "hoursPerDay": 2
}
```

##### 4. أسئلة التدريب (Practice Questions)
```typescript
POST /api/ai/content
{
  "type": "practice_question",
  "topic": "الجبر",
  "subject": "رياضيات",
  "count": 5,
  "difficulty": "medium"
}
```

#### الملفات:
- `src/lib/ai/content-generation.ts` - خدمة توليد المحتوى
- `src/app/api/ai/content/route.ts` - واجهة برمجة التطبيقات

---

## 🗄️ تحديثات قاعدة البيانات

تم إضافة النماذج التالية إلى `prisma/schema.prisma`:

### 1. SentimentAnalysis
```prisma
model SentimentAnalysis {
  id          String   @id @default(cuid())
  userId     String
  text       String
  sentiment  String   // 'positive', 'negative', 'neutral', 'frustrated', 'tired'
  score      Float    // -1.0 to 1.0
  confidence Float    // 0.0 to 1.0
  emotions   Json?
  context    String?
  createdAt  DateTime @default(now())
}
```

### 2. AiChatMessage
```prisma
model AiChatMessage {
  id          String   @id @default(cuid())
  userId      String
  role        String   // 'user', 'assistant'
  content     String
  sentiment   String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

### 3. AiGeneratedContent
```prisma
model AiGeneratedContent {
  id          String   @id @default(cuid())
  userId      String
  type        String   // 'summary', 'flashcard', 'study_plan', 'practice_question'
  title       String
  content     String   // JSON string
  subject     String?
  metadata    Json?
  isUsed      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### 4. UserInteraction
```prisma
model UserInteraction {
  id          String   @id @default(cuid())
  userId      String
  type        String   // 'view', 'click', 'complete', 'like', 'dislike', 'bookmark'
  itemType    String   // 'resource', 'course', 'exam', 'content', 'teacher'
  itemId      String
  metadata    Json?
  timestamp   DateTime @default(now())
}
```

### 5. ContentPreference
```prisma
model ContentPreference {
  id          String   @id @default(cuid())
  userId      String
  itemType    String   // 'subject', 'format', 'difficulty', 'teacher'
  itemValue   String
  weight      Float    @default(1.0)
  source      String?  // 'explicit', 'implicit'
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
}
```

### 6. MlRecommendation
```prisma
model MlRecommendation {
  id              String   @id @default(cuid())
  userId          String
  itemType        String   // 'resource', 'course', 'exam', 'content', 'teacher'
  itemId          String
  score           Float    // 0.0 to 1.0
  algorithm       String   // 'collaborative', 'content_based', 'hybrid', 'deep_learning'
  reason          String?
  shownAt         DateTime?
  clickedAt       DateTime?
  completedAt     DateTime?
  feedback        String?
  createdAt       DateTime @default(now())
}
```

---

## 📋 خطوات التطبيق

### 1. تحديث قاعدة البيانات
```bash
# إنشاء migration جديد
npx prisma migrate dev --name add_ai_ml_features

# توليد Prisma Client
npx prisma generate
```

### 2. إعداد متغيرات البيئة
تأكد من وجود:
```env
OPENAI_API_KEY=your-key-here  # اختياري
GEMINI_API_KEY=your-key-here  # مطلوب (يُستخدم كافتراضي)
```

### 3. استخدام الميزات

#### في مكونات React:
```tsx
import AIAssistantEnhanced from '@/components/ai/AIAssistantEnhanced';

function MyPage() {
  return (
    <AIAssistantEnhanced 
      userId={user.id}
      title="المساعد الذكي"
      placeholder="اكتب سؤالك هنا..."
    />
  );
}
```

#### في واجهات برمجة التطبيقات:
```typescript
// الحصول على التوصيات
const response = await fetch('/api/ai/recommendations', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// توليد محتوى
const response = await fetch('/api/ai/content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'summary',
    text: 'النص المراد تلخيصه'
  })
});
```

---

## 🎯 الميزات المستقبلية (اختيارية)

### 1. Deep Learning Models
- استخدام TensorFlow.js أو PyTorch للتعلم العميق
- نماذج مخصصة مدربة على بيانات المستخدمين

### 2. Real-time Recommendations
- تحديث التوصيات في الوقت الفعلي
- WebSocket للتنبيهات الفورية

### 3. Multi-language Support
- دعم لغات متعددة في تحليل المشاعر
- توصيات متعددة اللغات

### 4. Advanced Analytics
- لوحة تحكم لتحليل استخدام الذكاء الاصطناعي
- تقارير أداء التوصيات

---

## 📝 ملاحظات

- جميع الميزات تستخدم Gemini 2.0 Flash كخيار افتراضي
- OpenAI متاح كخيار بديل
- تحليل المشاعر يعمل تلقائياً في المحادثات
- التوصيات تتحسن مع مرور الوقت بناءً على تفاعلات المستخدمين

---

## 🔧 استكشاف الأخطاء

### مشكلة: الإدخال الصوتي لا يعمل
- تأكد من أن المتصفح يدعم Web Speech API
- Chrome و Edge يدعمان بشكل أفضل
- قد يحتاج المستخدم للسماح بالوصول للميكروفون

### مشكلة: التوصيات غير دقيقة
- تأكد من وجود بيانات تفاعل كافية للمستخدمين
- قد تحتاج لانتظار فترة حتى تتراكم البيانات

### مشكلة: تحليل المشاعر غير دقيق
- النظام يستخدم fallback بسيط إذا فشل AI
- قد تحتاج لضبط النماذج حسب البيانات العربية

---

## 📚 المراجع

- [Gemini API Documentation](https://ai.google.dev/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Prisma Documentation](https://www.prisma.io/docs)

