"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";

export type TwoFactorMethod = "authenticator" | "sms" | "email" | "security_key";

export interface TwoFactorSetup {
  method: TwoFactorMethod;
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  email?: string;
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  method?: TwoFactorMethod;
  lastUsedAt?: string;
  isEnforced: boolean;
  verifiedDevices: string[];
}

export interface TwoFactorChallenge {
  challengeId: string;
  method: TwoFactorMethod;
  expiresAt: string;
}

export function use2FA() {
  const queryClient = useQueryClient();
  const [setupStep, setSetupStep] = useState<"idle" | "scan" | "verify" | "backup" | "complete">("idle");
  const [currentSetup, setCurrentSetup] = useState<TwoFactorSetup | null>(null);

  // Fetch 2FA status
  const statusQuery = useQuery({
    queryKey: ["admin", "2fa-status"],
    queryFn: async () => {
      const response = await adminFetch("/admin/security/2fa/status");
      if (!response.ok) throw new Error("Failed to fetch 2FA status");
      const data = await response.json();
      return (data.data || data) as TwoFactorStatus;
    },
  });

  // Initiate 2FA setup
  const initiateSetup = useMutation({
    mutationFn: async (method: TwoFactorMethod) => {
      const response = await adminFetch("/admin/security/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initiate 2FA setup");
      }

      return response.json();
    },
    onSuccess: (data, method) => {
      const setup = data.data || data;
      setCurrentSetup({
        method,
        qrCode: setup.qrCode,
        secret: setup.secret,
        phoneNumber: setup.phoneNumber,
        email: setup.email,
      });
      setSetupStep("scan");
      toast.success("تم إعداد المصادقة الثنائية");
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إعداد 2FA");
    },
  });

  // Verify and activate 2FA
  const verifyAndActivate = useMutation({
    mutationFn: async (code: string) => {
      const response = await adminFetch("/admin/security/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid verification code");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const setup = data.data || data;
      setCurrentSetup((prev) => ({
        ...prev!,
        backupCodes: setup.backupCodes,
      }));
      setSetupStep("backup");
      queryClient.invalidateQueries({ queryKey: ["admin", "2fa-status"] });
      toast.success("تم التحقق بنجاح");
    },
    onError: (error: Error) => {
      toast.error(error.message || "رمز التحقق غير صحيح");
    },
  });

  // Complete setup
  const completeSetup = useCallback(() => {
    setSetupStep("complete");
    setCurrentSetup(null);
  }, []);

  // Disable 2FA
  const disable2FA = useMutation({
    mutationFn: async (code: string) => {
      const response = await adminFetch("/admin/security/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to disable 2FA");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "2fa-status"] });
      toast.success("تم تعطيل المصادقة الثنائية");
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في تعطيل 2FA");
    },
  });

  // Generate new backup codes
  const regenerateBackupCodes = useMutation({
    mutationFn: async (code: string) => {
      const response = await adminFetch("/admin/security/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error("Failed to generate backup codes");
      return response.json();
    },
    onSuccess: (data) => {
      const codes = data.data?.backupCodes || data.backupCodes;
      toast.success("تم إنشاء رموز احتياطية جديدة");
      return codes;
    },
    onError: () => {
      toast.error("فشل في إنشاء الرموز الاحتياطية");
    },
  });

  // Verify 2FA code during login
  const verifyLogin = useMutation({
    mutationFn: async ({ challengeId, code }: { challengeId: string; code: string }) => {
      const response = await adminFetch("/admin/security/2fa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid code");
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast.error(error.message || "رمز التحقق غير صحيح");
    },
  });

  return {
    // State
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    setupStep,
    currentSetup,

    // Setup flow
    initiateSetup: initiateSetup.mutate,
    isInitiating: initiateSetup.isPending,

    verifyAndActivate: verifyAndActivate.mutate,
    isVerifying: verifyAndActivate.isPending,

    completeSetup,

    // Management
    disable2FA: disable2FA.mutate,
    isDisabling: disable2FA.isPending,

    regenerateBackupCodes: regenerateBackupCodes.mutate,
    isRegenerating: regenerateBackupCodes.isPending,

    // Login verification
    verifyLogin: verifyLogin.mutate,
    isVerifyingLogin: verifyLogin.isPending,

    resetSetup: () => {
      setSetupStep("idle");
      setCurrentSetup(null);
    },

    refetch: statusQuery.refetch,
  };
}

// Hook for admin to manage 2FA for other users
export function useAdmin2FAManagement() {
  const queryClient = useQueryClient();

  const enforce2FA = useMutation({
    mutationFn: async ({ userId, enforce }: { userId: string; enforce: boolean }) => {
      const response = await adminFetch(`/admin/users/${userId}/2fa/enforce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enforce }),
      });

      if (!response.ok) throw new Error("Failed to update 2FA enforcement");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث إعدادات 2FA");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("فشل في تحديث الإعدادات");
    },
  });

  const resetUser2FA = useMutation({
    mutationFn: async (userId: string) => {
      const response = await adminFetch(`/admin/users/${userId}/2fa/reset`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to reset 2FA");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إعادة ضبط 2FA للمستخدم");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => {
      toast.error("فشل في إعادة الضبط");
    },
  });

  return {
    enforce2FA: enforce2FA.mutate,
    isEnforcing: enforce2FA.isPending,

    resetUser2FA: resetUser2FA.mutate,
    isResetting: resetUser2FA.isPending,
  };
}
