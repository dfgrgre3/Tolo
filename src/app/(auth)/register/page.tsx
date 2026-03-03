'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain one uppercase letter')
    .regex(/[a-z]/, 'Must contain one lowercase letter')
    .regex(/[0-9]/, 'Must contain one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Password requirement checks for visual feedback
const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(passwordValue);
  const strengthLabel = strength < 3 ? 'Weak' : strength < 5 ? 'Good' : 'Strong';
  const strengthColor = strength < 3 ? 'text-red-500' : strength < 5 ? 'text-yellow-500' : 'text-green-500';

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setStatus(null);

    const result = await registerUser(data.email, data.password, data.username);

    if (result.success) {
      setStatus({
        type: 'success',
        message: result.message || 'Account created successfully! Check your email to verify.',
      });
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setStatus({
        type: 'error',
        message: result.error || 'Registration failed',
      });
    }

    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Create an Account</h2>
        <p className="text-gray-400 text-sm">Join the platform to access premium education tools.</p>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
              status.type === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium leading-relaxed">{status.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <label htmlFor="register-username" className="text-sm font-medium text-gray-300 ml-1">Username</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="register-username"
              {...register('username')}
              type="text"
              autoComplete="username"
              disabled={isLoading || status?.type === 'success'}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-950/50 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-600 disabled:opacity-50 text-sm"
              placeholder="johndoe123"
            />
          </div>
          {errors.username && <p className="text-xs text-red-400 ml-1 font-medium">{errors.username.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="register-email" className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="register-email"
              {...register('email')}
              type="email"
              autoComplete="email"
              disabled={isLoading || status?.type === 'success'}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-950/50 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-600 disabled:opacity-50 text-sm"
              placeholder="you@example.com"
            />
          </div>
          {errors.email && <p className="text-xs text-red-400 ml-1 font-medium">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="register-password" className="text-sm font-medium text-gray-300 ml-1">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="register-password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isLoading || status?.type === 'success'}
              className="w-full pl-11 pr-12 py-2.5 bg-gray-950/50 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-600 disabled:opacity-50 text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {passwordValue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 mt-2"
            >
              {/* Strength Bar */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div 
                      key={level} 
                      className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                        level <= strength 
                          ? strength < 3 ? 'bg-red-500' : strength < 5 ? 'bg-yellow-500' : 'bg-green-500'
                          : 'bg-gray-800'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strengthColor}`}>
                  {strengthLabel}
                </span>
              </div>

              {/* Requirements Checklist */}
              <div className="grid grid-cols-1 gap-0.5">
                {passwordRequirements.map((req) => {
                  const met = req.test(passwordValue);
                  return (
                    <div key={req.label} className="flex items-center gap-1.5">
                      {met ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-gray-600" />
                      )}
                      <span className={`text-xs ${met ? 'text-green-500' : 'text-gray-600'} transition-colors`}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {errors.password && <p className="text-xs text-red-400 ml-1 font-medium">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="register-confirm-password" className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="register-confirm-password"
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isLoading || status?.type === 'success'}
              className="w-full pl-11 pr-12 py-2.5 bg-gray-950/50 border border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-600 disabled:opacity-50 text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-400 ml-1 font-medium">{errors.confirmPassword.message}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || status?.type === 'success'}
          id="register-submit-btn"
          className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed group flex justify-center items-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</>
          ) : (
            <>Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-white hover:text-blue-400 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
