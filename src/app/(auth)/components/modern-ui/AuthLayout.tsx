'use client';

/**
 * 🎨 AuthLayout - تخطيط صفحات المصادقة
 * 
 * التخطيط الرئيسي لجميع صفحات المصادقة مع:
 * - خلفية متحركة
 * - تصميم متجاوب
 * - دعم RTL
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '../shared';

interface AuthLayoutProps {
  children: ReactNode;
  showBackground?: boolean;
  backgroundVariant?: 'default' | 'minimal' | 'particles' | 'mesh';
}

export function AuthLayout({
  children,
  showBackground = true,
  backgroundVariant = 'default',
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" dir="rtl">
      {/* Animated Background */}
      {showBackground && <AnimatedBackground variant={backgroundVariant} />}
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 w-full"
      >
        {children}
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-4 left-0 right-0 text-center"
      >
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} نظام التعليم. جميع الحقوق محفوظة.
        </p>
      </motion.footer>
    </div>
  );
}

export default AuthLayout;
