'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from "@/shared/badge";
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Key, Smartphone, Mail, Lock, AlertTriangle, CheckCircle, History, Globe, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/UserProvider';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(user.twoFactorEnabled || false);
      fetchSecurityData();
      setIsLoading(false);
    }
  }, [user]);

  const fetchSecurityData = async () => {
    try {
      // Fetch login history
      const historyResponse = await fetch('/api/auth/login-history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setLoginHistory(historyData.history || []);
      }

      // Fetch active sessions
      const sessionsResponse = await fetch('/api/auth/sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setActiveSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    }
  };

  const handleToggleTwoFactor = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/two-factor/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          enable: enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update two-factor authentication');
      }

      setTwoFactorEnabled(enabled);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update two-factor authentication');
      // Revert the switch if the request failed
      setTwoFactorEnabled(!enabled);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: password,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تغيير كلمة المرور');
      }

      toast.success('تم تغيير كلمة المرور بنجاح');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/auth/terminate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنهاء الجلسة');
      }

      toast.success('تم إنهاء الجلسة بنجاح');
      // Refresh sessions list
      fetchSecurityData();
    } catch (error: any) {
      toast.error(error.message || 'فشل إنهاء الجلسة');
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      const response = await fetch('/api/auth/terminate-all-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنهاء جميع الجلسات');
      }

      toast.success('تم إنهاء جميع الجلسات بنجاح');
      // Refresh sessions list
      fetchSecurityData();
    } catch (error: any) {
      toast.error(error.message || 'فشل إنهاء جميع الجلسات');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل إعدادات الأمان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            إعدادات الأمان
          </h2>
          <p className="text-muted-foreground mt-1">
            إدارة إعدادات الأمان الخاصة بحسابك وحماية بياناتك
          </p>
        </div>
        <div className="flex items-center gap-2">
          {twoFactorEnabled ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              <CheckCircle className="h-3 w-3 ml-1" />
              الحساب محمي
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
              <AlertTriangle className="h-3 w-3 ml-1" />
              الحماية محدودة
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="security">الحماية</TabsTrigger>
          <TabsTrigger value="password">كلمة المرور</TabsTrigger>
          <TabsTrigger value="sessions">الجلسات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                التحقق بخطوتين
              </CardTitle>
              <CardDescription>
                أضف طبقة أمان إضافية إلى حسابك عند تسجيل الدخول
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">التحقق بخطوتين</Label>
                  <p className="text-sm text-muted-foreground">
                    سيتم إرسال رمز إلى بريدك الإلكتروني عند تسجيل الدخول
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleToggleTwoFactor}
                  disabled={isLoading}
                />
              </div>

              {twoFactorEnabled ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">التحقق بخطوتين مفعل</AlertTitle>
                  <AlertDescription className="text-green-700">
                    حسابك محمي الآن بطبقة أمان إضافية. عند تسجيل الدخول من جهاز جديد، سيتم إرسال رمز تأكيد إلى بريدك الإلكتروني.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-800">نوصي بتفعيل التحقق بخطوتين</AlertTitle>
                  <AlertDescription className="text-orange-700">
                    حماية حسابك مهمة جداً. قم بتفعيل التحقق بخطوتين لإضافة طبقة أمان إضافية.
                  </AlertDescription>
                </Alert>
              )}

              {twoFactorEnabled && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium">كيف يعمل التحقق بخطوتين:</h4>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>عند تسجيل الدخول، ستتم مطالبتك بإدخال كلمة المرور الخاصة بك</li>
                    <li>بعد إدخال كلمة المرور الصحيحة، سيتم إرسال رمز إلى بريدك الإلكتروني</li>
                    <li>أدخل الرمز لإكمال تسجيل الدخول</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                تغيير كلمة المرور
              </CardTitle>
              <CardDescription>
                قم بتغيير كلمة المرور الخاصة بك بانتظام للحفاظ على أمان حسابك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                  <p className="text-xs text-muted-foreground">
                    يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على مزيج من الأحرف والأرقام والرموز
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isChangingPassword}
                  className="w-full"
                >
                  {isChangingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                أجهزة تسجيل الدخول النشطة
              </CardTitle>
              <CardDescription>
                إدارة الجلسات النشطة على أجهزتك المختلفة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  الجلسات النشطة: {activeSessions.length}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTerminateAllSessions}
                  disabled={activeSessions.length <= 1}
                >
                  تسجيل الخروج من جميع الأجهزة
                </Button>
              </div>
              
              <div className="space-y-4">
                {activeSessions.map((session, index) => (
                  <div key={session.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-full">
                        {session.deviceType === 'mobile' ? (
                          <Smartphone className="h-5 w-5" />
                        ) : (
                          <Monitor className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.current ? 'هذا الجهاز' : session.deviceName || `جهاز ${index + 1}`}
                          {session.current && (
                            <Badge variant="outline" className="mr-2 text-xs">الحالي</Badge>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{session.browser || 'متصفح غير معروف'}</span>
                          <span>•</span>
                          <span>{session.os || 'نظام تشغيل غير معروف'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          آخر نشاط: {session.lastActive || 'غير متوفر'}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleTerminateSession(session.id)}
                      >
                        تسجيل الخروج
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                سجل تسجيل الدخول
              </CardTitle>
              <CardDescription>
                عرض سجل نشاط تسجيل الدخول الأخير
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loginHistory.map((log, index) => (
                  <div key={log.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-full">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{log.location || 'موقع غير معروف'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{log.ip || 'IP غير معروف'}</span>
                          <span>•</span>
                          <span>{log.device || 'جهاز غير معروف'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.timestamp || 'تاريخ غير معروف'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Badge variant={log.success ? 'default' : 'destructive'}>
                        {log.success ? 'نجح' : 'فشل'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}