'use client';

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ar } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield, Key, Laptop, Smartphone, HelpCircle, History,
  AlertTriangle, CheckCircle2, Loader2, LogOut, Link2, Unlink, Chrome, Github
} from 'lucide-react';
import { toast } from 'sonner';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  country?: string;
  isActive: boolean;
  rememberMe: boolean;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

interface LinkedAccount {
  provider: string;
  email?: string;
  name?: string;
  avatar?: string;
  linkedAt: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Social Links State
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoadingSocials, setIsLoadingSocials] = useState(true);

  // 2FA status
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FA, setIsLoading2FA] = useState(true);

  // Danger Zone Password
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all security stats
  const fetchSecurityDetails = useCallback(async () => {
    try {
      // 1. Get Sessions
      const resSessions = await fetch('/api/auth/sessions');
      if (resSessions.ok) {
        const data = await resSessions.json();
        const responseData = data.data || data;
        setSessions(Array.isArray(responseData) ? responseData : responseData.items || []);
      }

      // 2. Get Linked Accounts
      const resSocials = await fetch('/api/auth/social/accounts');
      if (resSocials.ok) {
        const data = await resSocials.json();
        const responseData = data.data || data;
        setLinkedAccounts(responseData.accounts || responseData || []);
      }

      // 3. Get User detail (for 2FA)
      const resMe = await fetch('/api/auth/me');
      if (resMe.ok) {
        const data = await resMe.json();
        const responseData = data.data || data;
        setIs2FAEnabled(!!responseData.user?.twoFactorEnabled);
      }
    } catch (err: any) {
      toast.error("فشل تحميل بعض الإعدادات الأمنية");
    } finally {
      setIsLoadingSessions(false);
      setIsLoadingSocials(false);
      setIsLoading2FA(false);
    }
  }, []);

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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير كلمة المرور");

      toast.success("تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // 2. Revoke Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل إنهاء الجلسة");
      toast.success("تم إنهاء الجلسة المحددة بنجاح");
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 3. Revoke All Sessions
  const handleRevokeAllSessions = async () => {
    try {
      const res = await fetch('/api/auth/sessions', { method: "DELETE" });
      if (!res.ok) throw new Error("فشل إنهاء الجلسات");
      toast.success("تم إنهاء جميع الجلسات الأخرى بنجاح");
      // Keep only current session
      setSessions(sessions.filter(s => s.isCurrent));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 4. Social Linking & Unlinking
  const handleLinkOAuth = (provider: string) => {
    window.location.href = `/api/auth/social/${provider}`;
  };

  const handleUnlinkOAuth = async (provider: string) => {
    try {
      const res = await fetch('/api/auth/social/unlink', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل فصل الحساب");

      toast.success("تم إلغاء ربط الحساب الاجتماعي بنجاح");
      setLinkedAccounts(linkedAccounts.filter(acc => acc.provider !== provider));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 5. Disable 2FA
  const handleDisable2FA = async () => {
    const passwordConfirm = prompt("يرجى إدخال كلمة المرور لتأكيد إلغاء تفعيل المصادقة الثنائية:");
    if (!passwordConfirm) return;

    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "كلمة المرور غير صحيحة");

      toast.success("تم تعطيل المصادقة الثنائية بنجاح");
      setIs2FAEnabled(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 6. Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error("يرجى إدخال كلمة المرور للتأكيد");
      return;
    }

    if (!confirm("هل أنت متأكد تماماً من رغبتك في حذف الحساب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/auth/account', {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, reason: deleteReason, confirmation: "DELETE" })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حذف الحساب");

      toast.success("تم حذف حسابك بنجاح. سنفتقدك!");
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حذف الحساب");
    } finally {
      setIsDeleting(false);
    }
  };

  const isProviderLinked = (provider: string) => {
    return linkedAccounts.some(acc => acc.provider.toLowerCase() === provider.toLowerCase());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 px-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="h-7 w-7 text-indigo-400" />
          الأمان وحماية الحساب
        </h1>
        <p className="text-sm text-slate-400 mt-1">قم بإدارة أمان حسابك وتتبع الجلسات النشطة والأجهزة الموثوقة.</p>
      </div>

      {/* Change Password */}
      <section className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 backdrop-blur-sm">
        <h3 className="font-semibold text-white flex items-center gap-2 text-lg mb-4">
          <Key className="h-5 w-5 text-indigo-400" />
          تحديث كلمة المرور
        </h3>
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
                className="bg-white/5 dark:bg-slate-950/50 border-slate-800"
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
                className="bg-white/5 dark:bg-slate-950/50 border-slate-800"
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
                className="bg-white/5 dark:bg-slate-950/50 border-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "حفظ كلمة المرور"}
            </Button>
          </div>
        </form>
      </section>

      {/* Two-Factor Authentication (2FA) */}
      <section className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-indigo-400" />
              المصادقة الثنائية (2FA)
            </h3>
            <p className="text-sm text-slate-400">تأمين الحساب عبر رمز إضافي يتم إنشاؤه عبر تطبيق المصادقة.</p>
          </div>
          <div>
            {isLoading2FA ? (
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
            ) : is2FAEnabled ? (
              <div className="flex items-center gap-3">
                <span className="text-xs bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-full font-medium">نشط</span>
                <Button variant="outline" className="text-red-500 hover:text-red-600 border-red-500/20" onClick={handleDisable2FA}>تعطيل</Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/mfa")}>تفعيل 2FA</Button>
            )}
          </div>
        </div>
      </section>

      {/* Active Sessions */}
      <section className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
            <Laptop className="h-5 w-5 text-indigo-400" />
            الجلسات النشطة والأجهزة
          </h3>
          {sessions.length > 1 && (
            <Button variant="ghost" className="text-xs text-red-400 hover:text-red-300" onClick={handleRevokeAllSessions}>
              <LogOut className="h-3.5 w-3.5 mr-1" /> تسجيل خروج جميع الأجهزة الأخرى
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {isLoadingSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
            </div>
          ) : sessions.length > 0 ? (
            sessions.map(sess => (
              <div key={sess.id} className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {sess.deviceType === "mobile" ? (
                    <Smartphone className="h-6 w-6 text-slate-400" />
                  ) : (
                    <Laptop className="h-6 w-6 text-slate-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">
                        {sess.browser || "Browser"} ({sess.os || "OS"})
                      </span>
                      {sess.isCurrent && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">الحالي</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                      <span>IP: {sess.ip}</span>
                      {sess.country && <span>البلد: {sess.country}</span>}
                      <span>النشاط: {formatDistanceToNow(new Date(sess.lastActive), { addSuffix: true, locale: ar })}</span>
                    </div>
                  </div>
                </div>
                {!sess.isCurrent && (
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400" onClick={() => handleRevokeSession(sess.id)}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-500">لا توجد جلسات نشطة مسجلة</p>
          )}
        </div>
      </section>

      {/* Linked Accounts */}
      <section className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 backdrop-blur-sm">
        <h3 className="font-semibold text-white flex items-center gap-2 text-lg mb-4">
          <Link2 className="h-5 w-5 text-indigo-400" />
          الحسابات المرتبطة (OAuth)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google */}
          <div className="flex items-center justify-between p-3 bg-white/5 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Chrome className="h-5 w-5 text-red-400" />
              <div>
                <div className="text-sm font-medium text-white">Google Account</div>
                <div className="text-xs text-slate-500">
                  {isProviderLinked("google") ? "مرتبط وحسابك آمن" : "غير مرتبط بالمنصة"}
                </div>
              </div>
            </div>
            {isProviderLinked("google") ? (
              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-500/10 hover:bg-red-500/5" onClick={() => handleUnlinkOAuth("google")}>
                <Unlink className="h-3.5 w-3.5 mr-1" /> إلغاء الربط
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleLinkOAuth("google")}>
                ربط الحساب
              </Button>
            )}
          </div>

          {/* GitHub */}
          <div className="flex items-center justify-between p-3 bg-white/5 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Github className="h-5 w-5 text-slate-200" />
              <div>
                <div className="text-sm font-medium text-white">GitHub Account</div>
                <div className="text-xs text-slate-500">
                  {isProviderLinked("github") ? "مرتبط وحسابك آمن" : "غير مرتبط بالمنصة"}
                </div>
              </div>
            </div>
            {isProviderLinked("github") ? (
              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-500/10 hover:bg-red-500/5" onClick={() => handleUnlinkOAuth("github")}>
                <Unlink className="h-3.5 w-3.5 mr-1" /> إلغاء الربط
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleLinkOAuth("github")}>
                ربط الحساب
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl bg-red-500/5 border border-red-500/20 overflow-hidden">
        <div className="p-4 border-b border-red-500/20 bg-red-500/10">
          <h3 className="font-semibold text-red-400 flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            منطقة الخطر
          </h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <h4 className="font-medium text-white">حذف الحساب نهائياً</h4>
              <p className="text-sm text-slate-400 mt-1">
                سيتم حذف حسابك وجميع بياناتك وملفاتك وسجلات التعلم بشكل دائم. هذا الإجراء فوري ولا يمكن التراجع عنه.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="grid gap-1.5">
                <Label htmlFor="deletePassword">كلمة المرور لتأكيد الحذف</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  required
                  disabled={isDeleting}
                  className="bg-white/5 border-red-500/20 focus-visible:ring-red-500"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="deleteReason">سبب المغادرة (اختياري)</Label>
                <Input
                  id="deleteReason"
                  type="text"
                  placeholder="لماذا ترغب في المغادرة؟"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  disabled={isDeleting}
                  className="bg-white/5 border-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="destructive" disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "حذف حسابي بشكل دائم"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}