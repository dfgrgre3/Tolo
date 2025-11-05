# متغيرات البيئة المطلوبة

هذا الملف يوثق جميع متغيرات البيئة المطلوبة لتشغيل التطبيق.

## متغيرات البيئة الأساسية

### قاعدة البيانات
```env
DATABASE_URL=file:./dev.db
```

### الأمان
```env
JWT_SECRET=your-jwt-secret-key-here-must-be-at-least-32-characters-long
NEXTAUTH_SECRET=your-nextauth-secret-key-here
```

### التطبيق
```env
NEXT_PUBLIC_APP_NAME=Thanawy
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_RP_ID=localhost
```

## متغيرات البيئة الاختيارية

### Google OAuth (للتسجيل عبر Google)
```env
GOOGLE_CLIENT_ID=your-google-client-id<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### إعدادات البريد الإلكتروني (SMTP) - لإرسال الإشعارات عبر البريد الإلكتروني

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

**ملاحظات:**
- `SMTP_SECURE`: يمكن أن يكون `true` أو `false` 
  - `true` للبورت 465 (SSL/TLS)
  - `false` للبورت 587 (STARTTLS)
- بدون إعداد SMTP، سيتم استخدام محاكاة الإرسال (simulated mode)

### إعدادات Twilio - لإرسال الإشعارات عبر الرسائل النصية (SMS)

```env
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**ملاحظات:**
- `TWILIO_PHONE_NUMBER` يجب أن يكون برقم هاتف Twilio الذي تم التحقق منه
- بدون إعداد Twilio، سيتم استخدام محاكاة الإرسال (simulated mode)

## كيفية الإعداد

1. انسخ هذا الملف إلى `.env.local` في جذر المشروع
2. استبدل القيم الفعلية بقيمك الخاصة
3. لا تضع مسافات حول علامة `=`
4. لا تضع علامات اقتباس حول القيم
5. أعد تشغيل الخادم بعد إضافة/تعديل المتغيرات

## مثال على ملف `.env.local`

```env
# قاعدة البيانات
DATABASE_URL=file:./dev.db

# الأمان
JWT_SECRET=my-super-secret-jwt-key-that-is-at-least-32-characters-long
NEXTAUTH_SECRET=my-nextauth-secret-key

# التطبيق
NEXT_PUBLIC_APP_NAME=Thanawy
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_RP_ID=localhost

# Google OAuth (اختياري)
GOOGLE_CLIENT_ID=your-google-client-id<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=your-google-client-secret

# SMTP (اختياري - لإرسال الإشعارات عبر البريد الإلكتروني)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio (اختياري - لإرسال الإشعارات عبر SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

