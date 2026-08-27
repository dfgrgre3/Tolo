"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { getPasswordStrength } from "./profile.constants";
import { useAuthContext } from "@/contexts/auth-context";

const MIN_PASSWORD_LEN = 8;

/**
 * Security 6.4 — change password. Never logs or persists the values.
 * The backend clears session cookies on success to force re-login
 * (`ChangePassword` handler in backend/internal/infrastructure/api/handlers/
 * protected/auth_handler_password.go), so this redirects to /login instead
 * of just toasting — staying on a page whose session was just invalidated
 * would surface confusing 401s on the very next request.
 */
export default function ChangePasswordCard() {
  const { logout } = useAuthContext();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const strength = getPasswordStrength(newPassword);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LEN) {
      setError(`كلمة المرور الجديدة يجب ألا تقل عن ${MIN_PASSWORD_LEN} أحرف.`);
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
    setIsSaving(true);
    try {
      // Field name is `oldPassword`, not `currentPassword` — matches the
      // backend's `ChangePasswordRequest{OldPassword, NewPassword}` exactly.
      await apiClient.post(apiRoutes.auth.changePassword, {
        oldPassword: currentPassword,
        newPassword,
      });
      reset();
      toast.success("تم تغيير كلمة المرور. يرجى تسجيل الدخول مرة أخرى.");
      await logout();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر تغيير كلمة المرور، حاول مرة أخرى.";
      setError(message);
      toast.error(message);
      setIsSaving(false);
    }
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

            {newPassword && (
              <div
                className="flex items-center gap-2 pt-1"
                role="status"
                aria-label={`قوة كلمة المرور: ${strength.label}`}
              >
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        strength.score >= i ? strength.className : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{strength.label}</span>
              </div>
            )}
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
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            تحديث كلمة المرور
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
