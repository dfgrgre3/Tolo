# Migration Guide: Old i18n → Secure i18n

## Overview

This guide helps you migrate from the vulnerable i18n implementation to the secure version.

---

## 🔄 Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
// If you had a custom i18n implementation
import { translate } from '@/lib/old-i18n';
```

**After:**
```typescript
import { createTranslator, sanitizeTranslations } from '@/lib/i18n';
```

---

### Step 2: Update Translation Loading

**Before (Vulnerable):**
```typescript
// ❌ Old vulnerable pattern
function getNestedValue(obj: any, path: string) {
  const keys = path.split('.');
  let value = obj;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]; // VULNERABLE!
    } else {
      return undefined;
    }
  }
  
  return value;
}
```

**After (Secure):**
```typescript
// ✅ New secure pattern
import { getTranslation } from '@/lib/i18n';

const value = getTranslation(translations, 'path.to.key', 'fallback');
```

---

### Step 3: Create Translator Instance

**Before:**
```typescript
// Old pattern - direct object access
const t = (key: string) => {
  return translations[key] || key;
};
```

**After:**
```typescript
// New pattern - secure translator
import { createTranslator } from '@/lib/i18n';

const t = createTranslator(translations, fallbackTranslations);
```

---

### Step 4: Sanitize External Data

**Before:**
```typescript
// ❌ No sanitization
async function loadTranslations() {
  const response = await fetch('/api/translations');
  const data = await response.json();
  return data; // DANGEROUS!
}
```

**After:**
```typescript
// ✅ With sanitization
import { sanitizeTranslations } from '@/lib/i18n';

async function loadTranslations() {
  const response = await fetch('/api/translations');
  const data = await response.json();
  return sanitizeTranslations(data); // SAFE!
}
```

---

## 📋 Code Patterns to Replace

### Pattern 1: Direct Property Access

**Before:**
```typescript
// ❌ Vulnerable
const value = obj[key];
```

**After:**
```typescript
// ✅ Secure
import { getTranslation } from '@/lib/i18n';
const value = getTranslation(obj, key);
```

---

### Pattern 2: Using 'in' Operator

**Before:**
```typescript
// ❌ Checks inherited properties
if (key in obj) {
  value = obj[key];
}
```

**After:**
```typescript
// ✅ Only checks own properties
if (Object.prototype.hasOwnProperty.call(obj, key)) {
  value = obj[key];
}

// Or better, use the safe getter:
import { getTranslation } from '@/lib/i18n';
const value = getTranslation(obj, key);
```

---

### Pattern 3: Nested Path Access

**Before:**
```typescript
// ❌ Vulnerable to prototype pollution
function getByPath(obj: any, path: string) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
```

**After:**
```typescript
// ✅ Secure path access
import { getTranslation } from '@/lib/i18n';

const value = getTranslation(translations, 'nested.path.key');
```

---

### Pattern 4: Object Merging

**Before:**
```typescript
// ❌ Can pollute prototypes
const merged = { ...base, ...override };
```

**After:**
```typescript
// ✅ Safe merging
import { mergeTranslations } from '@/lib/i18n';

const merged = mergeTranslations(base, override);
```

---

## 🔍 Finding Vulnerable Code

Use these grep commands to find potentially vulnerable code:

```bash
# Find direct property access in loops
grep -r "value\[k\]" src/

# Find 'in' operator usage
grep -r "in value" src/

# Find reduce with property access
grep -r "reduce.*\[k\]" src/

# Find Object.assign usage
grep -r "Object.assign" src/
```

---

## ✅ Verification Checklist

After migration:

- [ ] All imports updated to use `@/lib/i18n`
- [ ] All direct property access replaced
- [ ] All 'in' operator checks replaced with `hasOwnProperty.call()`
- [ ] All external data sources sanitized
- [ ] Tests updated and passing
- [ ] No security warnings in console
- [ ] Semgrep scan passes

---

## 🧪 Testing Your Migration

### 1. Run Unit Tests
```bash
npm test src/lib/__tests__/i18n.test.ts
```

### 2. Test with Malicious Input
```typescript
// Test that prototype pollution is blocked
const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}}');
const safe = sanitizeTranslations(malicious);
const t = createTranslator(safe);

// Verify pollution didn't happen
console.assert(!(Object.prototype as any).polluted, 'Prototype was polluted!');
```

### 3. Run Security Scan
```bash
# If you have Semgrep installed
semgrep --config auto src/lib/i18n.ts

# Should show no prototype pollution issues
```

---

## 📊 Migration Checklist by File Type

### React Components
```typescript
// Before
const MyComponent = () => {
  const text = translations.auth.login.title; // ❌
  return <h1>{text}</h1>;
};

// After
import { createTranslator } from '@/lib/i18n';
const t = createTranslator(translations);

const MyComponent = () => {
  const text = t('auth.login.title'); // ✅
  return <h1>{text}</h1>;
};
```

### API Routes
```typescript
// Before
export async function GET() {
  const data = await fetchTranslations(); // ❌ No sanitization
  return Response.json(data);
}

// After
import { sanitizeTranslations } from '@/lib/i18n';

export async function GET() {
  const data = await fetchTranslations();
  const safe = sanitizeTranslations(data); // ✅ Sanitized
  return Response.json(safe);
}
```

### Utility Functions
```typescript
// Before
function translate(key: string) {
  return translations[key] || key; // ❌
}

// After
import { createTranslator } from '@/lib/i18n';
const t = createTranslator(translations);

function translate(key: string) {
  return t(key); // ✅
}
```

---

## 🚨 Common Migration Mistakes

### Mistake 1: Forgetting to Sanitize
```typescript
// ❌ WRONG
const apiData = await fetch('/api/translations').then(r => r.json());
const t = createTranslator(apiData); // Still vulnerable!

// ✅ CORRECT
const apiData = await fetch('/api/translations').then(r => r.json());
const safe = sanitizeTranslations(apiData);
const t = createTranslator(safe);
```

### Mistake 2: Mixing Old and New Patterns
```typescript
// ❌ WRONG - Still using direct access
const t = createTranslator(translations);
const value = translations[key]; // Don't do this!

// ✅ CORRECT - Use translator consistently
const t = createTranslator(translations);
const value = t(key);
```

### Mistake 3: Not Validating Structure
```typescript
// ❌ WRONG - Assuming structure is safe
const t = createTranslator(externalData);

// ✅ CORRECT - Validate and sanitize
const safe = sanitizeTranslations(externalData);
const t = createTranslator(safe);
```

---

## 📞 Need Help?

If you encounter issues during migration:

1. Check the [Security Documentation](./i18n-prototype-pollution-fix.md)
2. Review the [Quick Reference](./i18n-quick-reference.md)
3. Look at [Usage Examples](../lib/i18n-example.ts)
4. Run the test suite to verify behavior

---

## 🎯 Post-Migration

After completing the migration:

1. **Run all tests**: `npm test`
2. **Security scan**: `semgrep --config auto src/`
3. **Code review**: Have team review changes
4. **Monitor logs**: Watch for security warnings
5. **Update documentation**: Document any custom patterns

---

**Migration Status**: ✅ Complete when all checklist items are done
