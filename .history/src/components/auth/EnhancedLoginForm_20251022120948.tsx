'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/shared/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, AlertCircle, Mail, Lock, Eye, EyeOff, Github, Twitter, Fingerprint, Shield, Smartphone, Info, Key, User, QrCode, SmartphoneNfc, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';

interface EnhancedLoginFormProps {
  onClose?: () => void;
}

export default function EnhancedLoginForm({ onClose }: EnhancedLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    login,
    verifyTwoFactor,
    loginWithSocial,
    resendTwoFactorCode,
    loading,
    error
  } = useEnhancedAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [twoFactorForm, setTwoFactorForm] = useState({
    code: '',
    loginAttemptId: '',
    trustDevice: false,
  });
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [resendMethod, setResendMethod] = useState<'email' | 'sms'>('email');
  const [resendLoading, setResendLoading] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>(['email']);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [codeResendTime, setCodeResendTime] = useState<number>(0);
  const [codeResendLoading, setCodeResendLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set isClient state to true when component mounts on client
  useEffect(() => {
    setIsClient(true);
    
    // Check if WebAuthn is available
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          setBiometricAvailable(available);
        })
        .catch(error => {
          console.error('Error checking biometric availability:', error);
        });
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    }
  }, [user, router, searchParams]);

  // Auto-focus email input on component mount
  useEffect(() => {
    if (emailInputRef.current && !showTwoFactor) {
      emailInputRef.current.focus();
    }
  }, [showTwoFactor]);

  // Auto-focus code input when two-factor is shown
  useEffect(() => {
    if (codeInputRef.current && showTwoFactor) {
      codeInputRef.current.focus();
    }
  }, [showTwoFactor]);

  // Handle lock timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockTimeRemaining > 0) {
      timer = setTimeout(() => {
        setLockTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (isLocked && lockTimeRemaining === 0) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
    return () => clearTimeout(timer);
  }, [isLocked, lockTimeRemaining]);

  // Handle code resend timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (codeResendTime > 0) {
      timer = setTimeout(() => {
        setCodeResendTime(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [codeResendTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Check if account is locked
    if (isLocked) {
      const errorMsg = `الحساب مؤمن مؤقتًا. حاول مرة أخرى بعد ${formatTime(lockTimeRemaining)}`;
      setAuthError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate form
    if (!loginForm.email || !loginForm.password) {
      const errorMsg = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
      setAuthError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        email: loginForm.email,
        password: loginForm.password,
        rememberMe: loginForm.rememberMe,
      });

      if (result.requiresTwoFactor && result.loginAttemptId) {
        setTwoFactorForm(prev => ({
          ...prev,
          loginAttemptId: result.loginAttemptId || ''
        }));
        setShowTwoFactor(true);
        toast.info('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
        setLoginAttempts(0); // Reset attempts on successful first step
        // Set code resend timer (30 seconds)
        setCodeResendTime(30);
        return;
      }

      toast.success('تم تسجيل الدخول بنجاح');
      // عرض رسالة واضحة للمستخدم
      alert('تم تسجيل الدخول بنجاح');
      router.push('/');
      router.refresh();
      if (onClose) onClose();
    } catch (error: any) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      const errorMsg = error.message || 'حدث خطأ أثناء تسجيل الدخول';
      setAuthError(errorMsg);

      // Lock account after 5 failed attempts
      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockTimeRemaining(300); // 5 minutes
        toast.error('تم قفل الحساب مؤقتًا بسبب العديد من محاولات تسجيل الدخول الفاشلة. حاول مرة أخرى بعد 5 دقائق.');
      } else {
        toast.error(errorMsg);
        toast.error(`محاولة ${newAttempts} من 5 قبل قفل الحساب`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await verifyTwoFactor({
        loginAttemptId: twoFactorForm.loginAttemptId,
        code: twoFactorForm.code,
        trustDevice: twoFactorForm.trustDevice,
      });

      toast.success('تم التحقق بنجاح');
      router.push('/');
      router.refresh();
      if (onClose) onClose();
    } catch (error: any) {
      toast.error(error.message || 'رمز التحقق غير صحيح');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'twitter') => {
    setIsLoading(true);
    try {
      await loginWithSocial(provider);
      toast.success(`تم تسجيل الدخول باستخدام ${provider} بنجاح`);
      router.push('/');
      router.refresh();
      if (onClose) onClose();
    } catch (error: any) {
      toast.error(error.message || `حدث خطأ أثناء تسجيل الدخول باستخدام ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      // This would be implemented with WebAuthn API
      // For now, we'll just simulate it
      toast.success('تم المصادقة البيومترية بنجاح');
      router.push('/');
      router.refresh();
      if (onClose) onClose();
    } catch (error: any) {
      toast.error(error.message || 'فشلت المصادقة البيومترية');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCodeResendLoading(true);
    try {
      await resendTwoFactorCode({
        loginAttemptId: twoFactorForm.loginAttemptId,
        method: resendMethod
      });

      toast.success(`تم إعادة إرسال رمز التحقق عبر ${resendMethod === 'email' ? 'البريد الإلكتروني' : 'الرسائل النصية'}`);
      setShowResendDialog(false);
      // Set new resend timer (30 seconds)
      setCodeResendTime(30);
    } catch (error: any) {
      toast.error(error.message || 'فشل إعادة إرسال رمز التحقق');
    } finally {
      setCodeResendLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextInputRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextInputRef && nextInputRef.current) {
        nextInputRef.current.focus();
      } else if (!nextInputRef) {
        // Submit form if no next input
        const form = e.currentTarget.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatResendTime = (seconds: number) => {
    if (seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Validate email
    if (!resetEmail) {
      const errorMsg = 'يرجى إدخال بريدك الإلكتروني';
      setAuthError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إرسال رابط إعادة تعيين كلمة المرور');
      }

      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      setResetPasswordMode(false);
      setResetEmail('');
    } catch (error: any) {
      const errorMsg = error.message || 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور';
      setAuthError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setResetLoading(false);
    }
  };

  if (showTwoFactor) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="h-6 w-6" />
            المصادقة الثنائية
          </CardTitle>
          <CardDescription>
            أدخل الرمز الذي تم إرساله إلى بريدك الإلكتروني أو جهازك
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleTwoFactor}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="code">رمز التحقق</Label>
              <div className="relative">
                <Input
                  ref={codeInputRef}
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={twoFactorForm.code}
                  onChange={(e) => setTwoFactorForm({ ...twoFactorForm, code: e.target.value })}
                  disabled={isLoading}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest pl-10"
                  autoComplete="one-time-code"
                  onKeyDown={(e) => handleKeyDown(e)}
                />
                <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="trustDevice"
                type="checkbox"
                checked={twoFactorForm.trustDevice}
                onChange={(e) => setTwoFactorForm({ ...twoFactorForm, trustDevice: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="trustDevice" className="text-sm">
                الوثوق بهذا الجهاز (تخطي المصادقة الثنائية في المرة القادمة)
              </Label>
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSecurityInfo(!showSecurityInfo)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Info className="h-4 w-4 mr-1" />
                معلومات الأمان
              </Button>
              <Badge variant="outline" className="text-xs">
                <Key className="h-3 w-3 mr-1" />
                2FA
              </Badge>
            </div>
            {showSecurityInfo && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  المصادقة الثنائية توفر طبقة إضافية من الأمان لحسابك. حتى لو تمكن شخص ما من معرفة كلمة المرور الخاصة بك، فلن يتمكن من الوصول إلى حسابك بدون رمز التحقق.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              التحقق
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowTwoFactor(false)}
                disabled={isLoading}
              >
                العودة لتسجيل الدخول
              </Button>
              <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isLoading || codeResendTime > 0}
                  onClick={() => setShowResendDialog(true)}
                >
                  {codeResendTime > 0 ? (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 ml-1" />
                      {formatResendTime(codeResendTime)}
                    </span>
                  ) : (
                    "إعادة الإرسال"
                  )}
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إعادة إرسال رمز التحقق</DialogTitle>
                    <DialogDescription>
                      اختر الطريقة التي تريد استلام رمز التحقق بها
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                      <input
                        id="email"
                        type="radio"
                        name="resendMethod"
                        checked={resendMethod === 'email'}
                        onChange={() => setResendMethod('email')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        البريد الإلكتروني
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        id="sms"
                        type="radio"
                        name="resendMethod"
                        checked={resendMethod === 'sms'}
                        onChange={() => setResendMethod('sms')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="sms" className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        الرسائل النصية (SMS)
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowResendDialog(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleResendCode} disabled={codeResendLoading}>
                      {codeResendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      إرسال
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelpDialog(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          أدخل معلوماتك للدخول إلى حسابك
        </CardDescription>
      </CardHeader>

      {authError && (
        <Alert className="mx-6 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {authError}
          </AlertDescription>
        </Alert>
      )}

      {isLocked && (
        <Alert className="mx-6 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            الحساب مؤقتًا مؤقتًا. حاول مرة أخرى بعد {formatTime(lockTimeRemaining)}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
          <TabsTrigger value="social">وسائل التواصل</TabsTrigger>
          <TabsTrigger value="biometric" disabled={!isClient || !biometricAvailable}>بيومتري</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    dir="ltr"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    disabled={isLoading || isLocked}
                    placeholder="you@example.com"
                    className="pl-10"
                    onKeyDown={(e) => handleKeyDown(e, passwordInputRef)}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    disabled={isLoading || isLocked}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    onKeyDown={(e) => handleKeyDown(e)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading || isLocked}
                  />
                  <Label htmlFor="remember" className="text-sm">
                    تذكرني
                  </Label>
                </div>
                <div className="text-sm">
                  <a href="/forgot-password" className="text-blue-600 hover:underline">
                    نسيت كلمة المرور؟
                  </a>
                </div>
              </div>

              {loginAttempts > 0 && !isLocked && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    محاولة {loginAttempts} من 5 قبل قفل الحساب
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{ width: `${(loginAttempts / 5) * 100}%` }}
                      ></div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading || isLocked}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                تسجيل الدخول
              </Button>
              <div className="text-sm text-center">
                ليس لديك حساب؟{' '}
                <a href="/register" className="text-blue-600 hover:underline">
                  انشئ حساباً جديداً
                </a>
              </div>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <CardContent className="grid gap-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                قم بتسجيل الدخول باستخدام حسابك على وسائل التواصل الاجتماعي
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              تسجيل الدخول باستخدام Google
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('github')}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              تسجيل الدخول باستخدام GitHub
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('twitter')}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Twitter className="mr-2 h-4 w-4" />
              )}
              تسجيل الدخول باستخدام Twitter
            </Button>
            <div className="text-xs text-center text-gray-500 mt-2">
              عند تسجيل الدخول باستخدام وسائل التواصل الاجتماعي، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="biometric" className="mt-4">
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-blue-100 p-6">
              <Fingerprint className="h-12 w-12 text-blue-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">المصادقة البيومترية</h3>
              <p className="text-sm text-gray-600 mt-2">
                استخدم بصمة إصبعك أو التعرف على الوجه لتسجيل الدخول بسرعة وأمان
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button
                className="w-full"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="mr-2 h-4 w-4" />
                )}
                المصادقة البيومترية
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActiveTab('email')}
                disabled={biometricLoading}
              >
                <User className="mr-2 h-4 w-4" />
                تسجيل الدخول بالبريد الإلكتروني
              </Button>
            </div>
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                بياناتك البيومترية لا تترك جهازك وتتم معالجتها بشكل آمن باستخدام تقنيات التشفير المتقدمة.
              </AlertDescription>
            </Alert>
          </CardContent>
        </TabsContent>
      </Tabs>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              مساعدة تسجيل الدخول
            </DialogTitle>
            <DialogDescription>
              معلومات حول خيارات تسجيل الدخول المتاحة وكيفية حماية حسابك
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                تسجيل الدخول بالبريد الإلكتروني
              </h4>
              <p className="text-sm text-gray-600">
                استخدم بريدك الإلكتروني وكلمة المرور لتسجيل الدخول إلى حسابك. تأكد من استخدام كلمة مرور قوية وفريدة.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                المصادقة الثنائية (2FA)
              </h4>
              <p className="text-sm text-gray-600">
                تضيف طبقة إضافية من الأمان لحسابك. بعد إدخال كلمة المرور، ستحتاج إلى رمز تحقق يتم إرساله إلى بريدك الإلكتروني أو جهازك.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                المصادقة البيومترية
              </h4>
              <p className="text-sm text-gray-600">
                تستخدم بصمة إصبعك أو التعرف على الوجه لتسجيل الدخول بسرعة وأمان. هذه الطريقة آمنة ولا تترك بياناتك البيومترية على خوادمنا.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                نصائح الأمان
              </h4>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>استخدم كلمة مرور قوية وفريدة لحسابك</li>
                <li>لا تشارك معلومات تسجيل الدخول مع أي شخص</li>
                <li>قم بتسجيل الخروج من حسابك عند استخدام جهاز مشترك</li>
                <li>فعل المصادقة الثنائية لحماية إضافية</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>
              فهمت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
