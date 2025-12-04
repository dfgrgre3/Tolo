# Security Issue: Hardcoded Secret in 2FA Route

**Status:** Resolved
**Priority:** High
**Reporter:** User
**Assignee:** Antigravity

## Description
A hardcoded secret was reported in `src/app/api/auth/two-factor/route.ts`:
```typescript
const secret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 encoded secret
```
This poses a significant security risk as the secret would be the same for all users or operations if used for TOTP generation.

## Investigation
1.  **Codebase Search:** Searched for the hardcoded string `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567` in the current codebase.
    *   **Result:** Not found in `src/app/api/auth/two-factor/route.ts`.
    *   **Note:** The string exists in `src/lib/two-factor/totp-service.ts` as `BASE32_CHARS`, which is the standard Base32 alphabet and is **not** a security risk.

2.  **Git History Analysis:** Checked the git history of `src/app/api/auth/two-factor/route.ts`.
    *   **Finding:** The hardcoded secret WAS present in commit `2f1f738fac551ecd396e4ffb5857038f0aeb4da9` (introduced by `dfgrgre3` on Oct 23, 2025).
    *   **Current State:** The hardcoded secret has been removed in subsequent commits.

3.  **Current Implementation Verification:**
    *   The file `src/app/api/auth/two-factor/route.ts` now uses `generateSecret()` from `@/lib/two-factor/totp-service`.
    *   `generateSecret()` uses `crypto.randomBytes(20)` to generate a cryptographically secure random secret.

## Resolution
The issue has already been fixed in the current version of the codebase. The hardcoded secret was removed and replaced with a secure generation method.

**Action Taken:** verified fix and documented findings.
