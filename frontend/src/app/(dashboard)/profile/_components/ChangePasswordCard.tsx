"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { getPasswordPolicyError, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { changePassword, forgotPassword } from "@/services/auth/auth-api-service";
import {
  getThrottle,
  recordFailure,
  recordSuccess,
} from "@/lib/auth/attempt-throttle";

const MIN_PASSWORD_LEN = PASSWORD_MIN_LENGTH;

/**
 * Security 6.4 — change password. Never logs or persists the submitted values.
 *
 * Backend contract: `ChangePassword` validates the current password, rejects
 * reuse, then invalidates the old session family and issues a FRESH session
 * (new access/refresh cookies via `ChangePasswordAndCreateSession` +
 * `setAuthTokenCookies` in `auth_handler_password.go`). The correct client
 * follow-through is therefore a cache rebind, NOT a forced re-login: after the
 * change we call `refreshUser()` to re-read identity under the new session and
 * clear the identity-scoped caches, so nothing from the (now dead) pre-change
 * session is replayed. The user stays signed in on the new session.
 */
export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupSent, setSetupSent] = useState(false);
  const [isSendingSetup, setIsSendingSetup] = useState(false);
  const { refreshUser, user } = useAuthContext();

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Client brute-force friction: block submits while locally locked.
    const snap = getThrottle("change-password");
    if (snap.locked) {
      const secs = Math.ceil(snap.remainingMs / 1000);
      setError(`محاولات كثيرة. حاول مرة أخرى بعد ${secs} ثانية.`);
      return;
    }
    if (!currentPassword) {
      setError("يرجى إدخال كلمة المرور الحالية.");
      return;
    }
    const policyError = getPasswordPolicyError(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة غير متطابقة.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("كلمة المرور الجديدة يجب أن تختلف عن الحالية.");
      return;
    }

    setError(null);
    setNeedsSetup(false);
    setIsSaving(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        const after = recordFailure("change-password", result.retryAfterMs ?? null);
        if (result.rateLimited) {
          const waitMs = result.retryAfterMs ?? after.remainingMs;
          setCooldownMs(waitMs);
          if (waitMs > 0) {
            window.setTimeout(() => setCooldownMs(0), waitMs);
          }
        }
        setError(result.error ?? "تعذر تغيير كلمة المرور، حاول مرة أخرى.");
        toast.error(result.error ?? "تعذر تغيير كلمة المرور");
        // OAuth/social accounts have no password yet: offer the email-code
        // setup flow (forgot → verify → reset now upserts the credential).
        if ((result.error ?? "").includes("لا توجد كلمة مرور")) {
          setNeedsSetup(true);
        }
        setIsSaving(false);
        return;
      }
      // Clear the submitted secrets from the DOM first, then rebind the client
      // to the fresh session. `refreshUser` never throws (it returns a boolean
      // and swallows errors internally), so this order is safe.
      recordSuccess("change-password");
      reset();
      await refreshUser();
      setIsSaving(false);
      toast.success("تم تغيير كلمة المرور بنجاح، وتم إنهاء جلساتك الأخرى.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تغيير كلمة المرور، حاول مرة أخرى.";
      recordFailure("change-password");
      setError(message);
      toast.error(message);
      setIsSaving(false);
    }
  }

  /** OAuth accounts: email a setup code, then complete it on /forgot-password. */
  async function handleSendSetupCode() {
    const email = user?.email?.trim();
    if (!email) {
      toast.error("تعذر تحديد بريدك. سجل الخروج والدخول مرة أخرى.");
      return;
    }
    setIsSendingSetup(true);
    const result = await forgotPassword(email);
    setIsSendingSetup(false);
    if (!result.success) {
      toast.error(result.error ?? "تعذر إرسال الكود");
      return;
    }
    setSetupSent(true);
    toast.success("تم إرسال كود التعيين إلى بريدك.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" /> كلمة المرور
        </CardTitle>
        <CardDescription>يفضّل استخدام كلمة مرور لا تستخدمها في أي مكان آخر.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="pe-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LEN}
                className="pe-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={showNew ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {newPassword && <PasswordStrengthMeter password={newPassword} className="pt-1" />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
            <Input
              id="confirm-password"
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={!!confirmPassword && confirmPassword !== newPassword}
            />
            {!!confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-destructive">غير متطابقة مع كلمة المرور الجديدة.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {needsSetup && !setupSent && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                حسابك مسجل عبر Google/Apple ولا توجد كلمة مرور بعد. أرسل كود تعيين إلى بريدك ثم أكمله في صفحة الاستعادة.
              </p>
              <Button type="button" variant="secondary" disabled={isSendingSetup} onClick={handleSendSetupCode}>
                {isSendingSetup && <Loader2 className="w-4 h-4 animate-spin" />}
                إرسال كود تعيين كلمة المرور
              </Button>
            </div>
          )}
          {setupSent && (
            <p className="text-sm text-emerald-600" role="status">
              تم إرسال الكود إلى بريدك. أكمل التعيين من <a href="/forgot-password" className="underline font-bold">صفحة الاستعادة</a>.
            </p>
          )}
          {cooldownMs > 0 && (
            <p className="text-xs text-muted-foreground" role="status">
              تهدئة من الخادم: حاول مرة أخرى بعد {Math.ceil(cooldownMs / 1000)} ثانية.
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSaving || cooldownMs > 0}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            تحديث كلمة المرور
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
