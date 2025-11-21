# Path Traversal Vulnerability Fix

## Issue
**File:** `scripts/check-coverage.js`  
**Severity:** Medium  
**Pattern:** Path Traversal / Unsafe File Path Construction  
**Introduced by:** dfgrgre3, 20 days ago  
**Time to fix:** 15 minutes

## Problem Description
The application was dynamically constructing file paths without proper validation. While the original code used hardcoded paths, it didn't follow security best practices for path validation, which could potentially be exploited if the code were modified to accept user input in the future.

### Original Vulnerable Code
```javascript
const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(COVERAGE_FILE)) {
  console.error('❌ ملف التغطية غير موجود، يرجى تشغيل الاختبارات أولاً');
  process.exit(1);
}
```

### Security Risks
- No path normalization to remove `..` segments
- No validation that the resolved path stays within authorized directories
- Potential for path traversal if code is modified to accept dynamic input

## Solution Implemented

### Security Measures Added

1. **Define Base Directories**
   ```javascript
   const PROJECT_ROOT = path.resolve(__dirname, '..');
   const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');
   ```

2. **Path Normalization**
   ```javascript
   const coverageFilePath = path.join(COVERAGE_DIR, 'coverage-summary.json');
   const COVERAGE_FILE = path.normalize(coverageFilePath);
   ```

3. **Path Validation**
   ```javascript
   if (!COVERAGE_FILE.startsWith(COVERAGE_DIR)) {
     console.error('❌ مسار ملف التغطية غير صالح - محاولة الوصول خارج الدليل المسموح');
     process.exit(1);
   }
   ```

### How This Prevents Path Traversal

1. **`path.normalize()`**: Removes any `..` or `.` segments from the path, preventing directory traversal attempts
2. **`startsWith()` validation**: Ensures the final resolved path is within the allowed `COVERAGE_DIR` directory
3. **Explicit base directory**: Clearly defines the authorized directory scope for file operations

### Example Attack Prevention

If the code were modified to accept user input:
```javascript
// Hypothetical vulnerable modification
const userPath = req.query.file; // e.g., "../../etc/passwd"
const filePath = path.join(COVERAGE_DIR, userPath);
```

With our security measures:
```javascript
const filePath = path.normalize(path.join(COVERAGE_DIR, userPath));
if (!filePath.startsWith(COVERAGE_DIR)) {
  // This would catch attempts like "../../etc/passwd"
  console.error('Invalid path!');
  process.exit(1);
}
```

## Best Practices Applied

✅ **Avoid user input in filesystem paths** - Use unique identifiers instead  
✅ **Normalize paths** - Use `path.normalize()` to remove traversal sequences  
✅ **Validate path boundaries** - Verify paths stay within authorized directories  
✅ **Define base directories** - Explicitly set allowed directory scopes  
✅ **Fail securely** - Exit with error on validation failure

## Testing

The script can be tested by running:
```bash
node scripts/check-coverage.js
```

Expected behaviors:
- ✅ Successfully reads coverage file from `coverage/coverage-summary.json`
- ✅ Rejects any path that resolves outside the coverage directory
- ✅ Normalizes paths to prevent traversal attempts

## References

- [Semgrep Rule: Path Traversal](https://semgrep.dev/docs/cheat-sheets/nodejs-command-injection/)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [Node.js Path Module Documentation](https://nodejs.org/api/path.html)

## Status
✅ **FIXED** - Path traversal vulnerability has been mitigated with proper validation and normalization.
