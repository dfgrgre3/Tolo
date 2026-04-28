/**
 * Log Sanitizer - نظام تنقية البيانات الحساسة من الـ Logs
 * يمنع تسريب المعلومات الحساسة مثل كلمات المرور، API Keys، والـ Tokens
 */

// قائمة الحقول الحساسة التي يجب إخفاؤها
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'jwt_secret',
  'jwtSecret',
  'secret',
  'api_key',
  'apiKey',
  'apikey',
  'smtp_pass',
  'smtp_password',
  'redis_url',
  'redisUrl',
  'database_url',
  'databaseUrl',
  'dsn',
  'connection_string',
  'private_key',
  'privateKey',
  'client_secret',
  'clientSecret',
  'smtp_pass',
  'authorization',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'authentication',
];

// أنماط البيانات الحساسة (RegEx patterns)
const SENSITIVE_PATTERNS = [
  // JWT tokens
  /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
  // API Keys (generic)
  /(api[_-]?key|apikey)["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}/gi,
  // SMTP passwords
  /(smtp[_-]?pass|smtppassword)["\s]*[:=]["\s]*[^\s"']+/gi,
  // Database URLs with credentials
  /(postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@/gi,
  // Authorization headers
  /(authorization|token)["\s]*[:=]["\s]*[^\s"']+/gi,
];

const MASKED_VALUE = '[REDACTED]';

/**
 * فحص ما إذا كان الحقل حساساً
 */
function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some(field => 
    lowerKey.includes(field.toLowerCase()) || 
    field.toLowerCase().includes(lowerKey)
  );
}

/**
 * تنقية القيمة بناءً على الأنماط الحساسة
 */
function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  let sanitized = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, MASKED_VALUE);
  }
  
  return sanitized;
}

/**
 * تنقية الكائن من البيانات الحساسة (بشكل عميق)
 */
function sanitizeObject(obj: any, depth: number = 0): any {
  // منع التكرار اللانهائي
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // إذا كانت القيمة نصاً
  if (typeof obj === 'string') {
    return sanitizeValue(obj);
  }

  // إذا كانت القيمة مصفوفة
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // إذا كانت القيمة كائناً
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const key of Object.keys(obj)) {
      if (isSensitiveField(key)) {
        sanitized[key] = MASKED_VALUE;
      } else {
        sanitized[key] = sanitizeObject(obj[key], depth + 1);
      }
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * تنقية رسالة الخطأ
 */
export function sanitizeErrorMessage(message: string): string {
  if (typeof message !== 'string') {
    return message;
  }
  
  return sanitizeValue(message);
}

/**
 * تنقية الـ context قبل التسجيل
 */
export function sanitizeLogContext(context: any): any {
  if (!context) return context;
  
  try {
    // نسخ الكائن لتجنب تعديل الأصل
    const cloned = JSON.parse(JSON.stringify(context));
    return sanitizeObject(cloned);
  } catch (error) {
    // إذا فشل النسخ، أرجع الكائن كما هو
    return context;
  }
}

/**
 * التحقق مما إذا كانت الرسالة تحتوي على بيانات حساسة
 */
export function containsSensitiveData(message: string, context?: any): boolean {
  const checkStr = message + JSON.stringify(context || {});
    
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(checkStr)) {
      return true;
    }
  }
    
  return false;
}

