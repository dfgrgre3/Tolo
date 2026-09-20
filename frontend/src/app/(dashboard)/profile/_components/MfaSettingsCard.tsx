"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/api-client";
import {
  disableMfa,
  enableMfa,
  fetchMfaRecoveryStatus,
  regenerateMfaRecoveryCodes,
  setupMfaTotp,
} from "@/features/auth/api";
import MfaSetupVerifyStep from "@/components/auth/MfaSetupVerifyStep";
import MfaSetupBackupStep from "@/components/auth/MfaSetupBackupStep";
import { useProfileData } from "./useProfileData";

interface MfaSetupResponse {
  secret: string;
  qrCodeUrl?: string;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

/**
 * Security 6.4 companion — 2FA enrollment. Reuses the same setup steps as the
 * login-time MFA enrollment page (`(auth)/mfa`) instead of duplicating the
 * TOTP wizard; only the disable action is new here.
 *
 * Current status comes from `GET /api/users/profile`'s `mfaEnabled` field —
 * the only place that's exposed (`/auth/me` doesn't carry it). Read through
 * the shared `useProfileData` store rather than a private request.
 */
export default function MfaSettingsCard() {
  const { refreshUser } = useAuthContext();
  const { profile, isLoading: isStatusLoading, refetch: refetchProfile } = useProfileData();
  const [step, setStep] = useState<"idle" | "verify" | "backup" | "disable">("idle");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Local override set by server-confirmed enable/disable actions so the UI
  // reacts instantly; the shared profile store catches up via `refetchProfile`.
  const [enabledOverride, setEnabledOverride] = useState<boolean | null>(null);
  const [recoveryRemaining, setRecoveryRemaining] = useState<number | null>(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const isEnabled = enabledOverride ?? Boolean(profile?.mfaEnabled);

  useEffect(() => {
    if (!isEnabled) return;
    fetchMfaRecoveryStatus<{ remaining: number }>()
      .then((data) => setRecoveryRemaining(data.remaining))
      .catch(() => setRecoveryRemaining(null));
  }, [isEnabled]);

  async function startSetup() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await setupMfaTotp<MfaSetupResponse>();
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl || "");
      setStep("verify");
    } catch (err) {
      setError(toErrorMessage(err, "فشل تهيئة المصادقة الثنائية"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code) {
      setError("يرجى إدخال رمز التحقق");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await enableMfa<{ backupCodes?: string[] }>(code);
      setBackupCodes(data.backupCodes || []);
      setSuccess("تم تفعيل المصادقة الثنائية بنجاح!");
      setEnabledOverride(true);
      setStep("backup");
      // Propagate the new 2FA state to the rest of the app.
      await Promise.all([refreshUser(), refetchProfile()]);
    } catch (err) {
      setError(toErrorMessage(err, "فشل التحقق"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!disablePassword || !disableCode) {
      setError("يرجى إدخال كلمة المرور ورمز التحقق");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Backend requires password re-auth + live TOTP/backup code.
      await disableMfa(disablePassword, disableCode);
      setEnabledOverride(false);
      setDisableCode("");
      setDisablePassword("");
      setStep("idle");
      setSecret("");
      toast.success("تم إيقاف المصادقة الثنائية");
      // Propagate the new 2FA state to the rest of the app.
      await Promise.all([refreshUser(), refetchProfile()]);
    } catch (err) {
      const message = toErrorMessage(err, "فشل إيقاف المصادقة الثنائية");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function downloadBackupCodes() {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mfa-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function regenerateRecoveryCodes() {
    setIsLoading(true);
    try {
      const data = await regenerateMfaRecoveryCodes<{ backupCodes?: string[] }>(
        recoveryPassword,
        recoveryCode,
      );
      setBackupCodes(data.backupCodes || []);
      setRecoveryRemaining(data.backupCodes?.length ?? null);
      setRecoveryPassword(""); setRecoveryCode(""); setShowRecoveryForm(false); setStep("backup");
      toast.success("تم تجديد أكواد الاسترداد — احفظها الآن");
    } catch (err) {
      setError(toErrorMessage(err, "تعذر تجديد أكواد الاسترداد"));
    } finally { setIsLoading(false); }
  }

  if (step === "verify") {
    return (
      <Card>
        <MfaSetupVerifyStep
          secret={secret}
          qrCodeUrl={qrCodeUrl}
          code={code}
          onCodeChange={setCode}
          error={error}
          isLoading={isLoading}
          onSubmit={handleVerify}
          onCancel={() => { setSecret(""); setQrCodeUrl(""); setCode(""); setStep("idle"); }}
        />
      </Card>
    );
  }

  if (step === "backup") {
    return (
      <Card>
        <MfaSetupBackupStep success={success} backupCodes={backupCodes} onDownload={downloadBackupCodes} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> المصادقة الثنائية (2FA)
        </CardTitle>
        <CardDescription>طبقة حماية إضافية عبر تطبيق مصادقة على هاتفك.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isStatusLoading ? (
          <Skeleton className="h-10 w-40" />
        ) : step === "disable" ? (
          <form onSubmit={handleDisable} className="space-y-3">
            <Label htmlFor="disable-password">كلمة المرور الحالية</Label>
            <Input
              id="disable-password"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              required
            />
            <Label htmlFor="disable-code">أدخل رمز التطبيق (أو رمز احتياطي) لتأكيد الإيقاف</Label>
            <Input
              id="disable-code"
              dir="ltr"
              inputMode="numeric"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              maxLength={10}
              required
            />
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setStep("idle")}>إلغاء</Button>
              <Button type="submit" variant="destructive" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد الإيقاف
              </Button>
            </div>
          </form>
        ) : (
          <>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {isEnabled && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">أكواد الاسترداد المتبقية: {recoveryRemaining ?? "—"}</p>
                {!showRecoveryForm ? <Button variant="outline" onClick={() => setShowRecoveryForm(true)}>تجديد أكواد الاسترداد</Button> : (
                  <>
                    <Input type="password" placeholder="كلمة المرور الحالية" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} />
                    <Input dir="ltr" inputMode="numeric" maxLength={6} placeholder="رمز تطبيق المصادقة" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))} />
                    <Button onClick={regenerateRecoveryCodes} disabled={isLoading || !recoveryPassword || recoveryCode.length !== 6}>تأكيد التجديد</Button>
                  </>
                )}
              </div>
            )}
            {isEnabled ? (
              <Button variant="destructive" onClick={() => setStep("disable")}>إيقاف المصادقة الثنائية</Button>
            ) : (
              <Button onClick={startSetup} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                تفعيل المصادقة الثنائية
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
