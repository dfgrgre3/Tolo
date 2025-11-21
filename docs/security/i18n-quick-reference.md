# 🛡️ i18n Security Quick Reference

## ✅ DO's

### 1. Always Use the Secure Functions
```typescript
import { createTranslator, sanitizeTranslations } from '@/lib/i18n';

// ✅ GOOD
const t = createTranslator(translations);
```

### 2. Sanitize External Data
```typescript
// ✅ GOOD - Always sanitize untrusted data
const apiData = await fetch('/api/translations').then(r => r.json());
const safe = sanitizeTranslations(apiData);
const t = createTranslator(safe);
```

### 3. Use Fallbacks
```typescript
// ✅ GOOD - Provide fallbacks
t('missing.key', 'Default Value');
```

### 4. Validate Structure
```typescript
// ✅ GOOD - Validate before using
import { z } from 'zod';

const schema = z.record(z.string());
const validated = schema.parse(sanitizeTranslations(data));
```

---

## ❌ DON'Ts

### 1. Never Use Raw External Data
```typescript
// ❌ BAD - Direct use of external data
const apiData = await fetch('/api/translations').then(r => r.json());
const t = createTranslator(apiData); // DANGEROUS!
```

### 2. Never Access Properties Directly
```typescript
// ❌ BAD - Direct property access
const value = translations[key]; // Use getTranslation() instead
```

### 3. Never Use 'in' Operator
```typescript
// ❌ BAD - Checks inherited properties
if (key in obj) { ... }

// ✅ GOOD - Only checks own properties
if (Object.prototype.hasOwnProperty.call(obj, key)) { ... }
```

### 4. Never Trust User Input
```typescript
// ❌ BAD - User input without sanitization
const userTranslations = JSON.parse(userInput);
const t = createTranslator(userTranslations); // DANGEROUS!

// ✅ GOOD - Sanitize first
const userTranslations = JSON.parse(userInput);
const safe = sanitizeTranslations(userTranslations);
const t = createTranslator(safe);
```

---

## 🔍 Security Checklist

Before deploying:

- [ ] All translation sources are sanitized
- [ ] No direct property access (`obj[key]`)
- [ ] No use of `in` operator for property checks
- [ ] External data is validated
- [ ] Tests are passing
- [ ] Security warnings are monitored

---

## 🚨 Dangerous Keys (Blocked)

These keys are automatically blocked:
- `__proto__`
- `constructor`
- `prototype`
- `hasOwnProperty`
- `isPrototypeOf`
- `propertyIsEnumerable`
- `toString`
- `valueOf`
- `toLocaleString`

---

## 📝 Quick Examples

### Basic Usage
```typescript
const t = createTranslator({
  welcome: 'مرحباً',
  goodbye: 'وداعاً'
});

console.log(t('welcome')); // 'مرحباً'
```

### With Fallback Locale
```typescript
const t = createTranslator(arabicTranslations, englishTranslations);
console.log(t('missing.key')); // Falls back to English
```

### Sanitizing API Data
```typescript
async function loadTranslations(locale: string) {
  const response = await fetch(`/api/i18n/${locale}`);
  const data = await response.json();
  return sanitizeTranslations(data); // Always sanitize!
}
```

---

## 🧪 Testing

```bash
# Run security tests
npm test src/lib/__tests__/i18n.test.ts

# Run with coverage
npm test -- --coverage src/lib/__tests__/i18n.test.ts
```

---

## 📚 More Information

See: `docs/security/i18n-prototype-pollution-fix.md`
