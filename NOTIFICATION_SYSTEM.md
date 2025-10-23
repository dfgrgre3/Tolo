
# نظام الإشعارات المتعدد القنوات

يمنحك هذا النظام القدرة على إرسال الإشعارات عبر قنوات متعددة بما في ذلك التطبيق والبريد الإلكتروني والرسائل النصية القصيرة (SMS).

## الميزات

- إرسال الإشعارات داخل التطبيق
- إرسال الإشعارات عبر البريد الإلكتروني باستخدام Nodemailer
- إرسال الإشعارات عبر الرسائل النصية القصيرة باستخدام Twilio
- تخصيص تفضيلات الإشعارات لكل مستخدم
- اختبار قنوات الإشعارات

## المتطلبات

### بيئة البريد الإلكتروني (SMTP)

لإرسال الإشعارات عبر البريد الإلكتروني، يجب تكوين متغيرات البيئة التالية:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

### بيئة الرسائل النصية (Twilio)

لإرسال الإشعارات عبر الرسائل النصية، يجب تكوين متغيرات البيئة التالية:

```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## الاستخدام

### إرسال إشعار متعدد القنوات

```typescript
import { sendMultiChannelNotification } from '@/lib/notification-sender-new';

// إرسال إشعار عبر التطبيق والبريد الإلكتروني والرسائل النصية
await sendMultiChannelNotification({
  userId: 'user-id',
  title: 'عنوان الإشعار',
  message: 'نص الإشعار',
  type: 'info',
  channels: ['app', 'email', 'sms'],
  actionUrl: 'https://example.com',
  icon: '📢'
});
```

### إعدادات المستخدم

يمكن للمستخدمين تخصيص تفضيلات الإشعارات الخاصة بهم عبر صفحة الإعدادات:

```
/settings/notifications
```

## قاعدة البيانات

تم تحديث نموذج المستخدم في قاعدة البيانات لتشمل:

- `phone`: رقم هاتف المستخدم (اختياري)
- `emailNotifications`: تفضيل استلام إشعارات البريد الإلكتروني (افتراضي: true)
- `smsNotifications`: تفضيل استلام إشعارات الرسائل النصية (افتراضي: false)

## واجهة برمجة التطبيقات (API)

### إرسال الإشعارات

```
POST /api/notifications/send
```

البيانات المطلوبة:

```json
{
  "title": "عنوان الإشعار",
  "message": "نص الإشعار",
  "type": "info|success|warning|error",
  "channels": ["app", "email", "sms"],
  "actionUrl": "https://example.com",
  "icon": "📢"
}
```

### إعدادات الإشعارات

```
GET /api/user/notification-settings
PUT /api/user/notification-settings
```

البيانات المطلوبة للتحديث:

```json
{
  "emailNotifications": true,
  "smsNotifications": false,
  "phone": "+1234567890"
}
```

## التثبيت

1. تثبيت الحزم المطلوبة:

```bash
npm install nodemailer twilio
```

2. تكوين متغيرات البيئة

3. تحديث قاعدة البيانات:

```bash
npx prisma migrate dev --name notification-settings
```

4. إعادة تشغيل الخادم
