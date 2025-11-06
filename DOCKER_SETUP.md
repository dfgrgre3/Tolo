# إعداد Docker للنشر

## متطلبات مسبقة

### 1. تثبيت Docker

#### على Windows:
1. قم بتنزيل [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. قم بتثبيت Docker Desktop
3. أعد تشغيل الكمبيوتر إذا لزم الأمر
4. تأكد من تشغيل Docker Desktop

#### التحقق من التثبيت:
```powershell
docker --version
docker-compose --version
```

### 2. إنشاء ملف `.env`

انسخ ملف `.env.example` إلى `.env` واملأ القيم:

```powershell
Copy-Item .env.example .env
```

ثم عدّل ملف `.env` بالقيم الفعلية.

## بناء صورة Docker

```powershell
docker build -t thanawy:latest .
```

## تشغيل الحاوية

### الطريقة 1: استخدام ملف `.env`
```powershell
docker run -p 3000:3000 --env-file .env thanawy:latest
```

### الطريقة 2: تمرير متغيرات البيئة مباشرة
```powershell
docker run -p 3000:3000 `
  -e DATABASE_URL="your-database-url" `
  -e JWT_SECRET="your-jwt-secret" `
  -e NEXTAUTH_SECRET="your-nextauth-secret" `
  -e NEXT_PUBLIC_BASE_URL="http://localhost:3000" `
  thanawy:latest
```

### الطريقة 3: استخدام docker-compose
```powershell
docker-compose up
```

## التحقق من التشغيل

بعد تشغيل الحاوية، افتح المتصفح على:
- `http://localhost:3000`

تحقق من الصحة:
- `http://localhost:3000/healthz` - يجب أن يعيد `200 OK`
- `http://localhost:3000/readyz` - يجب أن يعيد `200 OK`

## استكشاف الأخطاء

### مشكلة: Docker غير معروف
**الحل:** تأكد من تثبيت Docker Desktop وتشغيله

### مشكلة: خطأ في البناء
**الحل:** 
- تأكد من وجود `package-lock.json`
- تأكد من وجود `prisma/schema.prisma`
- راجع سجلات البناء: `docker build -t thanawy:latest . --progress=plain`

### مشكلة: خطأ في قاعدة البيانات
**الحل:**
- تأكد من صحة `DATABASE_URL` في `.env`
- إذا كنت تستخدم SQLite، تأكد من أن المسار صحيح

### مشكلة: خطأ في المنفذ
**الحل:**
- تأكد من عدم استخدام المنفذ 3000 من تطبيق آخر
- استخدم منفذ مختلف: `docker run -p 3001:3000 --env-file .env thanawy:latest`

## أوامر مفيدة

### عرض الحاويات الجارية
```powershell
docker ps
```

### عرض جميع الحاويات
```powershell
docker ps -a
```

### إيقاف حاوية
```powershell
docker stop <container-id>
```

### عرض سجلات الحاوية
```powershell
docker logs <container-id>
```

### إزالة حاوية
```powershell
docker rm <container-id>
```

### إزالة صورة
```powershell
docker rmi thanawy:latest
```

### بناء بدون cache
```powershell
docker build --no-cache -t thanawy:latest .
```

## النشر على Kubernetes

بعد بناء الصورة بنجاح، يمكنك دفعها إلى registry:

```powershell
# تسجيل الدخول إلى registry
docker login your-registry.com

# إعادة تسمية الصورة
docker tag thanawy:latest your-registry.com/thanawy:latest

# دفع الصورة
docker push your-registry.com/thanawy:latest
```

ثم استخدمها في `k8s/deployment.yml`.

