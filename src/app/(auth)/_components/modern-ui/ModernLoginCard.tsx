'use client';

/**
 * 🎨 ModernLoginCard - بطاقة تسجيل الدخول العصرية
 * 
 * تصميم احترافي مع:
 * - Glassmorphism
 * - Animations
 * - Social Login
 * - Biometric Support
 */

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialButton } from '@/components/auth/AuthButton';
import { useUnifiedAuth } from '@/contexts/auth-context';

interface ModernLoginCardProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  showSocialLogin?: boolean;
  showBiometric?: boolean;
  defaultEmail?: string;
}

export function ModernLoginCard({
  onSuccess,
  onForgotPassword,
  onRegister,
  showSocialLogin = true,
  showBiometric = true,
  defaultEmail = '',
}: ModernLoginCardProps) {
  const { loginWithCredentials, loginWithSocial, isLoading: authLoading } = useUnifiedAuth();
  
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Forgot Password Popup State
  const [showForgotPasswordPopup, setShowForgotPasswordPopup] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginWithCredentials(email, password, rememberMe);
      
      if (result.requiresTwoFactor) {
        // Handle 2FA - would redirect or show 2FA form
        window.location.href = `/login/2fa?attemptId=${result.loginAttemptId}`;
        return;
      }
      
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في تسجيل الدخول';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'twitter') => {
    try {
      await loginWithSocial(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      setError(message);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('المتصفح لا يدعم المصادقة البيومترية');
      }
      
      const response = await fetch('/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'فشل في المصادقة البيومترية');
      }
      
      // Handle WebAuthn authentication
      // This would be implemented with the actual WebAuthn API
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPasswordPopup = () => {
    setForgotPasswordEmail(email); // Pre-fill with current email if available
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
    setShowForgotPasswordPopup(true);
    onForgotPassword?.(); // Still call the callback if provided
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotPasswordError(null);
    setForgotPasswordLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء إرسال الطلب');
      }

      setForgotPasswordSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      setForgotPasswordError(message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPasswordPopup = () => {
    setShowForgotPasswordPopup(false);
    setForgotPasswordEmail('');
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 shadow-2xl">
        {/* Decorative elements */}
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl" />
        
        <div className="relative z-10 p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto mb-4 relative inline-block"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 blur-lg opacity-50"
              />
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2">
              مرحباً بعودتك! 👋
            </h1>
            <p className="text-sm text-slate-400">
              سجّل دخولك للمتابعة
            </p>
          </motion.div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-slate-300 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="example@email.com"
                  className={cn(
                    'w-full rounded-xl border bg-white/5 px-4 py-3 pl-11',
                    'text-white placeholder:text-slate-500',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2',
                    focusedField === 'email'
                      ? 'border-indigo-500 ring-indigo-500/30 bg-white/10'
                      : 'border-white/10 hover:border-white/20'
                  )}
                  dir="ltr"
                  autoComplete="email"
                  required
                />
                <Mail className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors',
                  focusedField === 'email' ? 'text-indigo-400' : 'text-slate-500'
                )} />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-slate-300 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-xl border bg-white/5 px-4 py-3 pl-11 pr-11',
                    'text-white placeholder:text-slate-500',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2',
                    focusedField === 'password'
                      ? 'border-indigo-500 ring-indigo-500/30 bg-white/10'
                      : 'border-white/10 hover:border-white/20'
                  )}
                  autoComplete="current-password"
                  required
                />
                <Lock className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors',
                  focusedField === 'password' ? 'text-indigo-400' : 'text-slate-500'
                )} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            {/* Remember Me & Forgot Password */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    'w-4 h-4 rounded border transition-colors',
                    rememberMe
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-white/5 border-white/20'
                  )}>
                    {rememberMe && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </motion.svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-400">تذكرني</span>
              </label>
              
              <button
                type="button"
                onClick={openForgotPasswordPopup}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || authLoading}
              className={cn(
                'relative w-full rounded-xl py-3.5 font-semibold',
                'bg-gradient-to-r from-indigo-500 to-purple-600',
                'text-white shadow-lg shadow-indigo-500/30',
                'hover:from-indigo-600 hover:to-purple-700',
                'transition-all duration-200',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'overflow-hidden'
              )}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading || authLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    تسجيل الدخول
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Biometric Login */}
          {showBiometric && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4"
            >
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className={cn(
                  'w-full rounded-xl py-3 font-medium',
                  'bg-white/5 border border-white/10',
                  'text-slate-300 hover:text-white hover:bg-white/10',
                  'transition-all duration-200',
                  'flex items-center justify-center gap-2'
                )}
              >
                <Fingerprint className="h-5 w-5" />
                تسجيل الدخول بالبصمة
              </button>
            </motion.div>
          )}

          {/* Divider */}
          {showSocialLogin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative my-8"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900/50 text-slate-400">
                  أو تسجيل الدخول باستخدام
                </span>
              </div>
            </motion.div>
          )}

          {/* Social Login Buttons */}
          {showSocialLogin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="grid grid-cols-3 gap-3"
            >
              <SocialButton
                              provider="google"
                              onClick={() => handleSocialLogin('google')}
                              fullWidth children={undefined}              />
              <SocialButton
                              provider="github"
                              onClick={() => handleSocialLogin('github')}
                              fullWidth children={undefined}              />
              <SocialButton
                              provider="twitter"
                              onClick={() => handleSocialLogin('twitter')}
                              fullWidth children={undefined}              />
            </motion.div>
          )}

          {/* Register Link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center text-sm text-slate-400"
          >
            ليس لديك حساب؟{' '}
            <Link
              href="/register"
              onClick={onRegister}
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              أنشئ حساباً جديداً
            </Link>
          </motion.p>
        </div>
      </div>

      {/* Forgot Password Popup */}
      <AnimatePresence>
        {showForgotPasswordPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeForgotPasswordPopup}
          >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Popup Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl" />
              
              {/* Close Button */}
              <button
                onClick={closeForgotPasswordPopup}
                className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all z-10"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="relative z-10 p-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="mx-auto mb-4 relative inline-block"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                      <Lock className="h-7 w-7 text-white" />
                    </div>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 blur-lg opacity-50"
                    />
                  </motion.div>

                  <h2 className="text-xl font-bold text-white mb-2">
                    نسيت كلمة المرور؟
                  </h2>
                  <p className="text-sm text-slate-400">
                    أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
                  </p>
                </div>

                {/* Success Message */}
                <AnimatePresence mode="wait">
                  {forgotPasswordSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center py-8"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
                      >
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        تم الإرسال بنجاح! ✉️
                      </h3>
                      <p className="text-sm text-slate-400 mb-6">
                        تحقق من بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور
                      </p>
                      <button
                        onClick={closeForgotPasswordPopup}
                        className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                      >
                        إغلاق
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleForgotPassword}
                      className="space-y-5"
                    >
                      {/* Error Alert */}
                      <AnimatePresence>
                        {forgotPasswordError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3"
                          >
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{forgotPasswordError}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Email Field */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          البريد الإلكتروني
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            placeholder="example@email.com"
                            className={cn(
                              'w-full rounded-xl border bg-white/5 px-4 py-3 pl-11',
                              'text-white placeholder:text-slate-500',
                              'transition-all duration-200',
                              'focus:outline-none focus:ring-2',
                              'border-white/10 hover:border-white/20 focus:border-indigo-500 focus:ring-indigo-500/30 focus:bg-white/10'
                            )}
                            dir="ltr"
                            autoComplete="email"
                            required
                            autoFocus
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className={cn(
                          'relative w-full rounded-xl py-3.5 font-semibold',
                          'bg-gradient-to-r from-amber-500 to-orange-600',
                          'text-white shadow-lg shadow-amber-500/30',
                          'hover:from-amber-600 hover:to-orange-700',
                          'transition-all duration-200',
                          'disabled:opacity-60 disabled:cursor-not-allowed',
                          'overflow-hidden'
                        )}
                      >
                        {/* Shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        />
                        
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {forgotPasswordLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              جاري الإرسال...
                            </>
                          ) : (
                            <>
                              <Mail className="h-5 w-5" />
                              إرسال رابط إعادة التعيين
                            </>
                          )}
                        </span>
                      </motion.button>

                      {/* Back to Login */}
                      <button
                        type="button"
                        onClick={closeForgotPasswordPopup}
                        className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
                      >
                        العودة لتسجيل الدخول
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ModernLoginCard;
