"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import MfaSetupInitStep from "@/components/auth/MfaSetupInitStep";
import MfaSetupVerifyStep from "@/components/auth/MfaSetupVerifyStep";
import MfaSetupBackupStep from "@/components/auth/MfaSetupBackupStep";

interface MfaSetupResponse {
  secret: string;
  qrCodeUrl?: string;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

/**
 * MfaPage — orchestrates the three-step 2FA enrollment flow (init, verify,
 * backup codes). Presentation lives in `MfaSetupInitStep` / `MfaSetupVerifyStep`
 * / `MfaSetupBackupStep`.
 */
export default function MfaPage() {
  const [step, setStep] = useState<"init" | "verify" | "backup">("init");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responseData = await apiClient.post<MfaSetupResponse>(apiRoutes.auth.mfa.setup, {
        method: "totp",
      });
      setSecret(responseData.secret);
      setQrCodeUrl(responseData.qrCodeUrl || "");
      setStep("verify");
    } catch (err: unknown) {
      setError(toErrorMessage(err, "فشل تهيئة المصادقة الثنائية"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError("يرجى إدخال رمز التحقق");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const responseData = await apiClient.post<{ backupCodes?: string[] }>(
        apiRoutes.auth.mfa.enable,
        { code }
      );
      setBackupCodes(responseData.backupCodes || []);
      setSuccess("تم تفعيل المصادقة الثنائية بنجاح!");
      setStep("backup");
    } catch (err: unknown) {
      setError(toErrorMessage(err, "فشل التحقق"));
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "tolo-mfa-backup-codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="container relative min-h-[80vh] flex items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[460px] p-4">
        <Card className="w-full border-none shadow-2xl bg-white dark:bg-slate-900">
          {step === "init" && (
            <MfaSetupInitStep error={error} isLoading={isLoading} onStart={startSetup} />
          )}

          {step === "verify" && (
            <MfaSetupVerifyStep
              secret={secret}
              qrCodeUrl={qrCodeUrl}
              code={code}
              onCodeChange={setCode}
              error={error}
              isLoading={isLoading}
              onSubmit={handleVerify}
              onCancel={() => setStep("init")}
            />
          )}

          {step === "backup" && (
            <MfaSetupBackupStep
              success={success}
              backupCodes={backupCodes}
              onDownload={downloadBackupCodes}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
