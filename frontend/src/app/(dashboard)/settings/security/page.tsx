'use client';

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ar } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield, Key, Laptop, Smartphone,
  AlertTriangle, Loader2, LogOut, Link2, Unlink, Chrome, Github
} from 'lucide-react';
import { toast } from 'sonner';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageContainer } from '@/components/ui/page-container';
import apiClient, { ApiError } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import { DeleteAccountDialog, SettingsHeader, SettingsSection, SettingsCard } from '../components';
import { useSessions } from '../_hooks/use-sessions';

interface LinkedAccount {
  provider: string;
  email?: string;
  name?: string;
  avatar?: string;
  linkedAt: string;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError || err instanceof Error) return err.message || fallback;
  return fallback;
}

export default function SecurityPage() {
  const { logout } = useAuth();
  const router = useRouter();

  // Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sessions State — shared with settings/devices/page.tsx via useSessions
  const {
    sessions,
    isLoading: isLoadingSessions,
    revokingId,
    isRevokingAll,
    refresh: refreshSessions,
    revokeSession,
    revokeAll,
  } = useSessions();

  // Social Links State
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  // 2FA status
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FA, setIsLoading2FA] = useState(true);

  // Danger Zone
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all security stats
  const fetchSecurityDetails = useCallback(async () => {
    try {
      // 1. Get Sessions (shared hook — see useSessions)
      await refreshSessions();
    } catch {
      toast.error("فشل تحميل الجلسات النشطة");
    }

    try {
      // 2. Get Linked Accounts
      const socialsData = await apiClient.get<{ accounts?: LinkedAccount[] } | LinkedAccount[]>(apiRoutes.auth.social.accounts);
      const accountsList = Array.isArray(socialsData) ? socialsData : socialsData.accounts || [];
      setLinkedAccounts(accountsList);
    } catch {
      toast.error("فشل تحميل الحسابات المرتبطة");
    }

    try {
      // 3. Get User detail (for 2FA)
      const meData = await apiClient.get<{ user?: { twoFactorEnabled?: boolean } }>(apiRoutes.auth.me);
      setIs2FAEnabled(!!meData.user?.twoFactorEnabled);
    } catch {
      toast.error("فشل تحميل حالة المصادقة الثنائية");
    } finally {
      setIsLoading2FA(false);
    }
  }, [refreshSessions]);

  useEffect(() => {
    fetchSecurityDetails();
  }, [fetchSecurityDetails]);

  // 1. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiClient.post(apiRoutes.auth.changePassword, { oldPassword, newPassword });
      toast.success("تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "حدث خطأ أثناء تغيير كلمة المرور"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 2. Revoke Session (shared with settings/devices/page.tsx via useSessions)
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      toast.success("تم إنهاء الجلسة المحددة بنجاح");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "فشل إنهاء الجلسة"));
    }
  };

  // 3. Revoke All Sessions
  const handleRevokeAllSessions = async () => {
    try {
      await revokeAll();
      toast.success("تم إنهاء جميع الجلسات الأخرى بنجاح");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "فشل إنهاء الجلسات"));
    }
  };

  // 4. Social Linking & Unlinking
  const handleLinkOAuth = (provider: string) => {
    window.location.href = apiRoutes.auth.social.login(provider);
  };

  const handleUnlinkOAuth = async (provider: string) => {
    try {
      await apiClient.post(apiRoutes.auth.social.unlink, { provider });
      toast.success("تم إلغاء ربط الحساب الاجتماعي بنجاح");
      setLinkedAccounts(linkedAccounts.filter(acc => acc.provider !== provider));
    } catch (err: unknown) {
      toast.error(errorMessage(err, "فشل فصل الحساب"));
    }
  };

  // 5. Disable 2FA
  const handleDisable2FA = async () => {
    const passwordConfirm = prompt("يرجى إدخال كلمة المرور لتأكيد إلغاء تفعيل المصادقة الثنائية:");
    if (!passwordConfirm) return;

    try {
      await apiClient.post(apiRoutes.auth.mfa.disable, { password: passwordConfirm });
      toast.success("تم تعطيل المصادقة الثنائية بنجاح");
      setIs2FAEnabled(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "كلمة المرور غير صحيحة"));
    }
  };

  // 6. Delete Account — shared flow with settings/privacy/page.tsx via DeleteAccountDialog
  const handleDeleteAccount = async (password: string) => {
    setIsDeleting(true);
    try {
      await apiClient.delete(apiRoutes.auth.deleteAccount, {
        body: JSON.stringify({ password, confirmation: "DELETE" }),
      });
      toast.success("تم حذف حسابك بنجاح. سنفتقدك!");
      localStorage.clear();
      sessionStorage.clear();
      await logout();
      router.push("/");
    } catch (err: unknown) {
      toast.error(errorMessage(err, "حدث خطأ أثناء حذف الحساب"));
    } finally {
      setIsDeleting(false);
    }
  };

  const isProviderLinked = (provider: string) => {
    return linkedAccounts.some(acc => acc.provider.toLowerCase() === provider.toLowerCase());
  };

  return (
    <PageContainer size="lg" spacing="none" className="space-y-8 pb-10">
      {/* Header */}
      <SettingsHeader
        icon={Shield}
        title="الأمان وحماية الحساب"
        description="قم بإدارة أمان حسابك وتتبع الجلسات النشطة والأجهزة الموثوقة."
      />

      {/* Change Password */}
      <SettingsSection icon={Key} title="تحديث كلمة المرور">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="oldPassword">كلمة المرور الحالية</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "حفظ كلمة المرور"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      {/* Two-Factor Authentication (2FA) */}
      <SettingsSection
        icon={Shield}
        title="المصادقة الثنائية (2FA)"
        description="تأمين الحساب عبر رمز إضافي يتم إنشاؤه عبر تطبيق المصادقة."
      >
        <div className="flex items-center justify-end">
          <div>
            {isLoading2FA ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : is2FAEnabled ? (
              <div className="flex items-center gap-3">
                <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">نشط</span>
                <Button variant="outline" className="text-destructive hover:text-destructive border-destructive/20" onClick={handleDisable2FA}>تعطيل</Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/mfa")}>تفعيل 2FA</Button>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Active Sessions */}
      <SettingsSection icon={Laptop} title="الجلسات النشطة والأجهزة">
        {sessions.length > 1 && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              className="text-xs text-destructive hover:text-destructive"
              onClick={handleRevokeAllSessions}
              disabled={isRevokingAll}
            >
              {isRevokingAll ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5 mr-1" />
              )}
              تسجيل خروج جميع الأجهزة الأخرى
            </Button>
          </div>
        )}
        <div className="space-y-4">
          {isLoadingSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : sessions.length > 0 ? (
            sessions.map(sess => (
              <div key={sess.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {sess.type === "mobile" ? (
                    <Smartphone className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <Laptop className="h-6 w-6 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {sess.browser || "Browser"} ({sess.os || "OS"})
                      </span>
                      {sess.isCurrent && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">الحالي</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                      <span>IP: {sess.ip}</span>
                      {sess.location && <span>الموقع: {sess.location}</span>}
                      <span>
                        النشاط: {sess.isCurrent
                          ? 'نشط الآن'
                          : sess.lastActive
                            ? formatDistanceToNow(sess.lastActive, { addSuffix: true, locale: ar })
                            : 'تاريخ غير معروف'}
                      </span>
                    </div>
                  </div>
                </div>
                {!sess.isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevokeSession(sess.id)}
                    disabled={revokingId === sess.id}
                  >
                    {revokingId === sess.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-muted-foreground">لا توجد جلسات نشطة مسجلة</p>
          )}
        </div>
      </SettingsSection>

      {/* Linked Accounts */}
      <SettingsSection icon={Link2} title="الحسابات المرتبطة (OAuth)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google */}
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
            <div className="flex items-center gap-2.5">
              <Chrome className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-sm font-medium text-foreground">Google Account</div>
                <div className="text-xs text-muted-foreground">
                  {isProviderLinked("google") ? "مرتبط وحسابك آمن" : "غير مرتبط بالمنصة"}
                </div>
              </div>
            </div>
            {isProviderLinked("google") ? (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/10 hover:bg-destructive/5" onClick={() => handleUnlinkOAuth("google")}>
                <Unlink className="h-3.5 w-3.5 mr-1" /> إلغاء الربط
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleLinkOAuth("google")}>
                ربط الحساب
              </Button>
            )}
          </div>

          {/* GitHub */}
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
            <div className="flex items-center gap-2.5">
              <Github className="h-5 w-5 text-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">GitHub Account</div>
                <div className="text-xs text-muted-foreground">
                  {isProviderLinked("github") ? "مرتبط وحسابك آمن" : "غير مرتبط بالمنصة"}
                </div>
              </div>
            </div>
            {isProviderLinked("github") ? (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/10 hover:bg-destructive/5" onClick={() => handleUnlinkOAuth("github")}>
                <Unlink className="h-3.5 w-3.5 mr-1" /> إلغاء الربط
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleLinkOAuth("github")}>
                ربط الحساب
              </Button>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsCard delay={0.5} className="bg-destructive/10 border-destructive/30">
        <div className="p-4 border-b border-destructive/30">
          <h3 className="font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            منطقة الخطر
          </h3>
          <p className="text-xs text-destructive/80 mt-1">إجراءات لا يمكن التراجع عنها</p>
        </div>
        <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h4 className="font-medium text-destructive">حذف الحساب نهائياً</h4>
            <p className="text-xs text-destructive/70 mt-1">
              سيتم حذف حسابك وجميع بياناتك وملفاتك وسجلات التعلم بشكل دائم. هذا الإجراء فوري ولا يمكن التراجع عنه.
            </p>
          </div>
          <DeleteAccountDialog onConfirm={handleDeleteAccount} isDeleting={isDeleting} requirePassword />
        </div>
      </SettingsCard>
    </PageContainer>
  );
}
