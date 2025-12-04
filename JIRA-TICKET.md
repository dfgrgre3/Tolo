**Title:** Security Investigation: Hardcoded String in `src/lib/two-factor/totp-service.ts`

**Issue Type:** Task
**Component/s:** Security
**Reporter:** Gemini

**Description:**

A hardcoded string was identified in the codebase at `src/lib/two-factor/totp-service.ts` on line 11:
```typescript
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
```
An investigation was initiated to determine if this hardcoded string posed a security risk.

**Investigation Findings:**

The string `BASE32_CHARS` is a constant that defines the character set for Base32 encoding. This is a standard and public part of the Base32 encoding algorithm, which is used for generating TOTP (Time-based One-Time Password) secrets.

**Conclusion:**

The hardcoded string is **not a secret** and does **not** pose a security risk. It is a necessary constant for the TOTP implementation. No further action is required.

**Status:** Closed

**Additional Findings (2025-12-04):**

A hardcoded secret `'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'` was identified in `src/app/api/auth/two-factor/route.ts`. This was a security vulnerability as it was used as a placeholder secret for 2FA setup.

**Resolution:**
The hardcoded secret in `src/app/api/auth/two-factor/route.ts` has been replaced with `generateSecret()` from `src/lib/two-factor/totp-service.ts`, which generates a cryptographically secure random secret. The code now properly implements secure 2FA setup and verification.
