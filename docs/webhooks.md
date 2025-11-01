# نظام Webhooks

## الأحداث المتاحة

### `user.registered`
يتم إرساله عند تسجيل مستخدم جديد

**مثال البيانات:**
```json
{
  "event": "user.registered",
  "data": {
    "id": "123",
    "email": "user@example.com"
  },
  "timestamp": "2025-10-25T12:00:00Z"
}
```

## إعداد Webhook
1. أرسل طلب POST إلى `/api/webhooks`
2. احتفظ بالـ `secret` للتحقق من الطلبات
