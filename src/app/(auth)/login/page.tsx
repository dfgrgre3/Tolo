'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  sanitizeRedirectPath,
} from '@/lib/auth/navigation';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function buildRegisterUrl(redirectPath: string): string {
  if (!redirectPath || redirectPath === DEFAULT_AUTHENTICATED_ROUTE) {
    return '/register';
  }

  const query = new URLSearchParams({ redirect: redirectPath }).toString();
  return `/register?${query}`;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE),
    [searchParams]
  );

  const registerUrl = useMemo(() => buildRegisterUrl(redirectUrl), [redirectUrl]);

  const redirectAfterLogin = useCallback((target: string) => {
    router.replace(target);
    router.refresh();

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.assign(target);
        }
      }, 450);
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      redirectAfterLogin(redirectUrl);
    }
  }, [isAuthLoading, isAuthenticated, redirectAfterLogin, redirectUrl]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isAuthLoading || isAuthenticated) {
      return;
    }

    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      const result = await login(
        data.email.trim().toLowerCase(),
        data.password,
        data.rememberMe ?? false
      );

      if (result.success) {
        redirectAfterLogin(redirectUrl);
        return;
      }

      setErrorStatus(result.error || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="py-16 text-center text-gray-300">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm">Checking your session...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-white">Welcome Back</h2>
        <p className="text-sm text-gray-400">Sign in to continue to your dashboard</p>
      </div>

      {errorStatus && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorStatus}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="ml-1 text-sm font-medium text-gray-300">
            Email Address
          </label>
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-gray-500 transition-colors group-focus-within:text-blue-500" />
            </div>
            <input
              id="login-email"
              {...register('email')}
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/50 py-3 pl-11 pr-4 text-white outline-none transition-all placeholder:text-gray-600 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>
          {errors.email && <p className="ml-1 mt-1 text-xs font-medium text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="ml-1 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-gray-300">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300">
              Forgot password?
            </Link>
          </div>
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-5 w-5 text-gray-500 transition-colors group-focus-within:text-blue-500" />
            </div>
            <input
              id="login-password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-800 bg-gray-950/50 py-3 pl-11 pr-12 text-white outline-none transition-all placeholder:text-gray-600 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="********"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-gray-300"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="ml-1 mt-1 text-xs font-medium text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="ml-1 flex items-center">
          <input
            {...register('rememberMe')}
            type="checkbox"
            id="rememberMe"
            className="h-4 w-4 cursor-pointer rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 focus:ring-offset-gray-950"
          />
          <label
            htmlFor="rememberMe"
            className="ml-2 block cursor-pointer select-none text-sm text-gray-400 transition-colors hover:text-gray-300"
          >
            Remember me for 7 days
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          id="login-submit-btn"
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Authenticating...
            </>
          ) : (
            <>
              Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href={registerUrl} className="font-semibold text-white transition-colors hover:text-blue-400">
            Create account
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
