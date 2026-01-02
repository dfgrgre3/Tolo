'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Chrome, Loader2 } from 'lucide-react';
import { safeWindow } from '@/lib/safe-client-utils';
import { getRedirectPath, clearStoredRedirect } from '@/app/(auth)/_utils/login-form.utils';
import { useState } from 'react';

interface AlternativeLoginMethodsProps {
  isLoading: boolean;
  isGoogleOAuthEnabled: boolean;
  isFacebookOAuthEnabled?: boolean;
  isAppleOAuthEnabled?: boolean;
  onPasskeyLogin?: () => void;
  mode?: 'login' | 'register';
}

// Facebook Icon SVG Component
const FacebookIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Apple Icon SVG Component
const AppleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export const AlternativeLoginMethods: React.FC<AlternativeLoginMethodsProps> = ({
  isLoading,
  isGoogleOAuthEnabled,
  isFacebookOAuthEnabled = false,
  isAppleOAuthEnabled = false,
  onPasskeyLogin,
  mode = 'login',
}) => {

  return (
    <>
      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 flex items-center">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="w-full border-t border-slate-600"
          />
        </div>
        <div className="relative flex justify-center text-sm">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.65, type: 'spring', stiffness: 200 }}
            className="bg-slate-900 px-4 text-slate-400"
          >
            أو
          </motion.span>
        </div>
      </motion.div>

      {/* Alternative Login Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid gap-3"
      >
        {/* Passkey Login - Only for Login mode */}
        <AnimatePresence>
          {mode === 'login' && onPasskeyLogin && safeWindow((w) => !!w.PublicKeyCredential, false) && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.65 }}
              whileHover={{
                scale: 1.02,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onPasskeyLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
              aria-label="تسجيل الدخول باستخدام مفتاح مرور"
            >
              <Fingerprint className="h-5 w-5" aria-hidden="true" />
              تسجيل الدخول بمفتاح مرور
            </motion.button>
          )}
        </AnimatePresence>

        {/* Google Login */}
        {isGoogleOAuthEnabled && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              const redirectPath = getRedirectPath();
              clearStoredRedirect();
              safeWindow((w) => {
                const typeParam = mode === 'register' ? '&type=register' : '';
                w.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectPath)}${typeParam}`;
              }, undefined);
            }}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label={mode === 'register' ? "إنشاء حساب باستخدام جوجل" : "تسجيل الدخول باستخدام حساب جوجل"}
          >
            <Chrome className="h-5 w-5" aria-hidden="true" />
            {mode === 'register' ? 'إنشاء حساب بجوجل' : 'تسجيل الدخول بجوجل'}
          </motion.button>
        )}
        {/* Facebook Login */}
        {isFacebookOAuthEnabled && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(24, 119, 242, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              const redirectPath = getRedirectPath();
              clearStoredRedirect();
              safeWindow((w) => {
                const typeParam = mode === 'register' ? '&type=register' : '';
                w.location.href = `/api/auth/facebook?redirect=${encodeURIComponent(redirectPath)}${typeParam}`;
              }, undefined);
            }}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 rounded-xl bg-[#1877F2]/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-[#1877F2]/30 disabled:opacity-50"
            aria-label={mode === 'register' ? "إنشاء حساب باستخدام فيسبوك" : "تسجيل الدخول باستخدام حساب فيسبوك"}
          >
            <FacebookIcon />
            {mode === 'register' ? 'إنشاء حساب بفيسبوك' : 'تسجيل الدخول بفيسبوك'}
          </motion.button>
        )}

        {/* Apple Sign-In */}
        {isAppleOAuthEnabled && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              const redirectPath = getRedirectPath();
              clearStoredRedirect();
              safeWindow((w) => {
                const typeParam = mode === 'register' ? '&type=register' : '';
                w.location.href = `/api/auth/apple?redirect=${encodeURIComponent(redirectPath)}${typeParam}`;
              }, undefined);
            }}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label={mode === 'register' ? "إنشاء حساب باستخدام آبل" : "تسجيل الدخول باستخدام حساب آبل"}
          >
            <AppleIcon />
            {mode === 'register' ? 'إنشاء حساب بآبل' : 'تسجيل الدخول بآبل'}
          </motion.button>
        )}

      </motion.div>
    </>
  );
};
