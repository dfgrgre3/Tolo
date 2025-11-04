# كيفية إضافة Scopes في Google Cloud Console

## 📍 الخطوات التفصيلية

### الخطوة 1: الوصول إلى OAuth Consent Screen

1. افتح [Google Cloud Console](https://console.cloud.google.com/)
2. اختر المشروع الخاص بك (glassy-vial-474715-u2)
3. من القائمة الجانبية، اذهب إلى:
   ```
   APIs & Services > OAuth consent screen
   ```

### الخطوة 2: إضافة Scopes

#### 2.1 الوصول إلى صفحة Scopes
- بعد إكمال "App information" (الخطوة الأولى)
- انقر على "Save and Continue"
- ستصل إلى صفحة "Scopes"

#### 2.2 إضافة Scopes المطلوبة

1. انقر على زر **"Add or Remove Scopes"**
2. ستفتح نافذة منبثقة

#### 2.3 في النافذة المنبثقة:

**ستجد قائمة من Scopes جاهزة، ابحث عن:**

1. **للحصول على البريد الإلكتروني:**
   - ابحث عن: `userinfo.email`
   - أو: `.../auth/userinfo.email`
   - ✅ **ضع علامة صح بجانب**: 
     ```
     https://www.googleapis.com/auth/userinfo.email
     ```
   - أو قد يظهر كـ:
     ```
     .../auth/userinfo.email
     ```

2. **للحصول على معلومات الملف الشخصي:**
   - ابحث عن: `userinfo.profile`
   - أو: `.../auth/userinfo.profile`
   - ✅ **ضع علامة صح بجانب**: 
     ```
     https://www.googleapis.com/auth/userinfo.profile
     ```
   - أو قد يظهر كـ:
     ```
     .../auth/userinfo.profile
     ```

3. **للحصول على OpenID Connect:**
   - ابحث عن: `openid`
   - ✅ **ضع علامة صح بجانب**: 
     ```
     openid
     ```
   - أو:
     ```
     https://www.googleapis.com/auth/openid
     ```

#### 2.4 حفظ التغييرات

- بعد تحديد جميع الـ Scopes المطلوبة
- انقر على **"Update"** في أسفل النافذة المنبثقة
- ثم انقر **"Save and Continue"** في صفحة Scopes

---

## 🔍 إذا لم تجد Scopes في القائمة

### طريقة بديلة: البحث المباشر

1. في نافذة "Add or Remove Scopes"
2. استخدم مربع البحث في الأعلى
3. ابحث عن:
   - `email`
   - `profile`
   - `openid`

### أو اكتب مباشرة في البحث:

```
userinfo.email
userinfo.profile
openid
```

---

## ✅ Scopes المطلوبة بالكامل

تأكد من إضافة هذه الـ Scopes الثلاثة:

1. ✅ **Email**
   - الرابط الكامل: `https://www.googleapis.com/auth/userinfo.email`
   - أو: `.../auth/userinfo.email`

2. ✅ **Profile**
   - الرابط الكامل: `https://www.googleapis.com/auth/userinfo.profile`
   - أو: `.../auth/userinfo.profile`

3. ✅ **OpenID**
   - الرابط الكامل: `https://www.googleapis.com/auth/openid`
   - أو: `openid`

---

## 📸 الصور التوضيحية (وصف)

### في صفحة OAuth Consent Screen:

```
┌─────────────────────────────────────┐
│ OAuth consent screen               │
├─────────────────────────────────────┤
│ Step 1: App information  ✓          │
│ Step 2: Scopes          ← هنا أنت   │
│ Step 3: Test users                 │
│ Step 4: Summary                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Scopes                              │
│                                     │
│ [Add or Remove Scopes]  ← انقر هنا │
│                                     │
└─────────────────────────────────────┘
```

### في نافذة Add or Remove Scopes:

```
┌─────────────────────────────────────┐
│ Add or Remove Scopes               │
├─────────────────────────────────────┤
│ [Search box]                        │
│                                     │
│ ☑ https://www.googleapis.com/       │
│   auth/userinfo.email               │
│                                     │
│ ☑ https://www.googleapis.com/      │
│   auth/userinfo.profile             │
│                                     │
│ ☑ openid                           │
│   (أو https://www.googleapis.com/   │
│   auth/openid)                      │
│                                     │
│ [Update]  [Cancel]                 │
└─────────────────────────────────────┘
```

---

## ⚠️ ملاحظات مهمة

1. **الترتيب غير مهم**: لا يهم ترتيب إضافة الـ Scopes
2. **الاسم الكامل أو المختصر**: يمكنك استخدام أي منهما
3. **OpenID**: قد يظهر كـ `openid` فقط أو كرابط كامل
4. **الحد الأدنى**: تحتاج على الأقل `email` و `profile` و `openid`

---

## 🎯 مثال عملي

عند إضافة Scopes، يجب أن ترى في صفحة Scopes:

```
Selected scopes:
✓ https://www.googleapis.com/auth/userinfo.email
✓ https://www.googleapis.com/auth/userinfo.profile  
✓ openid
```

أو:

```
Selected scopes:
✓ .../auth/userinfo.email
✓ .../auth/userinfo.profile
✓ openid
```

---

## ✅ بعد إضافة Scopes

1. انقر "Save and Continue"
2. انتقل إلى "Test users" (إذا كان في وضع Testing)
3. أضف بريدك الإلكتروني
4. انقر "Save and Continue" حتى النهاية

---

## 🆘 إذا لم تجد Scopes

إذا لم تجد هذه الـ Scopes في القائمة:

1. تأكد من تفعيل APIs التالية:
   - Google+ API
   - Google Identity API
2. جرب البحث بكلمات مختلفة:
   - `email`
   - `profile`
   - `userinfo`
3. تأكد من أنك في المشروع الصحيح

---

## 📝 ملخص سريع

1. **اذهب إلى**: APIs & Services > OAuth consent screen
2. **في صفحة Scopes**: انقر "Add or Remove Scopes"
3. **ابحث وأضف**:
   - `userinfo.email` أو `.../auth/userinfo.email`
   - `userinfo.profile` أو `.../auth/userinfo.profile`
   - `openid`
4. **احفظ**: انقر "Update" ثم "Save and Continue"

---

الآن يجب أن تكون قادراً على إضافة Scopes بنجاح! 🎉

